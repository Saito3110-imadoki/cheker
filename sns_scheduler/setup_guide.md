# SNS投稿自動化システム セットアップガイド

## 必要なAPIキー一覧

| キー名 | 取得元 | 用途 |
|--------|--------|------|
| `SPREADSHEET_ID` | Google Sheets URL | スプレッドシートID |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Google Cloud Console | Sheets読み書き |
| `X_API_KEY` | X Developer Portal | X (Twitter) 投稿 |
| `X_API_KEY_SECRET` | X Developer Portal | X (Twitter) 投稿 |
| `X_ACCESS_TOKEN` | X Developer Portal | X (Twitter) 投稿 |
| `X_ACCESS_TOKEN_SECRET` | X Developer Portal | X (Twitter) 投稿 |
| `THREADS_USER_ID` | Meta for Developers | Threads 投稿 |
| `THREADS_ACCESS_TOKEN` | Meta for Developers | Threads 投稿 |
| `SHEET_NAME` | （任意）シート名 | デフォルト: Sheet1 |

---

## 1. X (Twitter) API キーの取得

1. https://developer.twitter.com/en/portal/dashboard にアクセス
2. 「+ Create Project」でプロジェクト作成
3. App Settings → User authentication settings → Edit
   - App permissions: **Read and write**
   - Type of App: **Web App, Automated App or Bot**
   - Callback URL: `https://localhost`
4. Keys and Tokens タブから以下を取得・コピー:
   - `API Key` → `X_API_KEY`
   - `API Key Secret` → `X_API_KEY_SECRET`
   - `Access Token` → `X_ACCESS_TOKEN`
   - `Access Token Secret` → `X_ACCESS_TOKEN_SECRET`

---

## 2. Meta Threads API キーの取得

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

## 3. Google Sheets API セットアップ

1. https://console.cloud.google.com/ でプロジェクト作成
2. 「APIとサービス」→「ライブラリ」で以下を有効化:
   - **Google Sheets API**
   - **Google Drive API**
3. 「認証情報」→「サービスアカウント」を作成（ロール: 編集者）
4. サービスアカウント → 「キー」タブ → JSON形式でダウンロード
5. **スプレッドシートをサービスアカウントのメールと共有**（編集者権限）

---

## 4. スプレッドシートの準備

1行目にヘッダーを入力:
```
A1: 投稿日時   B1: 投稿文   C1: 媒体   D1: ステータス
```

2行目以降にデータを入力:
```
A2: 2024/01/15 10:00   B2: 投稿テスト本文   C2: 両方   D2: 未投稿
```

- **媒体の値**: `X` / `Threads` / `両方`
- **ステータスの値**: `未投稿`（初期値）/ `投稿済`（自動更新）/ `エラー`（自動更新）
- **SPREADSHEET_ID**: スプレッドシートURLの `/d/` と `/edit` の間の文字列

---

## 5. GitHub Secrets の設定

GitHub リポジトリ → Settings → Secrets and variables → Actions → New repository secret

上記の全キーを登録してください。

---

## 6. 動作確認

GitHub リポジトリ → Actions →「SNS Auto Post」→「Run workflow」で手動実行できます。
