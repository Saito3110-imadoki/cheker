"""
マルチテナント対応ランナー
複数クライアントの設定ファイルを読み込み、生成または投稿を実行する。

使い方:
  python sns_scheduler/multi_runner.py --mode generate --client clients/imadoki.yaml
  python sns_scheduler/multi_runner.py --mode post     --client clients/imadoki.yaml
  python sns_scheduler/multi_runner.py --mode generate  # clients/*.yaml をすべて処理
"""

import argparse
import os
import sys
import yaml
from pathlib import Path


def load_client_config(client_path: Path) -> dict:
    """クライアント設定ファイルを読み込む"""
    with open(client_path, encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def apply_env_prefix(cfg: dict):
    """env_prefix に基づいて環境変数を標準名にマッピングする。
    例: CLIENT_A_X_API_KEY → X_API_KEY として os.environ に設定"""
    prefix = cfg.get("env_prefix", "").strip()
    if not prefix:
        return

    mappings = {
        "NOTION_TOKEN":             f"{prefix}_NOTION_TOKEN",
        "NOTION_DATABASE_ID":       f"{prefix}_NOTION_DATABASE_ID",
        "X_API_KEY":                f"{prefix}_X_API_KEY",
        "X_API_KEY_SECRET":         f"{prefix}_X_API_KEY_SECRET",
        "X_ACCESS_TOKEN":           f"{prefix}_X_ACCESS_TOKEN",
        "X_ACCESS_TOKEN_SECRET":    f"{prefix}_X_ACCESS_TOKEN_SECRET",
        "ANTHROPIC_API_KEY":        f"{prefix}_ANTHROPIC_API_KEY",
        "LINE_CHANNEL_ACCESS_TOKEN":f"{prefix}_LINE_CHANNEL_ACCESS_TOKEN",
        "LINE_USER_ID":             f"{prefix}_LINE_USER_ID",
        "THREADS_USER_ID":          f"{prefix}_THREADS_USER_ID",
        "THREADS_ACCESS_TOKEN":     f"{prefix}_THREADS_ACCESS_TOKEN",
    }

    for standard, prefixed in mappings.items():
        val = os.environ.get(prefixed, "")
        if val:
            os.environ[standard] = val
            print(f"[env] {prefixed} → {standard}")


def merge_with_base(client_cfg: dict, base_path: Path) -> dict:
    """base の config.yaml にクライアント設定を上書きマージする"""
    base: dict = {}
    if base_path.exists():
        with open(base_path, encoding="utf-8") as f:
            base = yaml.safe_load(f) or {}

    def deep_merge(b: dict, c: dict) -> dict:
        result = b.copy()
        for k, v in c.items():
            if isinstance(v, dict) and isinstance(result.get(k), dict):
                result[k] = deep_merge(result[k], v)
            else:
                result[k] = v
        return result

    return deep_merge(base, client_cfg)


def write_temp_config(merged: dict, tmp_path: Path):
    """マージ済み設定を一時ファイルとして書き出す"""
    with open(tmp_path, "w", encoding="utf-8") as f:
        yaml.dump(merged, f, allow_unicode=True, default_flow_style=False)


def run_for_client(client_path: Path, mode: str, script_dir: Path):
    print(f"\n{'='*60}")
    print(f" クライアント: {client_path.stem}")
    print(f" モード      : {mode}")
    print(f"{'='*60}")

    client_cfg = load_client_config(client_path)
    apply_env_prefix(client_cfg)

    # base config とマージして一時設定として書き出す
    base_path = script_dir / "config.yaml"
    merged    = merge_with_base(client_cfg, base_path)
    tmp_path  = script_dir / "_current_config.yaml"
    write_temp_config(merged, tmp_path)

    # config.yaml を一時的に差し替えて実行
    backup = None
    if base_path.exists():
        with open(base_path, encoding="utf-8") as f:
            backup = f.read()

    try:
        with open(base_path, "w", encoding="utf-8") as f:
            yaml.dump(merged, f, allow_unicode=True, default_flow_style=False)

        if mode == "generate":
            import daily_generator
            daily_generator.run()
        elif mode == "post":
            import poster
            poster.run()
        else:
            print(f"不明なモード: {mode}", file=sys.stderr)
            sys.exit(1)
    finally:
        # config.yaml を元に戻す
        if backup is not None:
            with open(base_path, "w", encoding="utf-8") as f:
                f.write(backup)
        if tmp_path.exists():
            tmp_path.unlink()


def main():
    parser = argparse.ArgumentParser(description="マルチテナント SNS スケジューラー")
    parser.add_argument("--mode",   choices=["generate", "post"], required=True,
                        help="generate: 投稿生成 / post: 自動投稿")
    parser.add_argument("--client", default="",
                        help="クライアント設定ファイルのパス（省略時は clients/*.yaml を全件処理）")
    args = parser.parse_args()

    script_dir  = Path(__file__).parent
    clients_dir = script_dir.parent / "clients"

    if str(script_dir) not in sys.path:
        sys.path.insert(0, str(script_dir))

    if args.client:
        client_path = Path(args.client)
        if not client_path.exists():
            print(f"設定ファイルが見つかりません: {client_path}", file=sys.stderr)
            sys.exit(1)
        run_for_client(client_path, args.mode, script_dir)
    else:
        configs = sorted(clients_dir.glob("*.yaml"))
        if not configs:
            print(f"clients/ にYAMLファイルが見つかりません: {clients_dir}", file=sys.stderr)
            sys.exit(1)
        for cfg_path in configs:
            if cfg_path.stem == "sample_client":
                print(f"  スキップ（サンプル）: {cfg_path.name}")
                continue
            run_for_client(cfg_path, args.mode, script_dir)


if __name__ == "__main__":
    main()
