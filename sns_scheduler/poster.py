"""
SNS投稿自動化スクリプト
Google Sheetsに登録された投稿を指定日時にX/Threadsへ自動投稿する
"""

import os
import json
import time
import requests
import tweepy
from datetime import datetime, timezone, timedelta
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

# ── 設定 ──────────────────────────────────────────────
JST = timezone(timedelta(hours=9))
SHEET_ID = os.environ["SPREADSHEET_ID"]
SHEET_NAME = os.environ.get("SHEET_NAME", "Sheet1")
# スプレッドシート列インデックス（0始まり）
COL_DATETIME = 0   # A: 投稿日時
COL_TEXT     = 1   # B: 投稿文
COL_PLATFORM = 2   # C: 媒体（X / Threads / 両方）
COL_STATUS   = 3   # D: ステータス

STATUS_PENDING = "未投稿"
STATUS_DONE    = "投稿済"
STATUS_ERROR   = "エラー"

DATETIME_FORMATS = ["%Y/%m/%d %H:%M", "%Y-%m-%d %H:%M"]


# ── Google Sheets クライアント ─────────────────────────
def get_sheets_service():
    creds_json = os.environ["GOOGLE_SERVICE_ACCOUNT_JSON"]
    creds_info = json.loads(creds_json)
    creds = Credentials.from_service_account_info(
        creds_info,
        scopes=["https://www.googleapis.com/auth/spreadsheets"],
    )
    return build("sheets", "v4", credentials=creds).spreadsheets()


def fetch_rows(service):
    """シート全行を取得（ヘッダー除く）"""
    result = service.values().get(
        spreadsheetId=SHEET_ID,
        range=f"{SHEET_NAME}!A2:D",
    ).execute()
    return result.get("values", [])


def update_status(service, row_index: int, status: str):
    """D列のステータスを更新。row_index は0始まり（ヘッダー除く）"""
    row_num = row_index + 2  # ヘッダー行(1) + 0始まりオフセット
    service.values().update(
        spreadsheetId=SHEET_ID,
        range=f"{SHEET_NAME}!D{row_num}",
        valueInputOption="RAW",
        body={"values": [[status]]},
    ).execute()


# ── X (Twitter) 投稿 ──────────────────────────────────
def post_to_x(text: str) -> bool:
    client = tweepy.Client(
        consumer_key=os.environ["X_API_KEY"],
        consumer_secret=os.environ["X_API_KEY_SECRET"],
        access_token=os.environ["X_ACCESS_TOKEN"],
        access_token_secret=os.environ["X_ACCESS_TOKEN_SECRET"],
    )
    response = client.create_tweet(text=text)
    return response.data is not None


# ── Threads 投稿 ──────────────────────────────────────
def post_to_threads(text: str) -> bool:
    user_id = os.environ["THREADS_USER_ID"]
    token   = os.environ["THREADS_ACCESS_TOKEN"]
    base    = f"https://graph.threads.net/v1.0/{user_id}"

    # ステップ1: メディアコンテナ作成
    r = requests.post(
        f"{base}/threads",
        params={
            "media_type": "TEXT",
            "text": text,
            "access_token": token,
        },
        timeout=30,
    )
    r.raise_for_status()
    container_id = r.json()["id"]

    # Threads APIは作成後少し待ってから公開が必要
    time.sleep(5)

    # ステップ2: 公開
    r = requests.post(
        f"{base}/threads_publish",
        params={"creation_id": container_id, "access_token": token},
        timeout=30,
    )
    r.raise_for_status()
    return "id" in r.json()


# ── メイン処理 ────────────────────────────────────────
def parse_datetime(value: str) -> datetime | None:
    for fmt in DATETIME_FORMATS:
        try:
            dt = datetime.strptime(value.strip(), fmt)
            return dt.replace(tzinfo=JST)
        except ValueError:
            continue
    return None


def should_post(scheduled: datetime, now: datetime) -> bool:
    """スケジュール時刻が現在時刻以前かつ1時間以内"""
    return scheduled <= now and (now - scheduled).total_seconds() < 3600


def run():
    now = datetime.now(JST)
    print(f"[{now.strftime('%Y-%m-%d %H:%M')} JST] 実行開始")

    service = get_sheets_service()
    rows = fetch_rows(service)

    posted = 0
    errors = 0

    for i, row in enumerate(rows):
        # 列が足りない行はスキップ
        if len(row) < 4:
            continue

        status = row[COL_STATUS].strip()
        if status != STATUS_PENDING:
            continue

        dt_str   = row[COL_DATETIME]
        text     = row[COL_TEXT].strip()
        platform = row[COL_PLATFORM].strip()

        scheduled = parse_datetime(dt_str)
        if scheduled is None:
            print(f"  行{i+2}: 日時フォーマット不正 → スキップ ({dt_str!r})")
            continue

        if not should_post(scheduled, now):
            continue

        print(f"  行{i+2}: 投稿開始 [{platform}] {text[:30]}...")

        success_x       = True
        success_threads = True

        try:
            if platform in ("X", "両方"):
                success_x = post_to_x(text)
                print(f"    X → {'OK' if success_x else 'NG'}")

            if platform in ("Threads", "両方"):
                success_threads = post_to_threads(text)
                print(f"    Threads → {'OK' if success_threads else 'NG'}")

            if success_x and success_threads:
                update_status(service, i, STATUS_DONE)
                posted += 1
            else:
                update_status(service, i, STATUS_ERROR)
                errors += 1

        except Exception as e:
            print(f"    エラー: {e}")
            update_status(service, i, STATUS_ERROR)
            errors += 1

    print(f"完了: 投稿済={posted}, エラー={errors}")


if __name__ == "__main__":
    run()
