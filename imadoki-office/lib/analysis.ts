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

export function loadLastAnalysis(): SavedAnalysis | null {
  try {
    const raw = localStorage.getItem(RESULT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
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
