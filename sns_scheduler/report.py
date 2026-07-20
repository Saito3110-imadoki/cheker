"""
週次・月次レポート
Notionに蓄積された投稿実績（analytics.pyが毎晩計測）を集計し、
LINEでダイジェストを配信する。

使い方:
  python sns_scheduler/report.py --mode weekly    # 直近7日間
  python sns_scheduler/report.py --mode monthly   # 前月1ヶ月分

送信先: notify.py の宛先設定（LINE_USER_ID / LINE_USER_ID2）に従う
"""

import argparse
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import yaml
from notion_client import Client
from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).resolve().parent))
from notify import send_line_message

load_dotenv()
JST = timezone(timedelta(hours=9))

# ── config.yaml からプロパティ名を読む ─────────────────────
_config: dict = {}
_config_path = Path(__file__).resolve().parent / "config.yaml"
if not _config_path.exists():
    _config_path = Path("config.yaml")
if _config_path.exists():
    with open(_config_path, encoding="utf-8") as f:
        _config = yaml.safe_load(f) or {}


def _cfg(*keys, default=None):
    node = _config
    for k in keys:
        if not isinstance(node, dict) or k not in node:
            return default
        node = node[k]
    return node


PROP_TEXT          = _cfg("notion", "properties", "text",          default="投稿文")
PROP_DATETIME      = _cfg("notion", "properties", "datetime",      default="投稿日時")
PROP_STATUS        = _cfg("notion", "properties", "status",        default="ステータス")
PROP_LIKES         = _cfg("notion", "properties", "likes",         default="いいね数")
PROP_RETWEETS      = _cfg("notion", "properties", "retweets",      default="RT数")
PROP_IMPRESSIONS   = _cfg("notion", "properties", "impressions",   default="インプレッション")
PROP_THREADS_LIKES = _cfg("notion", "properties", "threads_likes", default="Threadsいいね数")
PROP_THREADS_VIEWS = _cfg("notion", "properties", "threads_views", default="Threads閲覧数")
STATUS_DONE        = _cfg("notion", "status", "done", default="投稿済")


def _num(page: dict, prop: str) -> int:
    v = page["properties"].get(prop, {}).get("number")
    return int(v) if v else 0


def _text_head(page: dict, limit: int = 26) -> str:
    prop = page["properties"].get(PROP_TEXT, {})
    parts = prop.get("title") or prop.get("rich_text") or []
    text = "".join(p.get("plain_text", "") for p in parts).replace("\n", " ")
    return text[:limit] + ("…" if len(text) > limit else "")


def fetch_posts(notion: Client, db_id: str, start: datetime, end: datetime) -> list[dict]:
    """期間内の投稿済レコードを全件取得（ページネーション対応）"""
    results, cursor = [], None
    while True:
        kwargs = {
            "database_id": db_id,
            "filter": {"and": [
                {"property": PROP_STATUS,
                 "multi_select": {"contains": STATUS_DONE}},
                {"property": PROP_DATETIME,
                 "date": {"on_or_after": start.isoformat()}},
                {"property": PROP_DATETIME,
                 "date": {"before": end.isoformat()}},
            ]},
            "page_size": 100,
        }
        if cursor:
            kwargs["start_cursor"] = cursor
        resp = notion.databases.query(**kwargs)
        results.extend(resp.get("results", []))
        if not resp.get("has_more"):
            return results
        cursor = resp.get("next_cursor")


def summarize(posts: list[dict]) -> dict:
    return {
        "count":      len(posts),
        "imp":        sum(_num(p, PROP_IMPRESSIONS) for p in posts),
        "likes":      sum(_num(p, PROP_LIKES) for p in posts),
        "rts":        sum(_num(p, PROP_RETWEETS) for p in posts),
        "th_views":   sum(_num(p, PROP_THREADS_VIEWS) for p in posts),
        "th_likes":   sum(_num(p, PROP_THREADS_LIKES) for p in posts),
    }


def _pct(cur: int, prev: int) -> str:
    """前期間比を「(+15%)」形式で。前期間が0なら表示しない"""
    if prev <= 0:
        return ""
    diff = round((cur - prev) / prev * 100)
    sign = "+" if diff >= 0 else ""
    return f"（前{'週' if _MODE == 'weekly' else '月'}比 {sign}{diff}%）"


_MODE = "weekly"


def build_message(mode: str, start: datetime, end: datetime,
                  cur: dict, prev: dict, best: dict | None) -> str:
    title = "📊 週間レポート" if mode == "weekly" else "📊 月間レポート"
    period = f"{start.strftime('%-m/%-d')}〜{(end - timedelta(days=1)).strftime('%-m/%-d')}"

    lines = [
        f"{title}（{period}）",
        "━━━━━━━━━━━━",
        f"投稿数: {cur['count']}件",
        f"𝕏 表示回数: {cur['imp']:,}回{_pct(cur['imp'], prev['imp'])}",
        f"𝕏 いいね: {cur['likes']:,}{_pct(cur['likes'], prev['likes'])}",
        f"𝕏 リポスト: {cur['rts']:,}",
        f"Threads 閲覧: {cur['th_views']:,}",
        f"Threads いいね: {cur['th_likes']:,}",
    ]

    if best:
        lines += [
            "",
            "🏆 ベスト投稿",
            f"「{best['head']}」",
            f"　表示 {best['imp']:,} ／ いいね {best['likes']:,}",
        ]

    if cur["count"] > 0:
        avg = cur["imp"] // cur["count"] if cur["count"] else 0
        lines += ["", f"💡 1投稿あたり平均 {avg:,}表示"]

    lines += ["", "詳細はNotionをご確認ください。"]
    return "\n".join(lines)


def run(mode: str):
    global _MODE
    _MODE = mode
    now = datetime.now(JST)

    if mode == "weekly":
        end   = now.replace(hour=0, minute=0, second=0, microsecond=0)
        start = end - timedelta(days=7)
        prev_start, prev_end = start - timedelta(days=7), start
    else:  # monthly: 前月1日〜今月1日
        first_this = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        end   = first_this
        start = (first_this - timedelta(days=1)).replace(day=1)
        prev_end   = start
        prev_start = (start - timedelta(days=1)).replace(day=1)

    print(f"[{now.strftime('%Y-%m-%d %H:%M')} JST] {mode}レポート生成 "
          f"（{start.date()} 〜 {(end - timedelta(days=1)).date()}）")

    notion = Client(auth=os.environ["NOTION_TOKEN"])
    db_id  = os.environ["NOTION_DATABASE_ID"]

    posts      = fetch_posts(notion, db_id, start, end)
    prev_posts = fetch_posts(notion, db_id, prev_start, prev_end)
    cur, prev  = summarize(posts), summarize(prev_posts)
    print(f"  対象投稿: {cur['count']}件 ／ 前期間: {prev['count']}件")

    if cur["count"] == 0:
        text = ("📊 " + ("週間" if mode == "weekly" else "月間") + "レポート\n"
                "対象期間に投稿がありませんでした。\n"
                "Notionの「承認待ち」をご確認ください。")
    else:
        best_page = max(posts, key=lambda p: _num(p, PROP_IMPRESSIONS), default=None)
        best = None
        if best_page and _num(best_page, PROP_IMPRESSIONS) > 0:
            best = {"head": _text_head(best_page),
                    "imp": _num(best_page, PROP_IMPRESSIONS),
                    "likes": _num(best_page, PROP_LIKES)}
        text = build_message(mode, start, end, cur, prev, best)

    if send_line_message(text):
        print("  LINE配信完了")
    else:
        print("  LINE配信に失敗しました", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="週次・月次レポート")
    ap.add_argument("--mode", choices=["weekly", "monthly"], default="weekly")
    args = ap.parse_args()
    run(args.mode)
