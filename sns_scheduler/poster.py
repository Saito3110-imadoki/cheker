"""
SNS投稿自動化スクリプト
Notionデータベースから「未投稿」レコードを取得し、
指定日時にX（Twitter）・Threadsへ自動投稿する
"""

import os
import sys
import time
import requests
import tweepy
from datetime import datetime, timezone, timedelta
from notion_client import Client
from dotenv import load_dotenv

load_dotenv()

# ── タイムゾーン設定 ──────────────────────────────────
JST = timezone(timedelta(hours=9))

# ── Notion 設定 ───────────────────────────────────────
NOTION_TOKEN       = os.environ["NOTION_TOKEN"]
NOTION_DATABASE_ID = os.environ["NOTION_DATABASE_ID"]

# Notionのプロパティ名（データベースの列名と一致させる）
PROP_TEXT     = "投稿文"
PROP_DATETIME = "投稿日時"
PROP_PLATFORM = "媒体"
PROP_STATUS   = "ステータス"

STATUS_PENDING = "未投稿"
STATUS_DONE    = "投稿済"
STATUS_ERROR   = "エラー"

PLATFORM_X       = "X"
PLATFORM_THREADS = "Threads"
PLATFORM_BOTH    = "両方"


# ── Notion ヘルパー ───────────────────────────────────
def get_notion_client() -> Client:
    return Client(auth=NOTION_TOKEN)


def fetch_pending_posts(notion: Client) -> list[dict]:
    """ステータスが「未投稿」かつ投稿日時が現在以前のレコードを取得"""
    now_utc = datetime.now(timezone.utc).isoformat()

    response = notion.databases.query(
        database_id=NOTION_DATABASE_ID,
        filter={
            "and": [
                {
                    "property": PROP_STATUS,
                    "select": {"equals": STATUS_PENDING},
                },
                {
                    "property": PROP_DATETIME,
                    "date": {"on_or_before": now_utc},
                },
            ]
        },
        sorts=[
            {"property": PROP_DATETIME, "direction": "ascending"}
        ],
    )
    return response.get("results", [])


def extract_text(page: dict) -> str:
    """投稿文プロパティからテキストを取得"""
    prop = page["properties"].get(PROP_TEXT, {})

    # Title 型
    if prop.get("type") == "title":
        parts = prop.get("title", [])
        return "".join(p["plain_text"] for p in parts)

    # Rich text 型
    if prop.get("type") == "rich_text":
        parts = prop.get("rich_text", [])
        return "".join(p["plain_text"] for p in parts)

    return ""


def extract_platform(page: dict) -> str:
    """媒体プロパティからプラットフォーム名を取得"""
    prop = page["properties"].get(PROP_PLATFORM, {})
    if prop.get("type") == "select":
        sel = prop.get("select")
        return sel["name"] if sel else ""
    return ""


def extract_datetime(page: dict) -> datetime | None:
    """投稿日時プロパティからdatetimeを取得（JST）"""
    prop = page["properties"].get(PROP_DATETIME, {})
    if prop.get("type") == "date":
        date_obj = prop.get("date")
        if date_obj and date_obj.get("start"):
            dt = datetime.fromisoformat(date_obj["start"])
            # タイムゾーン情報がなければJSTとみなす
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=JST)
            return dt
    return None


def update_status(notion: Client, page_id: str, status: str):
    """Notionのステータスを更新"""
    notion.pages.update(
        page_id=page_id,
        properties={
            PROP_STATUS: {
                "select": {"name": status}
            }
        },
    )


# ── X（Twitter）投稿 ──────────────────────────────────
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

    # Step 1: メディアコンテナ作成
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

    # Threads API は作成後に少し待つ必要がある
    time.sleep(5)

    # Step 2: 公開
    r = requests.post(
        f"{base}/threads_publish",
        params={
            "creation_id": container_id,
            "access_token": token,
        },
        timeout=30,
    )
    r.raise_for_status()
    return "id" in r.json()


# ── メイン処理 ────────────────────────────────────────
def run():
    now = datetime.now(JST)
    print(f"[{now.strftime('%Y-%m-%d %H:%M')} JST] 実行開始")

    notion = get_notion_client()

    try:
        posts = fetch_pending_posts(notion)
    except Exception as e:
        print(f"Notion からの取得に失敗しました: {e}", file=sys.stderr)
        sys.exit(1)

    if not posts:
        print("投稿対象なし。終了します。")
        return

    print(f"投稿対象: {len(posts)} 件")

    posted_count = 0
    error_count  = 0

    for page in posts:
        page_id  = page["id"]
        text     = extract_text(page)
        platform = extract_platform(page)
        sched_dt = extract_datetime(page)

        label = text[:30] + ("..." if len(text) > 30 else "")
        print(f"\n  ページID: {page_id}")
        print(f"  投稿文  : {label}")
        print(f"  媒体    : {platform}")
        print(f"  予定日時: {sched_dt}")

        if not text:
            print("  → 投稿文が空のためスキップ")
            continue
        if platform not in (PLATFORM_X, PLATFORM_THREADS, PLATFORM_BOTH):
            print(f"  → 媒体の値が不正のためスキップ（値: {platform!r}）")
            continue

        ok_x       = True
        ok_threads = True

        try:
            if platform in (PLATFORM_X, PLATFORM_BOTH):
                ok_x = post_to_x(text)
                print(f"  X       : {'✓ 投稿成功' if ok_x else '✗ 投稿失敗'}")

            if platform in (PLATFORM_THREADS, PLATFORM_BOTH):
                ok_threads = post_to_threads(text)
                print(f"  Threads : {'✓ 投稿成功' if ok_threads else '✗ 投稿失敗'}")

            if ok_x and ok_threads:
                update_status(notion, page_id, STATUS_DONE)
                print("  ステータス → 投稿済")
                posted_count += 1
            else:
                update_status(notion, page_id, STATUS_ERROR)
                print("  ステータス → エラー")
                error_count += 1

        except Exception as e:
            print(f"  エラー発生: {e}", file=sys.stderr)
            try:
                update_status(notion, page_id, STATUS_ERROR)
            except Exception:
                pass
            error_count += 1

    print(f"\n完了 — 投稿済: {posted_count} 件 / エラー: {error_count} 件")


if __name__ == "__main__":
    run()
