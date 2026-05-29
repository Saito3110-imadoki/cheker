# SNS投稿自動化システム セットアップガイド

## 必要なAPIキー一覧

| キー名 | 取得元 | 用途 |
|--------|--------|------|
| `NOTION_TOKEN` | Notion Developers | Notionデータベース読み書き |
| `NOTION_DATABASE_ID` | Notion データベース URL | 投稿管理DB |
| `X_API_KEY` | X Developer Portal | X (Twitter) 投稿 |
| `X_API_KEY_SECRET` | X Developer Portal | X (Twitter) 投稿 |
| `X_ACCESS_TOKEN` | X Developer Portal | X (Twitter) 投稿 |
| `X_ACCESS_TOKEN_SECRET` | X Developer Portal | X (Twitter) 投稿 |
| `THREADS_USER_ID` | Meta for Developers | Threads 投稿 |
| `THREADS_ACCESS_TOKEN` | Meta for Developers | Threads 投稿 |

---

## 1. Notion API キーの取得

1. https://www.notion.so/my-integrations にアクセス
2. 「新しいインテグレーション」を作成
3. 「シークレット」をコピー → `NOTION_TOKEN`
4. 投稿管理データベースのURLから `NOTION_DATABASE_ID` を取得
   - URL例: `https://notion.so/xxxxxxxx?v=yyyyyyyy`
   - `?v=` の前の32文字が `NOTION_DATABASE_ID`
5. Notionデータベースのページで `・・・` → 「接続」→ 作成したインテグレーションを選択

**Notionデータベースの列設定:**
- `投稿文`（タイトルまたはテキスト）: 投稿する本文
- `投稿日時`（日付）: 投稿予定日時
- `媒体`（セレクト）: `X` / `Threads` / `両方`
- `ステータス`（セレクト）: `未投稿`（初期値）/ `投稿済`（自動更新）/ `エラー`（自動更新）

---

## 2. X (Twitter) API キーの取得

1. https://developer.twitter.com/en/portal/dashboard にアクセス
2. 「+ Create Project」でプロジェクト作成
3. App Settings → User authentication settings → Edit
   - App permissions: **Read and write**（読む・書く）
   - Type of App: **Web App, Automated App or Bot**
   - Callback URL: `https://localhost`
4. Keys and Tokens タブから以下を取得・コピー:
   - `API Key` → `X_API_KEY`
   - `API Key Secret` → `X_API_KEY_SECRET`
   - `Access Token` → `X_ACCESS_TOKEN`
   - `Access Token Secret` → `X_ACCESS_TOKEN_SECRET`

---

## 3. Meta Threads API キーの取得

1. https://developers.facebook.com/ でアプリ作成（タイプ: ビジネス）
2. 左メニュー「製品を追加」→「Threads API」→「設定」
3. テストユーザーを追加して以下を取得:
   - Threads User ID → `THREADS_USER_ID`
   - Access Token → `THREADS_ACCESS_TOKEN`

**長期トークン取得コマンド（ターミナルで実行）:**
```bash
curl -i -X GET \
  "https://graph.threads.net/access_token?grant_type=th_exchange_token&client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&access_token=YOUR_SHORT_LIVED_TOKEN"
```

---

## 4. GitHub Secrets の設定

1. GitHubリポジトリを開く → 「Settings」タブ
2. 左メニュー「Secrets and variables」→「Actions」
3. 「New repository secret」ボタンを押す
4. 以下を1つずつ登録:

| Name（名前） | Secret（値） |
|-------------|-------------|
| `NOTION_TOKEN` | Notionインテグレーションのシークレット |
| `NOTION_DATABASE_ID` | NotionデータベースのID |
| `X_API_KEY` | X API Key |
| `X_API_KEY_SECRET` | X API Key Secret |
| `X_ACCESS_TOKEN` | X Access Token |
| `X_ACCESS_TOKEN_SECRET` | X Access Token Secret |
| `THREADS_USER_ID` | ThreadsユーザーID（未設定なら空でOK） |
| `THREADS_ACCESS_TOKEN` | Threadsアクセストークン（未設定なら空でOK） |

---

## 5. 動作確認

1. GitHubリポジトリ → 「Actions」タブ
2. 左メニュー「SNS Auto Post」を選択
3. 「Run workflow」→「Run workflow」ボタンで手動実行
4. 実行ログを確認して「投稿済」になっていれば成功！

**自動実行スケジュール:** 毎時0分（UTC）= 日本時間 毎時9分

---

## ローカルでのテスト実行

```bash
# sns_schedulerフォルダに移動
cd sns_scheduler

# 依存ライブラリをインストール
pip install -r requirements.txt

# .envファイルを作成（.env.exampleをコピーして値を入力）
cp .env.example .env
# .envにAPIキーを記入してから実行

# スクリプト実行
python poster.py
```
