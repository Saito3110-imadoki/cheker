# 映像制作会社 コーポレートサイト

映像制作会社「IMADOKI FILMS(仮称)」のコーポレートサイトです。
`index.html` 1ファイル完結の静的サイトで、ブラウザで開くだけで動作します。

## 参考サイト

- **構成参考**: [電通クリエイティブピクチャーズ](https://www.dcrp.co.jp/) — HERO → MISSION → BUSINESS → WORKS → NEWS → ABOUT → RECRUIT → CONTACT
- **デザイン参考**: [博報堂プロダクツ](https://www.h-products.co.jp/) — グレー×黒のモノクローム、大きな英字タイポ、カード型のソリューション紹介

## 実装済みの機能

| 機能 | 内容 |
|---|---|
| WORKS | カテゴリ絞り込みフィルタ+クリックで詳細モーダル(動画埋め込みエリア・概要・クレジット) |
| NEWS | クリックで記事詳細モーダル |
| CONTACT | バリデーション付きお問い合わせフォーム(必須チェック・メール形式チェック・スパム対策ハニーポット・送信完了画面) |
| RECRUIT | ボタンからフォームへ遷移し、種別を「採用について」に自動セット |
| ナビゲーション | スクロール現在地ハイライト/モバイルハンバーガーメニュー/トップへ戻るボタン |
| その他 | プライバシーポリシーモーダル、OGPメタ、ファビコン、オープニングアニメーション、`prefers-reduced-motion` 対応 |

## 公開前にやること(チェックリスト)

### 1. お問い合わせフォームの送信先設定

`index.html` 末尾の `<script>` 冒頭にある設定を変更します。

```js
const FORM_ENDPOINT = '';                    // ← Formspree等のURLを設定
const CONTACT_EMAIL = 'info@imadoki.co.jp';  // ← mailto方式の宛先
```

- **推奨**: [Formspree](https://formspree.io/)(無料枠あり)でフォームを作成し、`https://formspree.io/f/xxxxxxxx` 形式のURLを `FORM_ENDPOINT` に設定 → フォームから直接送信されます
- **未設定のままの場合**: 送信ボタンでメールソフトが起動する方式(mailto)で動作します

### 2. ショーリール動画 ✅設定済み

FVの背景動画は `assets/showreel.webm`(軽量版)+ `assets/showreel.mp4`(互換用)を再生しています。
差し替える場合は同名で上書きするか、`.hero-bg` 内の `<source>` のパスを変更してください。
オーバーレイの暗さは `.hero-bg::after` のグラデーションで調整できます。

### 3. WORKSの実データ

- サムネイル: `.ph-1`〜`.ph-9` のダミー背景を `<img>` に差し替え
- 詳細: `<script>` 内の `WORKS_DATA` を編集(タイトル・クライアント・概要・クレジット)
- 動画: 各作品の `embed` にYouTube埋め込みURL(`https://www.youtube.com/embed/XXXX`)を設定すると、モーダル内で再生されます

### 4. BUSINESSのイラスト

`.biz-visual` 内の `<svg>` をイラスト画像に差し替え。背景色は `.bv-1`〜`.bv-6` で変更できます。

### 5. その他の差し替え

- 「(仮)」「〇〇株式会社」表記の実データ化
- ABOUTのオフィス写真(`.about-photo`)
- OGP画像(`<head>` 内のコメント参照)
- ブランド名「IMADOKI FILMS」を正式名称に

## カスタマイズ(トンマナ変更)

色・フォント・余白は `index.html` 冒頭の `:root { ... }` に集約されています。

```css
:root {
  --color-bg:      #f4f4f5;  /* ベース背景 */
  --color-ink:     #17181a;  /* メイン文字色 */
  --color-accent:  #e5382b;  /* 差し色(RECの赤) */
  ...
}
```

## 公開方法(いずれか)

- **GitHub Pages**: リポジトリの Settings → Pages でブランチと `/video-production-site` フォルダを指定
- **Netlify / Vercel**: フォルダをドラッグ&ドロップ、またはリポジトリ連携
- **レンタルサーバー**: `index.html` をそのままアップロード

独自ドメイン(例: films.imadoki.co.jp)を使う場合は、各サービスのカスタムドメイン設定でDNSを向けてください。

## 動作確認済み

Chromium(Playwright)にて以下を確認済み:
JSエラーなし / WORKSフィルタ / 各モーダルの開閉 / フォームバリデーション / 送信完了表示 / RECRUITボタンの種別自動セット / モバイルメニュー
