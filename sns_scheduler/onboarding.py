"""
クライアント オンボーディング ウィザード
対話形式で質問に答えるだけで clients/{slug}.yaml を自動生成します。

使い方:
  python sns_scheduler/onboarding.py
"""

import re
import sys
import unicodedata
from pathlib import Path

import yaml


# ── カラープリセット ──────────────────────────────────────
COLOR_PRESETS = [
    ("インディゴ × アンバー", "#6366f1", "#fbbf24", "テック・スタートアップ・IT"),
    ("スカイブルー × シアン", "#0ea5e9", "#38bdf8", "清潔感・医療・金融・信頼"),
    ("エメラルド × グリーン", "#10b981", "#34d399", "健康・農業・環境・成長"),
    ("パープル × バイオレット", "#8b5cf6", "#a78bfa", "クリエイティブ・美容・教育"),
    ("ピンク × ローズ",        "#ec4899", "#f472b6", "ファッション・コスメ・ライフスタイル"),
    ("オレンジ × アンバー",    "#f97316", "#fbbf24", "食品・飲食・小売・エネルギー"),
]

DIVIDER = "─" * 52


def _ask(prompt: str, default: str = "", required: bool = True) -> str:
    """1行入力。default があれば空Enterで採用。required=True なら空入力を弾く。"""
    disp = f" [{default}]" if default else ""
    while True:
        val = input(f"  {prompt}{disp}: ").strip()
        if not val and default:
            return default
        if val:
            return val
        if not required:
            return ""
        print("  ⚠️  入力必須です。")


def _ask_list(prompt: str, hint: str = "（Enterで次へ、空で入力終了）") -> list[str]:
    """複数行入力。空行で終了。"""
    print(f"  {prompt} {hint}")
    items: list[str] = []
    while True:
        val = input("    > ").strip()
        if not val:
            if items:
                break
            print("    ⚠️  1つ以上入力してください。")
        else:
            items.append(val)
    return items


def _make_slug(name: str) -> str:
    """会社名からURLセーフなスラッグを生成"""
    name = unicodedata.normalize("NFKC", name)
    # 法人格を除去
    name = re.sub(r"(株式会社|有限会社|合同会社|一般社団法人|NPO法人)", "", name)
    name = re.sub(r"\s+", "-", name.strip())
    name = re.sub(r"[^\w\-]", "", name, flags=re.ASCII)
    slug = name.lower().strip("-") or "client"
    return slug


def _pick_color() -> tuple[str, str]:
    """カラープリセット選択。6番でカスタム入力。"""
    print()
    print(f"  ブランドカラーを選んでください:")
    for i, (label, p, a, desc) in enumerate(COLOR_PRESETS, 1):
        print(f"    {i}. {label:<26} ← {desc}")
    print(f"    {len(COLOR_PRESETS)+1}. カスタム（自分で入力）")

    while True:
        choice = input("  選択番号: ").strip()
        if choice.isdigit():
            n = int(choice)
            if 1 <= n <= len(COLOR_PRESETS):
                _, primary, accent, _ = COLOR_PRESETS[n - 1]
                return primary, accent
            if n == len(COLOR_PRESETS) + 1:
                primary = input("  プライマリカラー（例 #0ea5e9）: ").strip()
                accent  = input("  アクセントカラー（例 #38bdf8）: ").strip()
                return primary or "#6366f1", accent or "#fbbf24"
        print("  ⚠️  番号を入力してください。")


def _confirm(data: dict) -> bool:
    """入力内容を表示して確認。"""
    b = data["branding"]
    c = data["content"]
    print()
    print(DIVIDER)
    print("  確認: 以下の内容で設定ファイルを生成します")
    print(DIVIDER)
    print(f"  会社名      : {data['company']['name']}")
    print(f"  スラッグ    : {data['_slug']}")
    print(f"  業種        : {data['company']['industry']}")
    print(f"  ターゲット  : {c['target_audience']}")
    print(f"  トピック    : {', '.join(data['topics']['primary'])}")
    print(f"  キーワード  : {', '.join(data['topics']['keywords_x'])}")
    print(f"  RSSフィード : {len(data['rss_feeds'])} 件")
    print(f"  投稿数/日   : {c['posts_per_day']}")
    print(f"  投稿時間    : {', '.join(data['schedule']['times'])}")
    print(f"  カラー      : {b['primary_color']} / {b['accent_color']}")
    print(f"  ウォーターマーク: {b['company_name']}")
    print(DIVIDER)
    ans = input("  よろしいですか？ [Y/n]: ").strip().lower()
    return ans in ("", "y", "yes", "はい")


def run():
    print()
    print("=" * 52)
    print("  SNSスケジューラー クライアント設定ウィザード")
    print("=" * 52)
    print("  質問に答えるだけで設定ファイルを自動生成します。")
    print()

    # ── 会社情報 ─────────────────────────────────────────
    print(f"{DIVIDER}")
    print("  [1/6] 会社・ブランド情報")
    print(DIVIDER)
    company_name = _ask("会社名（正式名称）")
    slug_default = _make_slug(company_name)
    slug         = _ask("ファイル名スラッグ（英数字・ハイフン）", default=slug_default)
    slug         = re.sub(r"[^\w\-]", "", slug).lower() or slug_default
    industry     = _ask("業種・ビジネス内容（例: ITコンサルティング）")
    company_url  = _ask("会社URL", default="", required=False)

    # ── コンテンツスタイル ────────────────────────────────
    print()
    print(DIVIDER)
    print("  [2/6] 投稿スタイル")
    print(DIVIDER)
    target   = _ask("ターゲット読者（例: 30〜50代の経営者・管理職）")
    tone     = _ask("投稿トーン（例: 丁寧・落ち着いた口調）",
                    default="親しみやすい・専門用語なし・友達に話すような口調")
    posts_n  = _ask("1日の投稿数（1〜10）", default="5")
    try:
        posts_n = str(max(1, min(10, int(posts_n))))
    except ValueError:
        posts_n = "5"

    # ── トピック・キーワード ──────────────────────────────
    print()
    print(DIVIDER)
    print("  [3/6] コンテンツトピック")
    print(DIVIDER)
    topics   = _ask_list("投稿するメインテーマ（例: AI活用、業務効率化）")
    keywords = _ask_list("X（Twitter）検索キーワード（例: ChatGPT、DX推進）")

    # ── RSSフィード ───────────────────────────────────────
    print()
    print(DIVIDER)
    print("  [4/6] RSSフィード（業界ニュースサイトのRSS URL）")
    print(DIVIDER)
    print("  ※ わからない場合はEnterを押してデフォルトを使用")
    rss_items: list[str] = []
    while True:
        val = input("    RSS URL (空でスキップ): ").strip()
        if not val:
            break
        rss_items.append(val)
    if not rss_items:
        rss_items = [
            "https://rss.itmedia.co.jp/rss/2.0/aiplus.xml",
            "https://b.hatena.ne.jp/hotentry/it.rss",
        ]
        print(f"  → デフォルトRSSを使用します（{len(rss_items)}件）")

    # ── スケジュール ──────────────────────────────────────
    print()
    print(DIVIDER)
    print("  [5/6] 投稿スケジュール（JST）")
    print(DIVIDER)
    times_input = _ask(
        "投稿時間をスペース区切りで入力",
        default="09:00 12:00 18:00 20:00 22:00",
    )
    times = [t.strip() for t in times_input.split() if re.match(r"^\d{2}:\d{2}$", t.strip())]
    if not times:
        times = ["09:00", "12:00", "18:00", "20:00", "22:00"]

    # ── ブランドカラー ────────────────────────────────────
    print()
    print(DIVIDER)
    print("  [6/6] ブランドカラー・ロゴ")
    print(DIVIDER)
    primary_color, accent_color = _pick_color()
    logo_url     = _ask("ロゴ画像URL（空白=会社名テキストを表示）", default="", required=False)
    watermark    = _ask("画像右下に表示する会社名", default=company_name)

    # ── データ構築 ────────────────────────────────────────
    data: dict = {
        "_slug": slug,
        "env_prefix": "",
        "company": {
            "name": company_name,
            "industry": industry,
            **({"url": company_url} if company_url else {}),
        },
        "content": {
            "target_audience": target,
            "tone": tone,
            "posts_per_day": int(posts_n),
        },
        "topics": {
            "primary":    topics,
            "keywords_x": keywords,
        },
        "rss_feeds": rss_items,
        "schedule": {"times": times},
        "branding": {
            "primary_color": primary_color,
            "accent_color":  accent_color,
            "logo_url":      logo_url,
            "company_name":  watermark,
        },
    }

    # ── 確認 & 生成 ───────────────────────────────────────
    if not _confirm(data):
        print("\n  キャンセルしました。もう一度実行して入力し直してください。")
        sys.exit(0)

    clients_dir = Path(__file__).parent.parent / "clients"
    clients_dir.mkdir(exist_ok=True)
    out_path = clients_dir / f"{slug}.yaml"

    save_data = {k: v for k, v in data.items() if k != "_slug"}
    header = (
        f"# ============================================================\n"
        f"#  クライアント設定ファイル：{company_name}\n"
        f"#  sns_scheduler/config.yaml の内容をここで上書きできます。\n"
        f"# ============================================================\n\n"
    )
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(header)
        yaml.dump(save_data, f, allow_unicode=True,
                  default_flow_style=False, sort_keys=False)

    print()
    print("=" * 52)
    print(f"  ✅ 設定ファイルを生成しました")
    print(f"  📄 {out_path}")
    print("=" * 52)
    print()
    print("  【次のステップ】")
    print()
    print("  1. 生成されたファイルを確認・編集:")
    print(f"       cat {out_path}")
    print()
    print("  2. GitHub Secrets に以下を登録:")
    print("       NOTION_TOKEN")
    print("       NOTION_DATABASE_ID")
    print("       X_API_KEY / X_API_KEY_SECRET")
    print("       X_ACCESS_TOKEN / X_ACCESS_TOKEN_SECRET")
    print("       ANTHROPIC_API_KEY")
    print("       LINE_CHANNEL_ACCESS_TOKEN / LINE_USER_ID")
    print()
    print("  3. Notion データベースを準備:")
    print("       docs/notion_guide.md を参照")
    print()
    print("  4. 動作確認:")
    print(f"       python sns_scheduler/multi_runner.py \\")
    print(f"         --mode generate --client {out_path}")
    print()


if __name__ == "__main__":
    run()
