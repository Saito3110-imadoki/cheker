import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch
from matplotlib import font_manager
import warnings
warnings.filterwarnings('ignore')

# 日本語フォント設定
font_path = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
font_prop = font_manager.FontProperties(fname=font_path)
plt.rcParams['font.family'] = font_prop.get_name()
font_manager.fontManager.addfont(font_path)

fig, ax = plt.subplots(figsize=(10, 6))
fig.patch.set_facecolor('#0F172A')
ax.set_facecolor('#0F172A')
ax.set_xlim(0, 10)
ax.set_ylim(0, 6)
ax.axis('off')

def txt(x, y, s, size=11, color='white', bold=False, italic=False, ha='center', va='center'):
    weight = 'bold' if bold else 'normal'
    style  = 'italic' if italic else 'normal'
    ax.text(x, y, s, ha=ha, va=va, fontsize=size, fontweight=weight,
            fontstyle=style, color=color,
            fontproperties=font_manager.FontProperties(fname=font_path))

# ── タイトル ──
txt(5, 5.65, "SEO時代 → AI検索時代　何が変わった？",
    size=14, bold=True, color='white')

# ── 左ボックス（SEO時代）──
ax.add_patch(FancyBboxPatch((0.3, 1.2), 3.8, 3.8,
    boxstyle="round,pad=0.1", lw=2,
    edgecolor='#64748B', facecolor='#1E293B'))

txt(2.2, 4.72, "SEO時代", size=13, bold=True, color='#94A3B8')

for y, t in [(4.1, "キーワードを詰め込む"),
             (3.5, "被リンク数を増やす"),
             (2.9, "検索エンジンを攻略する"),
             (2.3, "記事の量でカバー")]:
    txt(2.2, y, "・ " + t, size=10, color='#94A3B8')

txt(2.2, 1.55, "「見つけてもらう」戦略",
    size=9.5, italic=True, color='#64748B')

# ── 矢印 ──
ax.annotate('', xy=(5.85, 3.2), xytext=(4.15, 3.2),
    arrowprops=dict(arrowstyle='->', color='#F59E0B', lw=3))
txt(5.0, 3.6, "時代の転換", size=9, bold=True, color='#F59E0B')

# ── 右ボックス（AI検索時代）──
ax.add_patch(FancyBboxPatch((5.9, 1.2), 3.8, 3.8,
    boxstyle="round,pad=0.1", lw=2,
    edgecolor='#6366F1', facecolor='#1E1B4B'))

txt(7.8, 4.72, "AI検索時代", size=13, bold=True, color='#A5B4FC')

for y, t in [(4.1, "質問に直接答える構成"),
             (3.5, "AIが読みやすい文章"),
             (2.9, "回答エンジンに選ばれる"),
             (2.3, "質と構造が武器になる")]:
    txt(7.8, y, "・ " + t, size=10, color='#C7D2FE')

txt(7.8, 1.55, "「答えやすくする」戦略",
    size=9.5, italic=True, bold=True, color='#818CF8')

# ── 下部メッセージ ──
ax.add_patch(FancyBboxPatch((1.0, 0.1), 8.0, 0.8,
    boxstyle="round,pad=0.1", lw=1.5,
    edgecolor='#F59E0B', facecolor='#1C1400'))
txt(5.0, 0.5, "「AIに読みやすい形」にアップデートしないと埋もれる",
    size=10.5, bold=True, color='#FCD34D')

plt.tight_layout()
plt.savefig('/home/user/cheker/sample_post_image.png',
            dpi=150, bbox_inches='tight', facecolor='#0F172A')
print("saved")
