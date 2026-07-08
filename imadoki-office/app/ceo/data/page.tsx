'use client';

import { useState, useEffect } from 'react';
import { CompanyData, MonthlyPL, Client } from '@/lib/ceo-types';

const emptyPL = (): MonthlyPL => {
  const now = new Date();
  return {
    month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    revenue: 0, cogs: 0, grossProfit: 0, sgaExpenses: 0, operatingProfit: 0, notes: '',
  };
};

const emptyClient = (): Client => ({
  id: `c-${Date.now()}`,
  name: '', monthlyFee: 0, services: [], startDate: '', status: 'active', notes: '',
});

const serviceOptions = ['マーケ支援', '広告運用代行', 'SNS運用', 'WEB制作', 'コンサル', 'その他'];
const statusConfig = {
  active: { label: '契約中', color: '#22c55e' },
  'at-risk': { label: 'リスクあり', color: '#f59e0b' },
  churned: { label: '解約', color: '#ef4444' },
  negotiating: { label: '交渉中', color: '#6366f1' },
};

function calcPL(pl: MonthlyPL): MonthlyPL {
  const grossProfit = pl.revenue - pl.cogs;
  const operatingProfit = grossProfit - pl.sgaExpenses;
  return { ...pl, grossProfit, operatingProfit };
}

export default function DataPage() {
  const [data, setData] = useState<CompanyData>({ monthlyPL: [], clients: [], actionItems: [] });
  const [activeTab, setActiveTab] = useState<'pl' | 'clients'>('pl');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('imadoki-company-data');
    if (stored) setData(JSON.parse(stored));
  }, []);

  const save = (newData: CompanyData) => {
    localStorage.setItem('imadoki-company-data', JSON.stringify(newData));
    setData(newData);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // P&L
  const addPL = () => save({ ...data, monthlyPL: [...data.monthlyPL, emptyPL()] });
  const updatePL = (i: number, field: keyof MonthlyPL, value: string | number) => {
    const updated = data.monthlyPL.map((pl, idx) => idx === i ? calcPL({ ...pl, [field]: value }) : pl);
    save({ ...data, monthlyPL: updated });
  };
  const deletePL = (i: number) => save({ ...data, monthlyPL: data.monthlyPL.filter((_, idx) => idx !== i) });

  // Clients
  const addClient = () => save({ ...data, clients: [...data.clients, emptyClient()] });
  const updateClient = (i: number, field: keyof Client, value: string | number | string[]) => {
    const updated = data.clients.map((c, idx) => idx === i ? { ...c, [field]: value } : c);
    save({ ...data, clients: updated });
  };
  const deleteClient = (i: number) => save({ ...data, clients: data.clients.filter((_, idx) => idx !== i) });

  const toggleService = (clientIdx: number, service: string) => {
    const client = data.clients[clientIdx];
    const services = client.services.includes(service)
      ? client.services.filter(s => s !== service)
      : [...client.services, service];
    updateClient(clientIdx, 'services', services);
  };

  const totalRevenue = data.clients.filter(c => c.status === 'active').reduce((s, c) => s + c.monthlyFee, 0);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">📥 経営データ入力</h1>
          <p className="text-sm mt-1" style={{ color: '#6b7280' }}>実際の売上・クライアント情報を入力してAI分析に活用</p>
        </div>
        {saved && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}>
            <span className="text-xs text-green-400">✅ 保存しました</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {[{ id: 'pl', label: '📊 月次P&L' }, { id: 'clients', label: '👥 クライアント一覧' }].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'pl' | 'clients')}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab === tab.id ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
              color: activeTab === tab.id ? '#a5b4fc' : '#6b7280',
              border: `1px solid ${activeTab === tab.id ? 'rgba(99,102,241,0.4)' : 'transparent'}`,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* P&L Tab */}
      {activeTab === 'pl' && (
        <div className="glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white">月次損益計算書</h2>
            <button onClick={addPL} className="text-xs px-3 py-1.5 rounded-lg text-white" style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)' }}>
              + 月を追加
            </button>
          </div>

          {data.monthlyPL.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📊</div>
              <p className="text-sm mb-4" style={{ color: '#6b7280' }}>月次データを追加してください</p>
              <button onClick={addPL} className="px-4 py-2 rounded-lg text-sm text-white" style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
                最初の月を追加
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ color: '#6b7280' }}>
                    <th className="text-left py-2 pr-3">月</th>
                    <th className="text-right py-2 pr-3">売上</th>
                    <th className="text-right py-2 pr-3">原価</th>
                    <th className="text-right py-2 pr-3">粗利</th>
                    <th className="text-right py-2 pr-3">販管費</th>
                    <th className="text-right py-2 pr-3">営業利益</th>
                    <th className="text-right py-2 pr-3">粗利率</th>
                    <th className="text-left py-2 pr-3">メモ</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.monthlyPL.map((pl, i) => (
                    <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <td className="py-2 pr-3">
                        <input type="month" value={pl.month} onChange={e => updatePL(i, 'month', e.target.value)}
                          className="bg-transparent text-white outline-none w-32" />
                      </td>
                      {(['revenue', 'cogs', 'sgaExpenses'] as const).map(field => (
                        <td key={field} className="py-2 pr-3 text-right">
                          <input
                            type="number"
                            value={pl[field] || ''}
                            onChange={e => updatePL(i, field, Number(e.target.value))}
                            className="text-right bg-transparent text-white outline-none w-24 border-b"
                            style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                            placeholder="0"
                          />
                        </td>
                      ))}
                      <td className="py-2 pr-3 text-right font-medium" style={{ color: pl.grossProfit >= 0 ? '#22c55e' : '#ef4444' }}>
                        ¥{pl.grossProfit.toLocaleString()}
                      </td>
                      <td className="py-2 pr-3 text-right font-bold" style={{ color: pl.operatingProfit >= 0 ? '#22c55e' : '#ef4444' }}>
                        ¥{pl.operatingProfit.toLocaleString()}
                      </td>
                      <td className="py-2 pr-3 text-right" style={{ color: '#9ca3af' }}>
                        {pl.revenue > 0 ? `${Math.round((pl.grossProfit / pl.revenue) * 100)}%` : '-'}
                      </td>
                      <td className="py-2 pr-3">
                        <input value={pl.notes} onChange={e => updatePL(i, 'notes', e.target.value)}
                          className="bg-transparent text-white outline-none w-32 border-b text-xs"
                          style={{ borderColor: 'rgba(255,255,255,0.08)', color: '#9ca3af' }}
                          placeholder="メモ" />
                      </td>
                      <td className="py-2">
                        <button onClick={() => deletePL(i)} className="text-red-500 hover:text-red-400 text-xs">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Clients Tab */}
      {activeTab === 'clients' && (
        <div>
          <div className="glass rounded-xl p-4 mb-4 flex items-center justify-between">
            <div>
              <span className="text-xs" style={{ color: '#6b7280' }}>契約中クライアント月次合計</span>
              <div className="text-xl font-bold text-white">¥{totalRevenue.toLocaleString()}</div>
            </div>
            <button onClick={addClient} className="text-xs px-3 py-1.5 rounded-lg text-white" style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)' }}>
              + クライアント追加
            </button>
          </div>

          {data.clients.length === 0 ? (
            <div className="glass rounded-xl text-center py-12">
              <div className="text-4xl mb-3">👥</div>
              <p className="text-sm mb-4" style={{ color: '#6b7280' }}>クライアントを追加してください</p>
              <button onClick={addClient} className="px-4 py-2 rounded-lg text-sm text-white" style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
                最初のクライアントを追加
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {data.clients.map((client, i) => (
                <div key={client.id} className="glass rounded-xl p-4">
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-3">
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: '#6b7280' }}>クライアント名</label>
                      <input
                        value={client.name}
                        onChange={e => updateClient(i, 'name', e.target.value)}
                        placeholder="株式会社〇〇"
                        className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                      />
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: '#6b7280' }}>月額（円）</label>
                      <input
                        type="number"
                        value={client.monthlyFee || ''}
                        onChange={e => updateClient(i, 'monthlyFee', Number(e.target.value))}
                        placeholder="300000"
                        className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                      />
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: '#6b7280' }}>契約開始</label>
                      <input
                        type="month"
                        value={client.startDate}
                        onChange={e => updateClient(i, 'startDate', e.target.value)}
                        className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                      />
                    </div>
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: '#6b7280' }}>ステータス</label>
                      <select
                        value={client.status}
                        onChange={e => updateClient(i, 'status', e.target.value)}
                        className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: statusConfig[client.status].color }}
                      >
                        {Object.entries(statusConfig).map(([key, cfg]) => (
                          <option key={key} value={key} style={{ background: '#0f0f1a', color: cfg.color }}>{cfg.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="text-xs mb-1.5 block" style={{ color: '#6b7280' }}>サービス種別</label>
                    <div className="flex flex-wrap gap-2">
                      {serviceOptions.map(s => (
                        <button
                          key={s}
                          onClick={() => toggleService(i, s)}
                          className="text-xs px-2.5 py-1 rounded-lg transition-all"
                          style={{
                            background: client.services.includes(s) ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                            color: client.services.includes(s) ? '#a5b4fc' : '#6b7280',
                            border: `1px solid ${client.services.includes(s) ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.06)'}`,
                          }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="text-xs mb-1 block" style={{ color: '#6b7280' }}>メモ・特記事項</label>
                      <input
                        value={client.notes}
                        onChange={e => updateClient(i, 'notes', e.target.value)}
                        placeholder="契約更新時期、課題など..."
                        className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                      />
                    </div>
                    <button onClick={() => deleteClient(i)} className="px-3 py-2 rounded-lg text-xs text-red-400 hover:text-red-300 transition-colors"
                      style={{ border: '1px solid rgba(239,68,68,0.2)' }}>
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CTA */}
      {(data.monthlyPL.length > 0 || data.clients.length > 0) && (
        <div className="mt-6 p-4 rounded-xl text-center" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
          <p className="text-sm mb-3" style={{ color: '#818cf8' }}>
            データ入力が完了したら、AI分析を実行して社長室で承認ワークフローを開始できます
          </p>
          <a href="/ceo/analysis" className="inline-block px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
            🔍 AI分析・承認ページへ →
          </a>
        </div>
      )}
    </div>
  );
}
