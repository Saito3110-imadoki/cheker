# SNS自動投稿スケジューラー セットアップガイド

このガイドに従うだけで、AIが毎朝投稿案を自動生成してNotionに届けるシステムが動きます。  
プログラミングの知識は不要です。

---

## 全体の流れ

```
① GitHubにコピー → ② APIキーを登録 → ③ Notionを準備 → ④ config.yamlを編集 → ⑤ 完了！
```

---

## Step 1｜GitHubにリポジトリをコピーする

1. このページの右上にある **「Use this template」** ボタンをクリック
2. リポジトリ名を入力（例：`my-sns-scheduler`）
3. **Private** を選択 → **「Create repository」** をクリック

---

## Step 2｜APIキーを取得する

以下の5つのサービスからAPIキーを取得します。

### 2-1. Anthropic（Claude AI）
1. https://console.anthropic.com にアクセスしてアカウント作成
2. 左メニュー「API Keys」→「Create Key」をクリック
3. 表示されたキー（`sk-ant-...`）をメモ帳にコピー

### 2-2. Notion
1. https://www.notion.so/my-integrations にアクセス
2. 「新しいインテグレーション」をクリック
3. 名前を入力（例：`SNSスケジューラー`）→「送信」
4. 表示された「内部インテグレーショントークン」（`ntn_...`）をコピー

### 2-3. X（旧Twitter） Developer
1. https://developer.twitter.com にアクセスしてアカウント作成
2. 「Create Project」→アプリを作成
3. 「Keys and Tokens」から以下の4つをコピー：
   - API Key
   - API Key Secret
   - Access Token
   - Access Token Secret

### 2-4. LINE Messaging API
1. https://developers.line.biz にアクセスしてログイン
2. 「新規プロバイダー作成」→「Messaging API」チャンネルを作成
3. 「チャンネルアクセストークン」をコピー
4. LINEアプリで自分のボットを友だち追加し、ユーザーIDをコピー（`U...`）

---

## Step 3｜GitHubにAPIキーを登録する

1. 自分のGitHubリポジトリを開く
2. 上のタブ「Settings」をクリック
3. 左メニュー「Secrets and variables」→「Actions」をクリック
4. 「New repository secret」から以下を1つずつ登録：

| Name（名前） | Value（貼り付ける値） |
|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-...` |
| `NOTION_TOKEN` | `ntn_...` |
| `NOTION_DATABASE_ID` | NotionデータベースのID（Step 4で取得） |
| `X_API_KEY` | X の API Key |
| `X_API_KEY_SECRET` | X の API Key Secret |
| `X_ACCESS_TOKEN` | X の Access Token |
| `X_ACCESS_TOKEN_SECRET` | X の Access Token Secret |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE のチャンネルアクセストークン |
| `LINE_USER_ID` | LINE のユーザーID |

---

## Step 4｜Notionを準備する

### 4-1. データベースを作成する
1. Notionで新しいページを作成
2. 「/database」と入力 →「テーブルビュー」を選択
3. 以下のプロパティを追加：

| プロパティ名 | 種類 |
|---|---|
| 投稿文 | タイトル（デフォルト） |
| 投稿日時 | 日時 |
| 媒体 | マルチセレクト |
| ステータス | マルチセレクト |
| 画像URL | URL |

4. 「ステータス」に以下の選択肢を追加：
   - 承認待ち
   - 未投稿
   - 投稿済み
   - 却下

5. 「媒体」に以下の選択肢を追加：
   - 両方
   - X
   - Threads

### 4-2. インテグレーションに権限を付与する
1. 作成したデータベースページの右上「・・・」をクリック
2. 「コネクト」→ Step 2-2 で作ったインテグレーション名を選択
3. 「接続を確認」をクリック

### 4-3. データベースIDを取得する
1. データベースページをブラウザで開く
2. URLの `notion.so/` のあとの32文字（英数字）がデータベースID
   - 例：`https://notion.so/abc123def456...` → `abc123def456...`
3. このIDを Step 3 の `NOTION_DATABASE_ID` に登録

---

## Step 5｜config.yaml を自社用に編集する

リポジトリの `sns_scheduler/config.yaml` を開いて編集します。

```yaml
# 会社情報
company:
  name: 株式会社〇〇〇〇    ← 自社名に変更
  industry: IT・マーケティング  ← 業種に変更

# ターゲット・文体
content:
  target_audience: 30〜50代の経営者  ← ターゲット読者を変更
  tone: 丁寧・落ち着いた口調          ← 投稿の文体を変更
  posts_per_day: 5                    ← 1日の投稿数（1〜10）

# 扱うテーマ（投稿内容の方向性）
topics:
  primary:
    - AI活用          ← 自社に関連するテーマに変更
    - 業務効率化

  # X（Twitter）でのトレンド検索キーワード
  keywords_x:
    - ChatGPT         ← 関連キーワードに変更
    - 業務改善

# 参照するRSSフィード（業界ニュースサイトのRSSを追加）
rss_feeds:
  - https://rss.itmedia.co.jp/rss/2.0/aiplus.xml

# 投稿候補の時間帯（JST）
schedule:
  times:
    - "09:00"
    - "12:00"
    - "18:00"
```

編集後、右上の「Commit changes」をクリックして保存します。

---

## Step 6｜動作確認

1. GitHubリポジトリの「Actions」タブをクリック
2. 左メニュー「Daily Post Generator」を選択
3. 右側「Run workflow」→「Run workflow」をクリック
4. ✅ 緑のチェックが付けば成功！
5. Notionを開くと、AIが生成した投稿案が「承認待ち」で届いています

---

## 毎日の使い方

システムが毎朝7時（JST）に自動実行され、LINEに通知が届きます。

1. **LINEで通知を受け取る**
2. **Notionを開いて投稿案を確認する**
3. **投稿したい案のステータスを「未投稿」に変更する**
4. **投稿しない案は「却下」に変更する**

---

## よくある質問

**Q. 毎日実行される時間を変えたい**  
A. `.github/workflows/daily_generate.yml` の `cron: "0 22 * * *"` を変更します。  
   ※ cron は UTC 時間です。JST の 7 時 = UTC の 22 時

**Q. 特定のニュースサイトだけを参照したい**  
A. `config.yaml` の `rss_feeds` を編集します。RSSのURLはサイトのフッターや「RSS」リンクから確認できます。

**Q. Notionのプロパティ名を変更してしまった**  
A. `config.yaml` の `notion.properties` の値を変更した名前に合わせてください。

**Q. 画像付きの投稿を増やしたい**  
A. 現在はAIが数字を含む投稿に自動で図解を付けています。数字（%、倍、円、件など）を含む内容が多くなるようにトピックを設定すると画像が増えます。
