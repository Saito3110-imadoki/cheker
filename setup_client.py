"""
クライアントセットアップスクリプト
使い方: python setup_client.py --config client_config.json

必要な環境変数:
  GITHUB_PERSONAL_ACCESS_TOKEN: GitHubのPersonal Access Token（repo権限）
"""

import os
import sys
import json
import time
import base64
import argparse
import requests
from nacl import encoding, public


GITHUB_TOKEN    = os.environ.get("GITHUB_PERSONAL_ACCESS_TOKEN", "")
TEMPLATE_OWNER  = "Saito3110-imadoki"
TEMPLATE_REPO   = "sns-scheduler"
REPO_OWNER      = "Saito3110-imadoki"

HEADERS = {
    "Authorization": f"Bearer {GITHUB_TOKEN}",
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
}

REQUIRED_SECRETS = [
    "NOTION_TOKEN",
    "NOTION_DATABASE_ID",
    "X_API_KEY",
    "X_API_KEY_SECRET",
    "X_ACCESS_TOKEN",
    "X_ACCESS_TOKEN_SECRET",
    "ANTHROPIC_API_KEY",
    "LINE_CHANNEL_ACCESS_TOKEN",
    "LINE_USER_ID",
    "THREADS_USER_ID",
    "THREADS_ACCESS_TOKEN",
]


def create_repo_from_template(repo_name: str, description: str) -> bool:
    """テンプレートリポジトリからクライアント用リポジトリを作成"""
    print(f"  リポジトリ作成中: {REPO_OWNER}/{repo_name}")
    r = requests.post(
        f"https://api.github.com/repos/{TEMPLATE_OWNER}/{TEMPLATE_REPO}/generate",
        headers=HEADERS,
        json={
            "owner": REPO_OWNER,
            "name": repo_name,
            "description": description,
            "private": True,
            "include_all_branches": False,
        },
    )
    if r.status_code == 201:
        print(f"  ✅ リポジトリ作成完了: https://github.com/{REPO_OWNER}/{repo_name}")
        return True
    elif r.status_code == 422:
        print(f"  ⚠️  リポジトリはすでに存在します: {repo_name}")
        return True
    else:
        print(f"  ❌ リポジトリ作成失敗: {r.status_code} {r.text}")
        return False


def get_repo_public_key(repo_name: str) -> tuple[str, str]:
    """リポジトリの公開鍵を取得（Secret暗号化用）"""
    r = requests.get(
        f"https://api.github.com/repos/{REPO_OWNER}/{repo_name}/actions/secrets/public-key",
        headers=HEADERS,
    )
    r.raise_for_status()
    data = r.json()
    return data["key_id"], data["key"]


def encrypt_secret(public_key_str: str, secret_value: str) -> str:
    """Secret値をGitHub用に暗号化"""
    public_key_bytes = base64.b64decode(public_key_str)
    pk = public.PublicKey(public_key_bytes, encoding.RawEncoder)
    box = public.SealedBox(pk)
    encrypted = box.encrypt(secret_value.encode("utf-8"))
    return base64.b64encode(encrypted).decode("utf-8")


def set_secret(repo_name: str, secret_name: str, secret_value: str, key_id: str, public_key: str) -> bool:
    """GitHub Secretを設定"""
    encrypted = encrypt_secret(public_key, secret_value)
    r = requests.put(
        f"https://api.github.com/repos/{REPO_OWNER}/{repo_name}/actions/secrets/{secret_name}",
        headers=HEADERS,
        json={"encrypted_value": encrypted, "key_id": key_id},
    )
    if r.status_code in (201, 204):
        print(f"    ✅ {secret_name}")
        return True
    else:
        print(f"    ❌ {secret_name}: {r.status_code}")
        return False


def setup_client(config: dict) -> None:
    company_name = config["company_name"]
    company_slug = config["company_slug"]
    secrets      = config["secrets"]

    print(f"\n{'='*50}")
    print(f"クライアントセットアップ開始: {company_name}")
    print(f"{'='*50}")

    # 1. リポジトリ作成
    print("\n[1/3] リポジトリ作成")
    repo_name   = f"sns-{company_slug}"
    description = f"{company_name} - SNS自動投稿システム"
    ok = create_repo_from_template(repo_name, description)
    if not ok:
        sys.exit(1)

    # リポジトリの準備が整うまで待機
    print("  リポジトリの初期化待機中...")
    time.sleep(5)

    # 2. Secrets設定
    print("\n[2/3] GitHub Secrets設定")
    try:
        key_id, public_key = get_repo_public_key(repo_name)
    except Exception as e:
        print(f"  ❌ 公開鍵取得失敗: {e}")
        sys.exit(1)

    success = 0
    for secret_name in REQUIRED_SECRETS:
        value = secrets.get(secret_name, "")
        if value:
            if set_secret(repo_name, secret_name, value, key_id, public_key):
                success += 1
        else:
            print(f"    ⏭️  {secret_name}（未設定）")

    print(f"  Secrets設定完了: {success}件")

    # 3. 完了サマリー
    print("\n[3/3] セットアップ完了")
    print(f"""
{'='*50}
✅ {company_name} セットアップ完了！

【リポジトリ】
https://github.com/{REPO_OWNER}/{repo_name}

【次のステップ（クライアントに案内）】
1. Notionテンプレートを複製:
   https://notion.so/templates/sns-auto-post

2. Notionインテグレーションを接続して
   NOTION_DATABASE_IDをSecretに追加

3. Actions → Daily Post Generator → Run workflow
   で動作確認

【未設定のSecrets】
Notionの設定後、以下をGitHub Secretsに追加:
  - NOTION_DATABASE_ID（クライアントが設定）
{'='*50}
""")


def main():
    parser = argparse.ArgumentParser(description="クライアントセットアップツール")
    parser.add_argument("--config", required=True, help="クライアント設定JSONファイル")
    args = parser.parse_args()

    if not GITHUB_TOKEN:
        print("❌ 環境変数 GITHUB_PERSONAL_ACCESS_TOKEN が設定されていません")
        sys.exit(1)

    with open(args.config, encoding="utf-8") as f:
        config = json.load(f)

    required_fields = ["company_name", "company_slug", "secrets"]
    for field in required_fields:
        if field not in config:
            print(f"❌ 設定ファイルに '{field}' がありません")
            sys.exit(1)

    setup_client(config)


if __name__ == "__main__":
    main()
