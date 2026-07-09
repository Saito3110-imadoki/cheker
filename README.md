# SNS自動投稿スケジューラー

AIが毎朝トレンドを収集し、投稿案と図解画像を自動生成。Notionで承認するだけで運用できる、企業向けSNS自動化システムです。

---

## できること

| 機能 | 内容 |
|---|---|
| 📰 **情報収集** | 指定したRSSフィードとX（Twitter）からトレンドを自動収集 |
| 🤖 **AI投稿生成** | Claude AIが業界・ターゲットに合った投稿文を毎日5件生成 |
| 🖼 **図解画像生成** | 数字・データを含む投稿には高解像度インフォグラフィックを自動作成 |
| 📋 **Notion管理** | 生成された投稿案をNotionに「承認待ち」で保存 |
| 📱 **LINE通知** | 毎朝7時に投稿案が届いたことをLINEで通知 |
| ⏰ **自動スケジュール** | GitHub Actionsが毎朝自動実行（サーバー不要） |

---

## システムの流れ

```
毎朝 7:00（JST）に自動起動
        ↓
 RSSフィード・Xからニュース収集
        ↓
  Claude AIで投稿文を5件生成
        ↓
  数字入り投稿 → 図解画像を自動生成
        ↓
  Notionに「承認待ち」で保存
        ↓
  LINEであなたに通知
        ↓
 Notionで確認 → 承認したものだけ投稿
```

---

## 生成される画像の種類

### stat（数字強調カード）
大きな数字を3枚のカードでインパクトを出すレイアウト

### bar（棒グラフ）
複数の項目を横並びで比較するグラフ

### comparison（ビフォー・アフター）
旧来の手法と新手法を左右で対比するレイアウト

---

## セットアップ

所要時間：約30〜60分（プログラミング知識不要）

**[→ セットアップガイドを読む](docs/setup.md)**

**[→ Notion設定ガイドを読む](docs/notion_guide.md)**

### 必要なもの

- GitHubアカウント（無料）
- Notionアカウント（無料）
- Anthropic APIキー（Claude AI）
- X Developer アカウント
- LINEアカウント

---

## カスタマイズ

`sns_scheduler/config.yaml` を編集するだけで自社用にカスタマイズできます。

```yaml
company:
  name: 株式会社〇〇〇〇    # 会社名
  industry: IT・マーケティング

content:
  target_audience: 30〜50代の経営者  # ターゲット読者
  tone: 丁寧・落ち着いた口調          # 投稿の文体
  posts_per_day: 5                    # 1日の投稿数

topics:
  primary:
    - AI活用       # 扱うテーマ
    - 業務効率化

rss_feeds:
  - https://example.com/rss.xml  # 参照するニュースサイト

schedule:
  times:
    - "09:00"
    - "18:00"
```

---

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| AI生成 | Claude Haiku（Anthropic） |
| 画像生成 | Playwright（HTML→PNG）/ Matplotlib（フォールバック） |
| ニュース収集 | feedparser（RSS）、Tweepy（X API） |
| コンテンツ管理 | Notion API |
| 通知 | LINE Messaging API |
| 実行環境 | GitHub Actions（毎朝自動実行） |
| 画像ホスティング | GitHub Pages |

---

## ファイル構成

```
sns_scheduler/
├── config.yaml          # カスタマイズ設定（ここを編集するだけ）
├── daily_generator.py   # メインスクリプト
├── infographic.py       # 高解像度画像生成
├── requirements.txt     # 依存ライブラリ
.github/
└── workflows/
    └── daily_generate.yml  # GitHub Actions 設定
docs/
├── setup.md             # セットアップガイド
└── notion_guide.md      # Notion設定ガイド
post-images/             # 生成された画像（自動コミット）
```

---

## よくある質問

**Q. サーバーは必要ですか？**  
A. 不要です。GitHub Actions が無料のクラウド環境で自動実行します。

**Q. 毎日かかるコストは？**  
A. Claude APIの費用のみです。1日5件の投稿生成で約1〜3円程度（Haiku使用時）。

**Q. 投稿は自動で送信されますか？**  
A. いいえ。生成された投稿案はNotionに届くだけで、あなたが承認した分のみ投稿されます。

**Q. 対応しているSNSは？**  
A. 現在はX（Twitter）とThreadsに対応しています。

---

## ライセンス

MIT License
