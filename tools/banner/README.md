# バナー画像ジェネレータ

X／Threads 向けの訴求バナー（正方形）を HTML から生成するスクリプトです。
配色・ロゴは LP（`docs/index.html`）のブランドカラーに揃えています。

- ブランドグリーン: `#00a37a`
- CTAオレンジ: `#f5821f`
- サービス名: マカセル

## 生成

```bash
pip install playwright
playwright install chromium   # 既に Chromium がある場合は CHROME_PATH で指定可
python3 tools/banner/make_banners.py
```

出力先: `docs/assets/banners/`（既定・2160×2160px / `--scale` で倍率変更）

| ファイル | 訴求軸 |
| --- | --- |
| `banner_cost.png` | コスト（運用代行 月20万円〜 → 月9,800円〜） |
| `banner_time.png` | 時間（月60時間 → 月 約1時間） |
| `banner_task.png` | 業務量（毎日の作業6つ → 1日2分「選ぶ」だけ） |

## 文言・デザインの変更

`make_banners.py` の `BANNERS`（文言）と `CSS`（レイアウト・配色）を編集して再実行します。
サービス名を変える場合は `BRAND` 定数のみ書き換えれば全バナーに反映されます。
