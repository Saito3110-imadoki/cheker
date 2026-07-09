// ゲーミフィケーション: XP・レベル・ストリーク・バッジ
// localStorage key: imadoki-game / 更新イベント: imadoki-game-updated / XPトースト: imadoki-xp-gain

export type XpEvent =
  | 'task-done'        // タスク完了 +50
  | 'project-done'     // プロジェクト完了 +200
  | 'invoice-paid'     // 入金確認 +100
  | 'invoice-created'  // 書類作成 +30
  | 'pl-import'        // PLデータ取込 +80
  | 'legal-check';     // リーガルチェック実行 +40

export const XP_VALUES: Record<XpEvent, number> = {
  'task-done': 50,
  'project-done': 200,
  'invoice-paid': 100,
  'invoice-created': 30,
  'pl-import': 80,
  'legal-check': 40,
};

export const XP_LABELS: Record<XpEvent, string> = {
  'task-done': 'タスク完了',
  'project-done': 'プロジェクト完了',
  'invoice-paid': '入金確認',
  'invoice-created': '書類作成',
  'pl-import': 'データ取込',
  'legal-check': '法務チェック',
};

export interface Badge {
  id: string;
  name: string;
  icon: string;
  desc: string;
  earnedAt?: string;
}

export const BADGE_DEFS: Badge[] = [
  { id: 'first-import',   icon: '📊', name: 'データドリブン',     desc: '初めてPLデータを取り込んだ' },
  { id: 'first-invoice',  icon: '🧾', name: 'ファーストキャッシュ', desc: '初めて書類を作成した' },
  { id: 'first-paid',     icon: '💰', name: '入金の錬金術師',     desc: '初めて入金を記録した' },
  { id: 'task-10',        icon: '⚡', name: '実行力の鬼',         desc: 'タスクを10件完了した' },
  { id: 'task-50',        icon: '🏆', name: '完遂マスター',       desc: 'タスクを50件完了した' },
  { id: 'streak-3',       icon: '🔥', name: '3日連続ログイン',    desc: '3日連続で操作した' },
  { id: 'streak-7',       icon: '🌟', name: '週間皆勤賞',         desc: '7日連続で操作した' },
  { id: 'legal-5',        icon: '⚖️', name: 'リーガルガーディアン', desc: 'リーガルチェックを5回実行した' },
  { id: 'level-5',        icon: '👑', name: '経営の風格',         desc: 'レベル5に到達した' },
  { id: 'level-10',       icon: '💎', name: '伝説のCEO',          desc: 'レベル10に到達した' },
];

// レベル称号（レベル1〜）
export const LEVEL_TITLES = [
  '見習い経営者',   // Lv1
  '駆け出しCEO',    // Lv2
  '成長企業の顔',   // Lv3
  '敏腕マネージャー', // Lv4
  '戦略家',         // Lv5
  '事業拡大の達人', // Lv6
  'マーケットの支配者', // Lv7
  'ビジョナリー',   // Lv8
  '業界のカリスマ', // Lv9
  '伝説のCEO',      // Lv10+
];

export interface GameState {
  xp: number;
  counts: Partial<Record<XpEvent, number>>;
  badges: Badge[];
  streak: number;
  lastActiveDate: string; // YYYY-MM-DD
}

const KEY = 'imadoki-game';

export function loadGame(): GameState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { xp: 0, counts: {}, badges: [], streak: 0, lastActiveDate: '' };
}

function saveGame(state: GameState) {
  localStorage.setItem(KEY, JSON.stringify(state));
  window.dispatchEvent(new Event('imadoki-game-updated'));
}

// レベル: Lv n に必要な累計XP = 100 * n * (n - 1) / 2 * 1.0 （Lv2=100, Lv3=300, Lv4=600, Lv5=1000...）
export function levelFromXp(xp: number): { level: number; currentXp: number; nextLevelXp: number; title: string } {
  let level = 1;
  let threshold = 0;
  let step = 100;
  while (xp >= threshold + step) {
    threshold += step;
    level += 1;
    step = level * 100;
  }
  return {
    level,
    currentXp: xp - threshold,
    nextLevelXp: step,
    title: LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)],
  };
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function checkBadges(state: GameState): Badge[] {
  const earned: Badge[] = [];
  const has = (id: string) => state.badges.some(b => b.id === id);
  const award = (id: string) => {
    if (has(id)) return;
    const def = BADGE_DEFS.find(b => b.id === id);
    if (def) {
      const badge = { ...def, earnedAt: new Date().toISOString() };
      state.badges.push(badge);
      earned.push(badge);
    }
  };

  if ((state.counts['pl-import'] ?? 0) >= 1) award('first-import');
  if ((state.counts['invoice-created'] ?? 0) >= 1) award('first-invoice');
  if ((state.counts['invoice-paid'] ?? 0) >= 1) award('first-paid');
  if ((state.counts['task-done'] ?? 0) >= 10) award('task-10');
  if ((state.counts['task-done'] ?? 0) >= 50) award('task-50');
  if (state.streak >= 3) award('streak-3');
  if (state.streak >= 7) award('streak-7');
  if ((state.counts['legal-check'] ?? 0) >= 5) award('legal-5');
  const { level } = levelFromXp(state.xp);
  if (level >= 5) award('level-5');
  if (level >= 10) award('level-10');
  return earned;
}

/** XPを加算し、ストリーク更新・バッジ判定・トーストイベント発火まで行う */
export function addXp(event: XpEvent): { gained: number; newBadges: Badge[]; levelUp: boolean } {
  const state = loadGame();
  const before = levelFromXp(state.xp).level;

  // ストリーク更新
  const today = todayStr();
  if (state.lastActiveDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    state.streak = state.lastActiveDate === yesterday ? state.streak + 1 : 1;
    state.lastActiveDate = today;
  }

  const gained = XP_VALUES[event];
  state.xp += gained;
  state.counts[event] = (state.counts[event] ?? 0) + 1;

  const newBadges = checkBadges(state);
  const after = levelFromXp(state.xp).level;
  const levelUp = after > before;

  saveGame(state);

  // トースト通知イベント（ClientLayoutが購読）
  window.dispatchEvent(new CustomEvent('imadoki-xp-gain', {
    detail: { gained, label: XP_LABELS[event], newBadges, levelUp, level: after },
  }));

  return { gained, newBadges, levelUp };
}
