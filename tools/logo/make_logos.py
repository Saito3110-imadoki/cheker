# -*- coding: utf-8 -*-
"""マカセルのロゴを生成するスクリプト（SVG定義 → playwrightでPNG書き出し）。

配色は docs/index.html のブランドカラーに合わせている。
  グリーン #00a37a ／ ダークグリーン #00805f ／ オレンジ #f5821f

使い方:
    python3 tools/logo/make_logos.py --sheet      # 3案の比較シートを書き出す
    python3 tools/logo/make_logos.py --final b    # 採用案でロゴ一式を書き出す
環境変数 CHROME_PATH で Chromium のパスを指定可。
"""

import argparse
import os

GREEN = "#00a37a"
GREEN_DARK = "#00805f"
INK = "#1b2126"
MUTED = "#767f88"

BRAND = "マカセル"

# ── マーク本体（64×64 のタイル内に描画）────────────────────────────
# fg = タイル上に置く図形の色、bg = タイルの色
MARKS = {
    "a": {
        "title": "A案：承認チェック",
        "note": "「1日2分の承認だけ」を最短距離で表現。小サイズでも潰れない。",
        "glyph": (
            '<path d="M17 33.5 L27.5 44 L47 21" fill="none" stroke="{fg}" '
            'stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>'
        ),
    },
    "b": {
        "title": "B案：吹き出し＋チェック",
        "note": "SNS投稿（吹き出し）を承認（チェック）する、事業内容がそのまま伝わる形。",
        "glyph": (
            '<path d="M16 11 H48 A9 9 0 0 1 57 20 V38 A9 9 0 0 1 48 47 H32 '
            'L21 55.5 V47 H16 A9 9 0 0 1 7 38 V20 A9 9 0 0 1 16 11 Z" fill="{fg}"/>'
            '<path d="M20 28.5 L28 36.5 L44 20.5" fill="none" stroke="{bg}" '
            'stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>'
        ),
    },
    "c": {
        "title": "C案：オートパイロット",
        "note": "「まわり続ける自動運用」＋中央のチェック。SaaSらしい抽象度。",
        "glyph": (
            '<path d="M45.2 13.2 A23 23 0 1 1 26.0 9.8" fill="none" stroke="{fg}" '
            'stroke-width="6.5" stroke-linecap="round"/>'
            '<path d="M35.2 7.3 L27.6 15.6 L24.5 4.0 Z" fill="{fg}"/>'
            '<path d="M23 32.5 L29.5 39 L41 26" fill="none" stroke="{fg}" '
            'stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>'
        ),
    },
}


def mark_svg(key, size=64, tile=True, fg="#ffffff", bg=GREEN, radius=16, surface=None):
    """マークのSVGを返す。

    tile=True  … 角丸タイル（bg）にマーク（fg）を載せたアイコン形式
    tile=False … 下地（surface）にマーク（fg）だけを置く単色形式
    """
    glyph = MARKS[key]["glyph"].format(fg=fg, bg=(bg if tile else (surface or "#ffffff")))
    tile_rect = f'<rect width="64" height="64" rx="{radius}" fill="{bg}"/>' if tile else ""
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" '
        f'width="{size}" height="{size}" role="img" aria-label="{BRAND}">'
        f"{tile_rect}{glyph}</svg>"
    )


FONT_LINK = (
    '<link rel="preconnect" href="https://fonts.googleapis.com">'
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
    '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@500;700;900&display=swap" rel="stylesheet">'
)
FONT_STACK = "'Noto Sans JP','Hiragino Sans','BIZ UDPGothic',sans-serif"


def lockup_html(key, size=96, color=INK, sub_color=MUTED, fg="#ffffff", bg=GREEN, sub=True):
    """マーク＋ロゴタイプ（横組み）の HTML 断片。"""
    sub_html = (
        f'<div style="font-size:{size*0.16:.0f}px;font-weight:500;color:{sub_color};'
        f'letter-spacing:.08em;margin-top:{size*0.04:.0f}px;">by IMADOKI</div>'
        if sub
        else ""
    )
    return (
        f'<div style="display:flex;align-items:center;gap:{size*0.26:.0f}px;">'
        f'{mark_svg(key, size=size, fg=fg, bg=bg)}'
        f'<div><div style="font-size:{size*0.62:.0f}px;font-weight:900;color:{color};'
        f'letter-spacing:.02em;line-height:1;white-space:nowrap;">{BRAND}</div>{sub_html}</div>'
        "</div>"
    )


def sheet_html():
    rows = []
    for key, m in MARKS.items():
        rows.append(f"""
    <section class="row">
      <div class="head"><span class="key">{key.upper()}</span>{m["title"]}</div>
      <p class="note">{m["note"]}</p>
      <div class="specimens">
        <div class="cell">{mark_svg(key, size=132)}<span>アプリアイコン</span></div>
        <div class="cell onwhite">{mark_svg(key, size=132, tile=False, fg=GREEN, surface="#ffffff")}<span>白地・単色</span></div>
        <div class="cell ongreen">{mark_svg(key, size=132, tile=False, fg="#ffffff", surface=GREEN)}<span>グリーン地・白</span></div>
        <div class="cell wide">{lockup_html(key, size=76)}<span>横組みロゴ</span></div>
        <div class="cell small">
          <div class="mini">{mark_svg(key, size=64)}{mark_svg(key, size=40)}{mark_svg(key, size=24)}{mark_svg(key, size=16)}</div>
          <span>小サイズ検証</span>
        </div>
      </div>
    </section>""")
    return f"""<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8">{FONT_LINK}
<style>
*{{margin:0;padding:0;box-sizing:border-box;}}
body{{width:1400px;font-family:{FONT_STACK};background:#fff;color:{INK};padding:56px 60px 60px;}}
h1{{font-size:34px;font-weight:900;}}
.sub{{color:{MUTED};font-size:16px;margin-top:8px;margin-bottom:38px;}}
.row{{border-top:1px solid #e4e8ea;padding:34px 0 30px;}}
.head{{font-size:23px;font-weight:900;display:flex;align-items:center;gap:14px;}}
.key{{background:{GREEN};color:#fff;font-size:15px;font-weight:900;
  width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;}}
.note{{color:{MUTED};font-size:15px;margin:10px 0 24px;}}
.specimens{{display:flex;align-items:stretch;gap:20px;}}
.cell{{border:1px solid #e4e8ea;border-radius:18px;padding:26px;background:#fff;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;min-width:200px;}}
.cell span{{font-size:13px;color:{MUTED};font-weight:700;}}
.cell.ongreen{{background:{GREEN};border-color:{GREEN};}}
.cell.ongreen span{{color:rgba(255,255,255,.85);}}
.cell.wide{{flex:1;align-items:flex-start;padding-left:34px;}}
.mini{{display:flex;align-items:flex-end;gap:18px;}}
</style></head><body>
<h1>マカセル ロゴ案</h1>
<p class="sub">ブランドカラー：グリーン {GREEN}（LP `docs/index.html` と共通）／ 書体：Noto Sans JP 900</p>
{''.join(rows)}
</body></html>"""


# ── OGP画像（SNSシェア時のプレビューカード / 1200×630 @2x）──────────
def ogp_html(key="b"):
    return f"""<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8">{FONT_LINK}
<style>
*{{margin:0;padding:0;box-sizing:border-box;}}
body{{width:1200px;height:630px;font-family:{FONT_STACK};background:#f7f9f9;color:{INK};
  border-left:14px solid {GREEN};padding:0 76px;display:flex;flex-direction:column;justify-content:center;}}
.lock{{display:flex;align-items:center;gap:22px;margin-bottom:34px;}}
.lock .name{{font-size:44px;font-weight:900;letter-spacing:.02em;line-height:1.1;}}
.lock .sub{{font-size:15px;font-weight:700;color:{MUTED};letter-spacing:.14em;margin-top:6px;}}
h1{{font-size:62px;font-weight:900;line-height:1.32;letter-spacing:-.01em;}}
h1 .hl{{color:{GREEN};}}
p{{margin-top:30px;font-size:25px;color:{MUTED};font-weight:500;}}
</style></head><body>
  <div class="lock">{mark_svg(key, size=92)}
    <div><div class="name">{BRAND}</div><div class="sub">MAKASERU by IMADOKI</div></div>
  </div>
  <h1>SNS運用、あなたの仕事は<br>「<span class="hl">1日2分の承認</span>」だけ。</h1>
  <p>ネタ探し・投稿文・図解画像・投稿・分析まで、ぜんぶAIが自動で回します。</p>
</body></html>"""


def render(pages, out_dir, scale=2):
    """[(html, width, height, filename)] を PNG 化する。"""
    from playwright.sync_api import sync_playwright

    os.makedirs(out_dir, exist_ok=True)
    launch_kwargs = {"args": ["--no-sandbox"]}
    chrome_path = os.environ.get("CHROME_PATH")
    if chrome_path and os.path.exists(chrome_path):
        launch_kwargs["executable_path"] = chrome_path

    written = []
    with sync_playwright() as p:
        browser = p.chromium.launch(**launch_kwargs)
        for html, w, h, name in pages:
            page = browser.new_page(viewport={"width": w, "height": h}, device_scale_factor=scale)
            page.set_content(html, wait_until="load")
            page.wait_for_function("document.fonts.status === 'loaded'", timeout=15000)
            path = os.path.join(out_dir, name)
            page.screenshot(path=path, full_page=True, omit_background=name.endswith("_alpha.png"))
            page.close()
            written.append(path)
        browser.close()
    return written


def wrap(fragment, w, h, bg="#ffffff", pad=0):
    return f"""<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8">{FONT_LINK}
<style>*{{margin:0;padding:0;box-sizing:border-box;}}
body{{width:{w}px;height:{h}px;background:{bg};font-family:{FONT_STACK};
display:flex;align-items:center;justify-content:center;padding:{pad}px;}}</style></head>
<body>{fragment}</body></html>"""


def main():
    repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    ap = argparse.ArgumentParser()
    ap.add_argument("--sheet", action="store_true", help="3案の比較シートを書き出す")
    ap.add_argument("--final", choices=sorted(MARKS), help="採用案のロゴ一式を書き出す")
    ap.add_argument("--ogp", choices=sorted(MARKS), help="採用案でOGP画像を書き出す")
    ap.add_argument("--out", default=os.path.join(repo_root, "docs", "assets", "logo"))
    args = ap.parse_args()

    if args.sheet:
        # 検討用シートは公開ディレクトリ（docs/）ではなくツール側に置く
        out = os.path.dirname(os.path.abspath(__file__))
        for path in render([(sheet_html(), 1400, 1180, "logo_concepts.png")], out, scale=2):
            print("生成:", os.path.relpath(path, repo_root))

    if args.final:
        k = args.final
        os.makedirs(args.out, exist_ok=True)
        # SVG（ベクター原本）
        svgs = {
            "logo_mark.svg": mark_svg(k, size=512),
            "logo_mark_green.svg": mark_svg(k, size=512, tile=False, fg=GREEN, surface="#ffffff"),
            "logo_mark_white.svg": mark_svg(k, size=512, tile=False, fg="#ffffff", surface=GREEN),
            "favicon.svg": mark_svg(k, size=64),
        }
        for name, svg in svgs.items():
            with open(os.path.join(args.out, name), "w", encoding="utf-8") as f:
                f.write(svg + "\n")
            print("生成:", os.path.relpath(os.path.join(args.out, name), repo_root))

        pages = [
            (wrap(mark_svg(k, size=512), 512, 512), 512, 512, "logo_mark.png"),
            (wrap(mark_svg(k, size=512), 512, 512, bg="rgba(0,0,0,0)"), 512, 512, "logo_mark_alpha.png"),
            (wrap(lockup_html(k, size=120), 900, 260), 900, 260, "logo_horizontal.png"),
            (wrap(lockup_html(k, size=120, color="#ffffff", sub_color="rgba(255,255,255,.75)",
                              fg=GREEN, bg="#ffffff"), 900, 260, bg=GREEN),
             900, 260, "logo_horizontal_white.png"),
        ]
        for path in render(pages, args.out, scale=2):
            print("生成:", os.path.relpath(path, repo_root))

    if args.ogp:
        out = os.path.join(repo_root, "docs", "assets")
        for path in render([(ogp_html(args.ogp), 1200, 630, "ogp.png")], out, scale=2):
            print("生成:", os.path.relpath(path, repo_root))


if __name__ == "__main__":
    main()
