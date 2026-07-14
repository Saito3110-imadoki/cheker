# 映像制作会社 コーポレートサイト ラフ案

映像制作会社向けHPのラフ案(第1稿)です。1ファイル完結の `index.html` で、ブラウザで開くだけで確認できます。

## 参考サイト

- **構成参考**: [電通クリエイティブピクチャーズ](https://www.dcrp.co.jp/) — HERO → MISSION → BUSINESS → WORKS → NEWS → ABOUT → RECRUIT → CONTACT の流れを踏襲
- **デザイン参考**: [博報堂プロダクツ](https://www.h-products.co.jp/) — グレー×黒のモノクローム、大きな英字タイポ+日本語小見出し、余白広めのグリッド

## カスタマイズ方法

### 1. 色・フォント・余白(いちばん簡単)

`index.html` 冒頭の `:root { ... }` にすべて集約しています。ここを書き換えるだけで全体に反映されます。

```css
:root {
  --color-bg:      #f4f4f5;  /* ベース背景 */
  --color-ink:     #17181a;  /* メイン文字色 */
  --color-accent:  #e5382b;  /* 差し色(RECの赤)→コーポレートカラーに変更可 */
  ...
}
```

### 2. 会社名・ロゴ

`IMADOKI FILMS` は仮のブランド名です。ヘッダーとフッターの `.logo` を書き換えるか、ロゴ画像 `<img>` に差し替えてください。

### 3. ヒーロー動画(ショーリール)

現在はグラデーション+光のスイープ演出のプレースホルダーです。`.hero-bg` 内のコメント部分に `<video>` を配置すれば差し替え完了です。

```html
<video autoplay muted loop playsinline poster="poster.jpg">
  <source src="showreel.mp4" type="video/mp4">
</video>
```

### 4. WORKSのサムネイル

グレーのダミー背景(`.ph-1`〜`.ph-6`)を `<img src="..." alt="...">` に差し替えてください。カテゴリは `data-cat` 属性(cm / web / sns / recruit / event)でフィルタに連動します。

### 5. テキスト・実績・ニュース

「(仮)」「〇〇株式会社」の箇所はすべてダミーです。会社概要(ABOUT)は会社概要資料をもとに仮入力済みです。

## 実装済みの動き

- スクロールに応じたフェードイン(`prefers-reduced-motion` 対応)
- WORKSのカテゴリ絞り込みフィルタ
- スマホ用ハンバーガーメニュー
- ヘッダーは `mix-blend-mode: difference` で背景の明暗に応じて自動反転
- サービス名のマーキー(流れる帯)

## 今後の拡張候補

- WORKS詳細ページ(モーダル or 下層ページ)
- NEWS一覧・詳細(CMS化するなら microCMS / WordPress など)
- お問い合わせフォーム
- RECRUIT下層ページ
