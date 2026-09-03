# -*- coding: utf-8 -*-
"""マカセル（SNS自動投稿）のSNS向けバナー画像を生成するスクリプト。

HTML で組んだバナーを playwright（Chromium）でスクリーンショットして PNG 化する。
配色・ロゴは docs/index.html のブランドカラー（グリーン #00a37a ／ CTAオレンジ #f5821f）に揃えている。

使い方:
    python3 tools/banner/make_banners.py
    python3 tools/banner/make_banners.py --out docs/assets/banners --scale 2

環境変数 CHROME_PATH を指定すると、その Chromium バイナリを使う
（playwright が管理する Chromium が無い環境向け）。
"""

import argparse
import os

SIZE = 1080  # 正方形（X／Threads どちらでも使える比率）

BRAND = "マカセル"

# docs/index.html の :root と同じ値
GREEN = "#00a37a"
GREEN_DARK = "#00805f"
GREEN_50 = "#e8f6f1"
GREEN_100 = "#c7e9dd"
ORANGE = "#e2740f"
ORANGE_BTN = "#f5821f"
INK = "#1b2126"
MUTED = "#767f88"
BAD = "#d92d20"
BAD_BG = "#fef3f2"
BAD_LINE = "#fbd2cd"

LOGO_SVG = (
    '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">'
    '<polygon points="13.5 4 6 14 11.2 14 10.5 20 18 10 12.8 10 13.5 4" fill="white"/>'
    "</svg>"
)

CSS = f"""
*{{margin:0;padding:0;box-sizing:border-box;}}
html,body{{width:{SIZE}px;height:{SIZE}px;}}
body{{
  font-family:'Noto Sans JP','Hiragino Sans','BIZ UDPGothic',sans-serif;
  color:{INK};
  background:linear-gradient(160deg,#ffffff 0%,{GREEN_50} 100%);
  -webkit-font-smoothing:antialiased;
}}
.frame{{
  width:{SIZE}px;height:{SIZE}px;padding:60px 64px 56px;
  display:flex;flex-direction:column;
}}
.brand{{display:flex;align-items:center;gap:16px;}}
.brand .mark{{
  width:56px;height:56px;border-radius:16px;background:{GREEN};
  display:flex;align-items:center;justify-content:center;
}}
.brand .mark svg{{width:34px;height:34px;}}
.brand .name{{font-size:38px;font-weight:900;letter-spacing:.01em;}}
h1{{
  margin-top:34px;text-align:center;font-size:56px;font-weight:900;
  line-height:1.34;letter-spacing:-.01em;
}}
h1 .hl{{color:{ORANGE};}}
.stack{{flex:1;display:flex;flex-direction:column;justify-content:center;gap:14px;margin:28px 0 26px;}}
.card{{border-radius:24px;padding:26px 36px 30px;}}
.card .label{{display:flex;align-items:center;gap:12px;font-size:28px;font-weight:900;letter-spacing:.01em;}}
.card .label .icon{{font-size:30px;font-weight:900;line-height:1;}}
.card .value{{text-align:center;font-size:86px;font-weight:900;line-height:1.15;margin-top:8px;}}
.bad{{background:{BAD_BG};border:2px solid {BAD_LINE};}}
.bad .label{{color:{BAD};}}
.bad .value{{color:{BAD};text-decoration:line-through;text-decoration-thickness:7px;}}
.good{{background:#ffffff;border:3px solid {GREEN};box-shadow:0 10px 30px rgba(0,163,122,.10);}}
.good .label{{color:{GREEN_DARK};}}
.good .value{{color:{ORANGE};}}
.arrow{{text-align:center;color:{GREEN};font-size:38px;line-height:1;font-weight:900;}}
.tasks{{display:grid;grid-template-columns:1fr 1fr;gap:12px 36px;margin-top:14px;}}
.tasks li{{
  list-style:none;font-size:36px;font-weight:700;color:{BAD};
  text-decoration:line-through;text-decoration-thickness:4px;
}}
.card .value.sm{{font-size:68px;}}
.cta{{
  background:{GREEN};color:#fff;border-radius:22px;
  padding:26px 24px;text-align:center;font-size:38px;font-weight:900;letter-spacing:.01em;
}}
.cta .accent{{color:#ffd9b0;}}
"""

BANNERS = [
    {
        "name": "banner_cost",
        "headline": 'その<span class="hl">SNS運用費</span>、<br>ムダに払ってませんか？',
        "bad_label": "SNS運用代行に外注",
        "bad_value": "月20万円〜",
        "good_label": f"{BRAND}なら",
        "good_value": "月9,800円〜",
        "cta": "同じSNS運用が、コスト20分の1。",
    },
    {
        "name": "banner_time",
        "headline": 'SNS運用に<span class="hl">月60時間</span>、<br>まだ溶かしますか？',
        "bad_label": "自社で手作業運用",
        "bad_value": "月60時間",
        "good_label": f"{BRAND}なら",
        "good_value": "月 約1時間",
        "cta": "仕事は「1日2分の承認」だけ。",
    },
    {
        "name": "banner_task",
        "headline": 'SNS運用の仕事、<br><span class="hl">9割いらなくなる。</span>',
        "bad_label": "これまでの毎日",
        "bad_tasks": ["ネタ探し", "構成づくり", "執筆・推敲", "画像の用意", "投稿予約", "数値レポート"],
        "good_label": f"{BRAND}導入後",
        "good_value": "1日2分、<br>「選ぶ」だけ。",
        "good_value_small": True,
        "cta": "月9,800円〜／まずは10日間おためし",
    },
]


def build_html(b):
    if b.get("bad_tasks"):
        bad_body = '<ul class="tasks">' + "".join(f"<li>{t}</li>" for t in b["bad_tasks"]) + "</ul>"
    else:
        bad_body = f'<div class="value">{b["bad_value"]}</div>'
    good_cls = "value sm" if b.get("good_value_small") else "value"
    return f"""<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;900&display=swap" rel="stylesheet">
<style>{CSS}</style></head>
<body><div class="frame">
  <div class="brand"><div class="mark">{LOGO_SVG}</div><div class="name">{BRAND}</div></div>
  <h1>{b["headline"]}</h1>
  <div class="stack">
    <div class="card bad">
      <div class="label"><span class="icon">✕</span>{b["bad_label"]}</div>
      {bad_body}
    </div>
    <div class="arrow">↓</div>
    <div class="card good">
      <div class="label"><span class="icon">✓</span>{b["good_label"]}</div>
      <div class="{good_cls}">{b["good_value"]}</div>
    </div>
  </div>
  <div class="cta">{b["cta"]}</div>
</div></body></html>"""


def render(banners, out_dir, scale):
    from playwright.sync_api import sync_playwright

    os.makedirs(out_dir, exist_ok=True)
    launch_kwargs = {"args": ["--no-sandbox"]}
    chrome_path = os.environ.get("CHROME_PATH")
    if chrome_path and os.path.exists(chrome_path):
        launch_kwargs["executable_path"] = chrome_path

    paths = []
    with sync_playwright() as p:
        browser = p.chromium.launch(**launch_kwargs)
        page = browser.new_page(
            viewport={"width": SIZE, "height": SIZE},
            device_scale_factor=scale,
        )
        for b in banners:
            page.set_content(build_html(b), wait_until="load")
            # Webフォント（Noto Sans JP）の読み込み完了を待つ
            page.wait_for_function("document.fonts.status === 'loaded'", timeout=15000)
            png_path = os.path.join(out_dir, b["name"] + ".png")
            page.screenshot(path=png_path)
            paths.append(png_path)
        browser.close()
    return paths


def main():
    repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(repo_root, "docs", "assets", "banners"))
    ap.add_argument("--scale", type=int, default=2, help="解像度倍率（既定2＝2160×2160px）")
    args = ap.parse_args()

    for path in render(BANNERS, args.out, args.scale):
        print("生成:", os.path.relpath(path, repo_root))


if __name__ == "__main__":
    main()
