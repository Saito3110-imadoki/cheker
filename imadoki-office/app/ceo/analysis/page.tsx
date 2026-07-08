'use client';

import { useState, useEffect } from 'react';
import { CompanyData, ActionItem } from '@/lib/ceo-types';

const categoryConfig = {
  sales: { label: '営業', icon: '💼', color: '#06b6d4' },
  marketing: { label: 'マーケ', icon: '📣', color: '#a855f7' },
  hiring: { label: '採用', icon: '🤝', color: '#22c55e' },
  finance: { label: '財務', icon: '💰', color: '#f59e0b' },
  operations: { label: '運営', icon: '⚙️', color: '#6366f1' },
};

const priorityConfig = {
  high: { label: '高', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  medium: { label: '中', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  low: { label: '低', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
};

interface AnalysisResult {
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

export default function AnalysisPage() {
  const [data, setData] = useState<CompanyData | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('imadoki-company-data');
    if (stored) {
      const parsed: CompanyData = JSON.parse(stored);
      setData(parsed);
      setActionItems(parsed.actionItems || []);
    }
  }, []);

  const runAnalysis = async () => {
    if (!data) return;
    setLoading(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Analysis failed');
      const analysisResult: AnalysisResult = await res.json();
      setResult(analysisResult);

      const newItems: ActionItem[] = analysisResult.actions.map((a, i) => ({
        ...a,
        id: `action-${Date.now()}-${i}`,
        status: 'pending',
      }));
      setActionItems(newItems);

      const updated: CompanyData = { ...data, actionItems: newItems, lastAnalyzedAt: new Date().toISOString() };
      localStorage.setItem('imadoki-company-data', JSON.stringify(updated));
    } catch {
      alert('分析に失敗しました。データを確認してください。');
    }
    setLoading(false);
  };

  const approve = (id: string) => {
    const updated = actionItems.map(a =>
      a.id === id ? { ...a, status: 'approved' as const, approvedAt: new Date().toISOString() } : a
    );
    setActionItems(updated);
    saveActions(updated);
  };

  const reject = (id: string) => {
    const updated = actionItems.map(a =>
      a.id === id ? { ...a, status: 'rejected' as const, rejectedReason: rejectReason } : a
    );
    setActionItems(updated);
    saveActions(updated);
    setRejectModal(null);
    setRejectReason('');
  };

  const markDone = (id: string) => {
    const updated = actionItems.map(a => a.id === id ? { ...a, status: 'done' as const } : a);
    setActionItems(updated);
    saveActions(updated);
  };

  const saveActions = (items: ActionItem[]) => {
    const stored = localStorage.getItem('imadoki-company-data');
    if (stored) {
      const parsed = JSON.parse(stored);
      localStorage.setItem('imadoki-company-data', JSON.stringify({ ...parsed, actionItems: items }));
    }
  };

  const noData = !data || (data.monthlyPL.length === 0 && data.clients.length === 0);

  const riskColor = { low: '#22c55e', medium: '#f59e0b', high: '#ef4444' };
  const insightColor = { positive: '#22c55e', negative: '#ef4444', warning: '#f59e0b' };
  const insightIcon = { positive: '✅', negative: '⚠️', warning: '🔶' };

  const approvedCount = actionItems.filter(a => a.status === 'approved').length;
  const pendingCount = actionItems.filter(a => a.status === 'pending').length;
  const doneCount = actionItems.filter(a => a.status === 'done').length;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">🔍 AI経営分析・承認</h1>
          <p className="text-sm mt-1" style={{ color: '#6b7280' }}>実データをAIが分析し、ネクストアクションを社長が承認する</p>
        </div>
        <div className="flex gap-3">
          <a href="/ceo/data" className="text-xs px-3 py-2 rounded-lg transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.08)' }}>
            📥 データ編集
          </a>
          <button
            onClick={runAnalysis}
            disabled={loading || noData}
            className="text-sm px-5 py-2 rounded-lg font-semibold text-white transition-all"
            style={{
              background: loading || noData ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg, #6366f1, #a855f7)',
              opacity: noData ? 0.5 : 1,
            }}
          >
            {loading ? '⏳ AI分析中...' : '🔍 AI分析を実行'}
          </button>
        </div>
      </div>

      {noData && (
        <div className="glass rounded-xl p-12 text-center">
          <div className="text-5xl mb-4">📥</div>
          <p className="text-white font-semibold mb-2">データがありません</p>
          <p className="text-sm mb-5" style={{ color: '#6b7280' }}>まず売上・クライアントデータを入力してください</p>
          <a href="/ceo/data" className="inline-block px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
            データ入力ページへ →
          </a>
        </div>
      )}

      {!noData && !result && !loading && (
        <div className="glass rounded-xl p-12 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-white font-semibold mb-2">データが読み込まれています</p>
          <p className="text-sm mb-5" style={{ color: '#6b7280' }}>
            P&L {data?.monthlyPL.length}ヶ月分 / クライアント {data?.clients.length}社
          </p>
          <button onClick={runAnalysis}
            className="px-6 py-3 rounded-lg text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
            🔍 AI分析を実行する
          </button>
        </div>
      )}

      {loading && (
        <div className="glass rounded-xl p-12 text-center">
          <div className="text-5xl mb-4 animate-pulse">🤖</div>
          <p className="text-white font-semibold mb-2">AIが経営データを分析中...</p>
          <p className="text-sm" style={{ color: '#6b7280' }}>売上トレンド・クライアントリスク・成長機会を評価しています</p>
        </div>
      )}

      {result && (
        <div className="space-y-5">
          {/* Summary */}
          <div className="glass rounded-xl p-5" style={{ border: '1px solid rgba(99,102,241,0.2)' }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">🤖</span>
              <span className="text-sm font-bold text-white">AI経営サマリー</span>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full"
                style={{ background: `${riskColor[result.metrics.riskLevel]}22`, color: riskColor[result.metrics.riskLevel] }}>
                リスク: {result.metrics.riskLevel === 'low' ? '低' : result.metrics.riskLevel === 'medium' ? '中' : '高'}
              </span>
            </div>
            <p className="text-sm leading-relaxed mb-4" style={{ color: '#d1d5db' }}>{result.summary}</p>

            {/* Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              {[
                { label: '粗利率', value: `${result.metrics.grossMargin}%`, color: result.metrics.grossMargin > 50 ? '#22c55e' : '#f59e0b' },
                { label: '営業利益率', value: `${result.metrics.operatingMargin}%`, color: result.metrics.operatingMargin > 15 ? '#22c55e' : '#f59e0b' },
                { label: '売上成長率', value: `${result.metrics.revenueGrowth > 0 ? '+' : ''}${result.metrics.revenueGrowth}%`, color: result.metrics.revenueGrowth > 0 ? '#22c55e' : '#ef4444' },
                { label: '最大CL比率', value: result.metrics.clientConcentration, color: '#9ca3af' },
              ].map(m => (
                <div key={m.label} className="rounded-lg p-3 text-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div className="text-xl font-bold" style={{ color: m.color }}>{m.value}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{m.label}</div>
                </div>
              ))}
            </div>

            {/* Insights */}
            <div className="space-y-2">
              {result.insights.map((ins, i) => (
                <div key={i} className="flex items-start gap-2 text-xs p-2 rounded-lg"
                  style={{ background: `${insightColor[ins.type]}11`, border: `1px solid ${insightColor[ins.type]}22` }}>
                  <span>{insightIcon[ins.type]}</span>
                  <span style={{ color: '#d1d5db' }}>{ins.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action items */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-sm font-bold text-white">📋 AIが提案するネクストアクション</h2>
              <div className="flex gap-2 ml-auto text-xs">
                <span className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>承認待ち {pendingCount}</span>
                <span className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>承認済み {approvedCount}</span>
                <span className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}>完了 {doneCount}</span>
              </div>
            </div>

            <div className="space-y-3">
              {actionItems.map(action => {
                const cat = categoryConfig[action.category];
                const pri = priorityConfig[action.priority];
                return (
                  <div key={action.id} className="glass rounded-xl p-4"
                    style={{
                      border: action.status === 'approved' ? '1px solid rgba(34,197,94,0.3)'
                        : action.status === 'rejected' ? '1px solid rgba(239,68,68,0.2)'
                        : action.status === 'done' ? '1px solid rgba(99,102,241,0.2)'
                        : '1px solid rgba(255,255,255,0.06)',
                      opacity: action.status === 'rejected' ? 0.6 : 1,
                    }}>
                    <div className="flex items-start gap-3">
                      <div className="text-xl flex-shrink-0">{cat.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-sm font-bold text-white">{action.title}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: pri.bg, color: pri.color }}>優先度:{pri.label}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: `${cat.color}18`, color: cat.color }}>{cat.label}</span>
                          {action.status === 'approved' && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>✅ 承認済み</span>}
                          {action.status === 'rejected' && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>❌ 却下</span>}
                          {action.status === 'done' && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}>🏁 完了</span>}
                        </div>
                        <p className="text-xs mb-2" style={{ color: '#9ca3af' }}>{action.description}</p>
                        <div className="flex items-center gap-3 text-xs" style={{ color: '#6b7280' }}>
                          <span>💡 {action.expectedImpact}</span>
                          <span>📅 {action.deadline}</span>
                        </div>
                        {action.status === 'rejected' && action.rejectedReason && (
                          <p className="text-xs mt-2 px-2 py-1 rounded" style={{ background: 'rgba(239,68,68,0.08)', color: '#fca5a5' }}>
                            却下理由: {action.rejectedReason}
                          </p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 flex-shrink-0">
                        {action.status === 'pending' && (
                          <>
                            <button onClick={() => approve(action.id)}
                              className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white transition-all"
                              style={{ background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.4)', color: '#22c55e' }}>
                              ✅ 承認
                            </button>
                            <button onClick={() => setRejectModal(action.id)}
                              className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
                              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                              ❌ 却下
                            </button>
                          </>
                        )}
                        {action.status === 'approved' && (
                          <button onClick={() => markDone(action.id)}
                            className="text-xs px-3 py-1.5 rounded-lg transition-all"
                            style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8' }}>
                            🏁 完了にする
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="glass rounded-2xl p-6 max-w-md w-full" style={{ border: '1px solid rgba(239,68,68,0.3)' }}>
            <h3 className="text-sm font-bold text-white mb-3">❌ 却下理由を入力</h3>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="例：予算の都合上、来四半期に延期したい"
              rows={3}
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none resize-none mb-4"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
            <div className="flex gap-3">
              <button onClick={() => setRejectModal(null)}
                className="flex-1 py-2 rounded-lg text-sm" style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af' }}>
                キャンセル
              </button>
              <button onClick={() => reject(rejectModal)}
                className="flex-1 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ background: 'rgba(239,68,68,0.3)', border: '1px solid rgba(239,68,68,0.4)' }}>
                却下する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
