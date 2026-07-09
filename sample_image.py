import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch
from matplotlib import font_manager
import warnings
warnings.filterwarnings('ignore')

# ── フォント ──
font_path = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
bold_path = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
font_manager.fontManager.addfont(font_path)
FP  = font_manager.FontProperties(fname=font_path)

# ── 3色ルール ──
C_BASE    = '#0D1117'   # ベース（背景）
C_SURFACE = '#161B22'   # カード背景
C_MAIN    = '#818CF8'   # メインカラー（AI検索側）
C_ACCENT  = '#FCD34D'   # アクセント（強調・矢印）
C_TEXT    = '#E2E8F0'   # 本文テキスト
C_MUTED   = '#64748B'   # サブテキスト（SEO側）
C_BORDER  = '#30363D'   # ボーダー

# ── キャンバス ──
fig, ax = plt.subplots(figsize=(12, 6.72))  # 1200×672px @100dpi
fig.patch.set_facecolor(C_BASE)
ax.set_facecolor(C_BASE)
ax.set_xlim(0, 12)
ax.set_ylim(0, 6.72)
ax.axis('off')

def t(x, y, s, size=10, color=C_TEXT, bold=False, ha='left', va='center'):
    w = 'bold' if bold else 'normal'
    ax.text(x, y, s, ha=ha, va=va, fontsize=size, fontweight=w,
            color=color, fontproperties=FP)

# ══════════════════════════════════════════════
# ① ヘッダーエリア（H1 + サブタイトル）
# ══════════════════════════════════════════════
# カテゴリバッジ
badge = FancyBboxPatch((0.5, 5.9), 2.6, 0.45,
    boxstyle="round,pad=0.05", lw=0, facecolor='#1E2749')
ax.add_patch(badge)
t(0.72, 6.13, "AI検索時代のコンテンツ戦略", size=8.5, color=C_MAIN)

# H1 タイトル（最大フォント・白・太字）
t(0.5, 5.42, "SEO時代 → AI検索時代", size=22, color=C_TEXT, bold=True)

# サブタイトル（ミュート、H1の半分以下のサイズ感）
t(0.5, 4.95, "「見つけてもらう」から「答えやすくする」戦略へ",
  size=11, color=C_MUTED)

# 区切り線
ax.plot([0.5, 11.5], [4.68, 4.68], color=C_BORDER, lw=1.2)

# ══════════════════════════════════════════════
# ② 左カラム — SEO時代（ミュートカラー）
# ══════════════════════════════════════════════
L_X, L_W = 0.5, 4.3
card_l = FancyBboxPatch((L_X, 0.55), L_W, 3.9,
    boxstyle="round,pad=0.1", lw=1.2,
    edgecolor=C_BORDER, facecolor=C_SURFACE)
ax.add_patch(card_l)

# H2 見出し
t(L_X + 0.3, 4.2, "SEO時代", size=14, color=C_MUTED, bold=True)

# 小バッジ
b2 = FancyBboxPatch((L_X + 0.3, 3.7), 1.5, 0.32,
    boxstyle="round,pad=0.05", lw=0, facecolor='#1C2333')
ax.add_patch(b2)
t(L_X + 0.48, 3.86, "過去の戦略", size=8, color=C_MUTED)

# 区切り（カード内）
ax.plot([L_X+0.2, L_X+L_W-0.2], [3.55, 3.55], color=C_BORDER, lw=0.8)

# 箇条書き（左揃え・3点に絞る）
items_left = [
    "キーワードを詰め込んで上位表示を狙う",
    "被リンク数・ドメイン評価で競う",
    "「検索エンジン」に最適化された記事量産",
]
for i, item in enumerate(items_left):
    y = 3.1 - i * 0.65
    # ドット
    ax.plot(L_X + 0.35, y, 'o', color=C_MUTED, markersize=5)
    t(L_X + 0.6, y, item, size=10, color=C_MUTED)

# フッターラベル
t(L_X + 0.3, 0.88, "戦略の核心：", size=8.5, color=C_MUTED)
t(L_X + 0.3, 0.68, "「見つけてもらう」こと", size=10, color=C_MUTED, bold=True)

# ══════════════════════════════════════════════
# ③ 中央 — 遷移矢印
# ══════════════════════════════════════════════
ax.annotate('', xy=(6.85, 2.5), xytext=(5.15, 2.5),
    arrowprops=dict(arrowstyle='->', color=C_ACCENT, lw=3,
                    mutation_scale=22))
t(5.9, 2.9, "時代の", size=9, color=C_ACCENT, ha='center')
t(5.9, 2.65, "転換", size=9, color=C_ACCENT, bold=True, ha='center')

# ══════════════════════════════════════════════
# ④ 右カラム — AI検索時代（メインカラー）
# ══════════════════════════════════════════════
R_X, R_W = 7.2, 4.3
card_r = FancyBboxPatch((R_X, 0.55), R_W, 3.9,
    boxstyle="round,pad=0.1", lw=1.5,
    edgecolor=C_MAIN, facecolor=C_SURFACE)
ax.add_patch(card_r)

# H2 見出し（メインカラー）
t(R_X + 0.3, 4.2, "AI検索時代", size=14, color=C_MAIN, bold=True)

# 小バッジ（アクセント）
b3 = FancyBboxPatch((R_X + 0.3, 3.7), 1.5, 0.32,
    boxstyle="round,pad=0.05", lw=0, facecolor='#1C1E2C')
ax.add_patch(b3)
t(R_X + 0.48, 3.86, "今の戦略", size=8, color=C_ACCENT)

# 区切り
ax.plot([R_X+0.2, R_X+R_W-0.2], [3.55, 3.55], color='#2A2F50', lw=0.8)

# 箇条書き
items_right = [
    "質問に直接答える構成・見出し設計",
    "AIが引用しやすいシンプルな文体",
    "「回答エンジン」に選ばれるコンテンツ",
]
for i, item in enumerate(items_right):
    y = 3.1 - i * 0.65
    ax.plot(R_X + 0.35, y, 'o', color=C_MAIN, markersize=5)
    t(R_X + 0.6, y, item, size=10, color=C_TEXT)

# フッターラベル
t(R_X + 0.3, 0.88, "戦略の核心：", size=8.5, color=C_MAIN)
t(R_X + 0.3, 0.68, "「答えやすくする」こと", size=10, color=C_MAIN, bold=True)

# ══════════════════════════════════════════════
# ⑤ アクセントバー — 1メッセージの強調
# ══════════════════════════════════════════════
accent_bar = FancyBboxPatch((0.5, 0.06), 11.0, 0.42,
    boxstyle="round,pad=0.05", lw=0, facecolor='#2D2500')
ax.add_patch(accent_bar)

# 左アクセントライン
ax.plot([0.5, 0.5], [0.06, 0.48], color=C_ACCENT, lw=4, solid_capstyle='round')

t(0.85, 0.27,
  "「AIに読みやすい形」へのアップデートが、これからのコンテンツ競争を制する",
  size=10.5, color=C_ACCENT, bold=True)

# ══════════════════════════════════════════════
# 出力
# ══════════════════════════════════════════════
plt.tight_layout(pad=0)
plt.savefig('/home/user/cheker/sample_post_image.png',
            dpi=100, bbox_inches='tight', facecolor=C_BASE)
print("saved")
