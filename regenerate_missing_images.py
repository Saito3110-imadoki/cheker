"""
不足している画像を再生成するスクリプト
"""
import sys
sys.path.insert(0, '.')

import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
from matplotlib import font_manager
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')

# フォント
font_path = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
font_manager.fontManager.addfont(font_path)
FP = font_manager.FontProperties(fname=font_path)

C_BASE    = '#0D1117'
C_SURFACE = '#161B22'
C_MAIN    = '#818CF8'
C_ACCENT  = '#FCD34D'
C_TEXT    = '#E2E8F0'
C_MUTED   = '#64748B'
C_BORDER  = '#30363D'

def t(ax, x, y, s, size=10, color=C_TEXT, bold=False, ha='left', va='center'):
    ax.text(x, y, s, ha=ha, va=va, fontsize=size,
            fontweight='bold' if bold else 'normal',
            color=color, fontproperties=FP)

def make_canvas():
    fig, ax = plt.subplots(figsize=(10, 5.6))
    fig.patch.set_facecolor(C_BASE)
    ax.set_facecolor(C_BASE)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 5.6)
    ax.axis('off')
    return fig, ax

def add_header(ax, title, subtitle=""):
    ax.add_patch(FancyBboxPatch((0.4, 5.0), 9.2, 0.45,
        boxstyle="round,pad=0.05", lw=0, facecolor='#161B22'))
    t(ax, 0.6, 5.22, title, size=14, bold=True)
    if subtitle:
        t(ax, 0.4, 4.65, subtitle, size=9.5, color=C_MUTED)
    ax.plot([0.4, 9.6], [4.45, 4.45], color=C_BORDER, lw=0.8)
    ax.plot([0.4, 0.4], [4.45, 5.45], color=C_ACCENT, lw=4, solid_capstyle='round')

def add_footer(ax, caption):
    t(ax, 0.4, 0.2, caption, size=8, color=C_MUTED)

# ── 画像1: 月1000件の問い合わせ削減（stat型）──
fig, ax = make_canvas()
add_header(ax, "大阪メトロ：月1000件の問い合わせをAIで削減",
           "「同じ質問パターンを認識させる」だけで実現")

stats = [
    {"value": "月1000件", "label": "の問い合わせを削減"},
    {"value": "大幅な", "label": "コスト・工数の削減"},
]
xs = [2.8, 7.2]
for x, stat in zip(xs, stats):
    ax.add_patch(plt.Circle((x, 2.7), 1.4, color='#1E1B4B', zorder=1))
    ax.add_patch(plt.Circle((x, 2.7), 1.45, color=C_MAIN, fill=False, lw=2, zorder=2))
    t(ax, x, 2.7, stat["value"], size=16, color=C_ACCENT, bold=True, ha='center', va='center')
    t(ax, x, 1.1, stat["label"], size=9.5, color=C_TEXT, ha='center', va='center')

add_footer(ax, "出典：大阪メトロのAI活用事例をもとに作成")
Path("post-images").mkdir(exist_ok=True)
plt.savefig("post-images/2026-06-19-1.png", dpi=120, bbox_inches='tight', facecolor=C_BASE)
plt.close(fig)
print("✓ 2026-06-19-1.png 生成完了")

# ── 画像2: プロンプトキャッシュ 50倍高速・半分コスト（stat型）──
fig, ax = make_canvas()
add_header(ax, "プロンプトキャッシュで実現できること",
           "同じ指示を繰り返さないだけで劇的な改善")

stats2 = [
    {"value": "50倍", "label": "処理速度が向上"},
    {"value": "1/2", "label": "のトークンコスト"},
]
xs = [2.8, 7.2]
for x, stat in zip(xs, stats2):
    ax.add_patch(plt.Circle((x, 2.7), 1.4, color='#1E1B4B', zorder=1))
    ax.add_patch(plt.Circle((x, 2.7), 1.45, color=C_MAIN, fill=False, lw=2, zorder=2))
    t(ax, x, 2.7, stat["value"], size=20, color=C_ACCENT, bold=True, ha='center', va='center')
    t(ax, x, 1.1, stat["label"], size=9.5, color=C_TEXT, ha='center', va='center')

# 下部メッセージ
ax.add_patch(FancyBboxPatch((0.8, 0.35), 8.4, 0.55,
    boxstyle="round,pad=0.05", lw=1, edgecolor='#2D2500', facecolor='#1C1400'))
t(ax, 5.0, 0.63, "次世代ツールを待たなくても、今あるものを使い倒せば同じ効果が出る",
  size=9.5, color=C_ACCENT, ha='center', va='center')

add_footer(ax, "出典：GitHub Copilotの開発チーム事例をもとに作成")
plt.savefig("post-images/2026-06-19-2.png", dpi=120, bbox_inches='tight', facecolor=C_BASE)
plt.close(fig)
print("✓ 2026-06-19-2.png 生成完了")
