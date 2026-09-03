# -*- coding: utf-8 -*-
"""LPに掲載している週間レポートのサンプル画像を再生成するスクリプト。

sns_scheduler/report.py のレンダラをそのまま使い、LP掲載用のサンプルデータを
1ページずつ PNG にする。レポートのデザイン・配色・「Powered by マカセル」表記を
変更したら、これを実行して docs/assets/report_sample_1.png /
report_sample_2.png を更新する。

サンプルの数値・投稿文はLP用のダミー（report.py の demo_data は別クライアント
向けの題材のため、LPには使わない）。

使い方:
    python3 tools/lp/make_report_samples.py
環境変数 CHROME_PATH で Chromium のパスを指定可。
"""

import os
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(REPO_ROOT, "sns_scheduler"))

import report  # noqa: E402

# LP掲載用のダミー社名（実際のクライアント名を出さない）
report.COMPANY = "サンプル株式会社"

OUT_DIR = os.path.join(REPO_ROOT, "docs", "assets")

# ── LP掲載用のサンプルデータ（SNS運用アカウントを想定したダミー）────────
RANKING = [
    {"head": "「インスタのフォロワー数」より大事な数字、実は1つだけ…",
     "type": "ノウハウ", "imp": 3240, "likes": 74, "rts": 18, "er": 2.3, "dt": "7/16 20:00"},
    {"head": "SNS担当が1人で消耗する会社と、仕組みで回る会社の違い…",
     "type": "あるある", "imp": 2810, "likes": 61, "rts": 15, "er": 2.2, "dt": "7/17 21:30"},
    {"head": "広告費ゼロで月1,000人に届いた投稿がやっていた3つのこと…",
     "type": "ノウハウ", "imp": 2150, "likes": 47, "rts": 9, "er": 2.2, "dt": "7/15 18:30"},
    {"head": "「バズらなくていい」中小企業のSNSが目指すべき数字の話…",
     "type": "共感", "imp": 1780, "likes": 39, "rts": 7, "er": 2.2, "dt": "7/14 12:15"},
    {"head": "AIに投稿を書かせたら炎上しない？企業アカウントの安全設計…",
     "type": "ノウハウ", "imp": 1420, "likes": 28, "rts": 6, "er": 2.0, "dt": "7/13 20:00"},
]

SAMPLE_DATA = {
    "mode": "weekly", "date": "2026-07-20", "period_label": "2026/7/13 〜 7/19",
    "cur": {"count": 35, "imp": 18420, "likes": 402, "rts": 88, "th_views": 5210, "th_likes": 96},
    "prev": {"count": 31, "imp": 15610, "likes": 350, "rts": 74, "th_views": 4378, "th_likes": 82},
    "ranking": RANKING,
    "all_posts": RANKING,
    "type_analysis": [
        {"label": "ノウハウ", "count": 14, "avg_imp": 920, "avg_er": 2.2},
        {"label": "あるある", "count": 9, "avg_imp": 610, "avg_er": 2.4},
        {"label": "共感", "count": 7, "avg_imp": 480, "avg_er": 1.9},
        {"label": "ニュース", "count": 5, "avg_imp": 290, "avg_er": 1.3},
    ],
    "goal_imp": 80000, "goal_progress": 54300,
    "patterns": {
        "weekday": [{"label": "月曜", "avg": 460}, {"label": "火曜", "avg": 540},
                    {"label": "水曜", "avg": 610}, {"label": "木曜", "avg": 720},
                    {"label": "金曜", "avg": 505}],
        "timeslot": [{"label": "昼", "avg": 430}, {"label": "夕方", "avg": 520},
                     {"label": "夜", "avg": 780}],
    },
    "audience": {
        "followers": 1284,
        "age": [{"label": "25-34", "value": 449}, {"label": "35-44", "value": 372},
                {"label": "18-24", "value": 244}, {"label": "45-54", "value": 154},
                {"label": "55+", "value": 65}],
        "gender": [{"label": "M", "value": 706}, {"label": "F", "value": 539},
                   {"label": "U", "value": 39}],
    },
}

SAMPLE_INSIGHTS = {
    "analysis": [
        "表示回数は前週比+18%。木曜夜の「ノウハウ」投稿が全体を牽引しています。",
        "「ノウハウ」タイプは平均920表示と、ニュース系の約3倍の成績です。",
        "夜の時間帯（平均780表示）が最も反応が良く、ターゲットの閲覧習慣と一致しています。",
    ],
    "win_pattern": "「具体的な数字＋今日から真似できる手順」を含む投稿が伸びています（上位5本中3本）。",
    "lose_pattern": "ニュースの紹介だけで「自社の読者への示唆」がない投稿は平均290表示にとどまっています。",
    "theme_ideas": [
        {"title": "SNS運用を外注する前に、社内で確認すべき3つの数字", "reason": "数字系ノウハウが最も高ER"},
        {"title": "フォロワー1,000人までにやったことを全部公開します", "reason": "実録系は保存されやすい"},
        {"title": "『毎日投稿』をやめたら伸びた話——頻度より大事なもの", "reason": "逆説フックが上位傾向"},
    ],
    "next_actions": [
        {"title": "ノウハウ系を週2本増枠", "detail": "ニュース系を減らし、数字入りノウハウに振り替える"},
        {"title": "木曜夜にエース投稿を配置", "detail": "最も反応が良い木曜22時台に本命テーマを置く"},
        {"title": "ニュース系に「示唆」を追加", "detail": "事実紹介で終わらせず読者への意味を1文添える"},
    ],
}


def main():
    from playwright.sync_api import sync_playwright

    html = report.build_html(SAMPLE_DATA, SAMPLE_INSIGHTS)

    launch_kwargs = {"args": ["--no-sandbox", "--disable-dev-shm-usage"]}
    chrome_path = os.environ.get("CHROME_PATH")
    if chrome_path and os.path.exists(chrome_path):
        launch_kwargs["executable_path"] = chrome_path

    with sync_playwright() as p:
        browser = p.chromium.launch(**launch_kwargs)
        page = browser.new_page(viewport={"width": 794, "height": 1123}, device_scale_factor=2)
        page.set_content(html, wait_until="load")
        page.wait_for_function("document.fonts.status === 'loaded'", timeout=15000)
        for i, el in enumerate(page.query_selector_all(".page"), start=1):
            path = os.path.join(OUT_DIR, f"report_sample_{i}.png")
            el.screenshot(path=path)
            print("生成:", os.path.relpath(path, REPO_ROOT))
        browser.close()


if __name__ == "__main__":
    main()
