// 財務モデル: 固定費・現金残高・キャッシュフロー予測の共通ロジック
// storage: imadoki-finance-settings / イベント: imadoki-finance-updated

export interface FixedCost {
  id: string;
  label: string;      // 例: 役員報酬、家賃、ツール代
  amount: number;     // 月額
}

export interface FinanceSettings {
  cashBalance: number;        // 現金残高
  cashBalanceAsOf: string;    // 残高の基準日 YYYY-MM-DD
  fixedCosts: FixedCost[];
  slackWebhook?: string;      // Slack Incoming Webhook URL（通知用・任意）
}

const KEY = 'imadoki-finance-settings';

export function loadFinanceSettings(): FinanceSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { cashBalance: 0, cashBalanceAsOf: '', fixedCosts: [] };
}

export function saveFinanceSettings(s: FinanceSettings) {
  localStorage.setItem(KEY, JSON.stringify(s));
  window.dispatchEvent(new Event('imadoki-finance-updated'));
}

export function totalMonthlyFixedCost(s?: FinanceSettings): number {
  const settings = s ?? loadFinanceSettings();
  return settings.fixedCosts.reduce((sum, c) => sum + c.amount, 0);
}

export interface CashflowMonth {
  month: string;      // YYYY-MM
  inflow: number;     // 入金見込み（受注見込み売上 + 未回収請求書）
  outflow: number;    // 支出見込み（原価 + 固定費）
  balance: number;    // 月末の予測現金残高
}

/**
 * 今月から`months`ヶ月分のキャッシュフロー予測。
 * 入金: 未来月のPL売上（受注見込み）+ 未入金請求書（支払期日の月に計上）
 * 支出: 未来月のPL原価 + 月額固定費
 */
export function forecastCashflow(months = 6): { forecast: CashflowMonth[]; warning: string | null; hasSettings: boolean } {
  const settings = loadFinanceSettings();
  const fixed = totalMonthlyFixedCost(settings);
  const hasSettings = settings.cashBalance > 0 || settings.fixedCosts.length > 0;

  interface PLRow { month: string; revenue: number; cogs: number }
  let monthlyPL: PLRow[] = [];
  try {
    const d = JSON.parse(localStorage.getItem('imadoki-company-data') || 'null');
    monthlyPL = d?.monthlyPL ?? [];
  } catch { /* ignore */ }

  interface Inv { status: string; dueDate?: string; total: number }
  let invoices: Inv[] = [];
  try { invoices = JSON.parse(localStorage.getItem('imadoki-invoices') || '[]'); } catch { /* ignore */ }
  const unpaid = invoices.filter(i => i.status === 'sent' || i.status === 'overdue');

  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const forecast: CashflowMonth[] = [];
  let balance = settings.cashBalance;

  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const pl = monthlyPL.find(m => m.month === month);

    // 未来月のPL売上は受注見込みとして入金予測。当月は残り分が読めないためPLをそのまま使う
    const plInflow = pl?.revenue ?? 0;
    // 未入金請求書は支払期日の月に入金予測（期日超過分は今月に回収想定）
    const invInflow = unpaid.reduce((s, inv) => {
      const dueMonth = inv.dueDate?.slice(0, 7) ?? currentMonth;
      const bucket = dueMonth < currentMonth ? currentMonth : dueMonth;
      return bucket === month ? s + inv.total : s;
    }, 0);

    const inflow = plInflow + invInflow;
    const outflow = (pl?.cogs ?? 0) + fixed;
    balance += inflow - outflow;
    forecast.push({ month, inflow, outflow, balance });
  }

  const firstNegative = forecast.find(f => f.balance < 0);
  const warning = firstNegative
    ? `${Number(firstNegative.month.slice(5, 7))}月に現金残高がマイナスになる予測です。入金の前倒しや支出の見直しを検討してください`
    : null;

  return { forecast, warning, hasSettings };
}
