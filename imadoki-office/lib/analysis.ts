// AI経営分析の共有ロジック — 分析ページと週次自動レポート（ダッシュボード）の両方から使う
import type { CompanyData, ActionItem } from '@/lib/ceo-types';

export interface AnalysisResult {
  summary: string;
  metrics: {
    grossMargin: number;
    operatingMargin: number;
    revenueGrowth: number;
    clientConcentration: string;
    riskLevel: 'low' | 'medium' | 'high';
  };
  insights: { type: 'positive' | 'negative' | 'warning'; text: string }[];
  actions: Omit<ActionItem, 'id' | 'status'>[];
}

export interface SavedAnalysis {
  result: AnalysisResult;
  analyzedAt: string; // ISO
}

const RESULT_KEY = 'imadoki-last-analysis';
const HISTORY_KEY = 'imadoki-analysis-history';

export function loadLastAnalysis(): SavedAnalysis | null {
  try {
    const raw = localStorage.getItem(RESULT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/** 前回（1つ前）の分析。週次レポートの「変化」表示に使う */
export function loadPrevAnalysis(): SavedAnalysis | null {
  try {
    const hist: SavedAnalysis[] = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    return hist[hist.length - 1] ?? null;
  } catch { return null; }
}

/** 前回との差分サマリー（リスク変化・粗利率変化） */
export function compareWithPrev(current: AnalysisResult): { text: string; tone: 'good' | 'bad' | 'flat' }[] {
  const prev = loadPrevAnalysis();
  if (!prev) return [];
  const out: { text: string; tone: 'good' | 'bad' | 'flat' }[] = [];
  const riskRank = { low: 0, medium: 1, high: 2 };
  const riskLabel = { low: '低', medium: '中', high: '高' };
  const rc = riskRank[current.metrics.riskLevel] - riskRank[prev.result.metrics.riskLevel];
  if (rc !== 0) {
    out.push({
      text: `リスクレベルが「${riskLabel[prev.result.metrics.riskLevel]}」→「${riskLabel[current.metrics.riskLevel]}」に${rc > 0 ? '悪化' : '改善'}`,
      tone: rc > 0 ? 'bad' : 'good',
    });
  }
  const gmDelta = current.metrics.grossMargin - prev.result.metrics.grossMargin;
  if (Math.abs(gmDelta) >= 1) {
    out.push({
      text: `粗利率が${Math.abs(gmDelta).toFixed(0)}pt${gmDelta > 0 ? '改善' : '悪化'}（${prev.result.metrics.grossMargin}%→${current.metrics.grossMargin}%）`,
      tone: gmDelta > 0 ? 'good' : 'bad',
    });
  }
  if (out.length === 0) out.push({ text: '前回から大きな変化はありません', tone: 'flat' });
  return out;
}

export function hasAnalyzableData(): boolean {
  try {
    const data: CompanyData = JSON.parse(localStorage.getItem('imadoki-company-data') || 'null');
    if (!data) return false;
    return data.monthlyPL.length > 0 || data.clients.length > 0 || (data.clientRevenue?.length ?? 0) > 0;
  } catch { return false; }
}

export function isAnalysisStale(days = 7): boolean {
  const last = loadLastAnalysis();
  if (!last) return true;
  return Date.now() - new Date(last.analyzedAt).getTime() > days * 86400000;
}

/** 分析を実行し、結果・アクションアイテムをlocalStorageへ保存する（両画面共通） */
export async function runAnalysisAndSave(): Promise<AnalysisResult> {
  const data: CompanyData = JSON.parse(localStorage.getItem('imadoki-company-data') || 'null');
  if (!data) throw new Error('経営データがありません');
  let invoices: unknown[] = [];
  try { invoices = JSON.parse(localStorage.getItem('imadoki-invoices') || '[]'); } catch { /* ignore */ }

  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, invoices }),
  });
  if (!res.ok) throw new Error('Analysis failed');
  const result: AnalysisResult = await res.json();

  // 今回の結果を保存する前に、前回結果を履歴へ退避（直近12件・前週比較用）
  const prevSaved = loadLastAnalysis();
  if (prevSaved) {
    try {
      const hist: SavedAnalysis[] = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      hist.push(prevSaved);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(hist.slice(-12)));
    } catch { /* ignore */ }
  }

  // 結果を永続化（リロードしても消えない）
  localStorage.setItem(RESULT_KEY, JSON.stringify({ result, analyzedAt: new Date().toISOString() } satisfies SavedAnalysis));

  // 提案アクションを承認待ちとして登録
  const newItems: ActionItem[] = result.actions.map((a, i) => ({
    ...a,
    id: `action-${Date.now()}-${i}`,
    status: 'pending' as const,
  }));
  const updated: CompanyData = { ...data, actionItems: newItems, lastAnalyzedAt: new Date().toISOString() };
  localStorage.setItem('imadoki-company-data', JSON.stringify(updated));

  window.dispatchEvent(new Event('imadoki-analysis-updated'));
  return result;
}
