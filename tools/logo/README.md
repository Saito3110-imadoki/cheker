# ロゴジェネレータ

マカセルのロゴを SVG で定義し、playwright（Chromium）で PNG に書き出します。

## 採用案：A案「承認チェック」

「あなたの仕事は1日2分の承認だけ」というサービスの価値を、チェックマーク1本で表現したもの。
小サイズでも形が潰れず、ファビコンやSNSのプロフィール画像でも視認できる。
ブランドカラーは LP（`docs/index.html`）と共通の グリーン `#00a37a`、書体は Noto Sans JP 900。

検討時の3案の比較は `logo_concepts.png` を参照（A案：承認チェック／B案：吹き出し＋チェック／C案：オートパイロット）。

## 生成

```bash
pip install playwright && playwright install chromium
# 既存の Chromium を使う場合は CHROME_PATH=/path/to/chrome を指定

python3 tools/logo/make_logos.py --sheet      # 3案の比較シート（tools/logo/logo_concepts.png）
python3 tools/logo/make_logos.py --final a    # ロゴ一式（docs/assets/logo/）
python3 tools/logo/make_logos.py --ogp a      # OGP画像（docs/assets/ogp.png）
```

## 書き出されるファイル

| ファイル | 用途 |
| --- | --- |
| `docs/assets/logo/logo_mark.svg` | ロゴマーク（グリーンタイル＋白チェック）。印刷・拡大用の原本 |
| `docs/assets/logo/logo_mark_green.svg` | 白地に置く単色版 |
| `docs/assets/logo/logo_mark_white.svg` | グリーン地・写真の上に置く白版 |
| `docs/assets/logo/favicon.svg` | ファビコン |
| `docs/assets/logo/logo_mark.png` | 1024×1024。SNSプロフィール画像・アプリアイコン |
| `docs/assets/logo/logo_mark_alpha.png` | 1024×1024・背景透過 |
| `docs/assets/logo/logo_horizontal.png` | 横組みロゴ（白地用） |
| `docs/assets/logo/logo_horizontal_white.png` | 横組みロゴ（グリーン地用） |
| `docs/assets/ogp.png` | OGP画像 2400×1260 |

## 使い方のルール

- マークは変形・回転・影づけをしない。余白はマークの高さの 1/4 以上を確保する。
- 背景がグリーンや写真のときは白版（`logo_mark_white.svg`）を使う。
- グリーン以外の色に着色しない。単色で使う場合は `#00a37a` かモノクロ（黒／白）のみ。

## LP側の埋め込み

`docs/index.html` / `docs/thanks.html` のヘッダー・フッターは、同じパスを inline SVG で直書きしています
（`.logo-mark` のグリーン地に白いチェック）。マークの形を変えたときは、この inline SVG と
`data:image/svg+xml` のファビコン、`tools/banner/make_banners.py` の `LOGO_SVG` も併せて更新してください。
