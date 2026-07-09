'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { members as defaultMembers, chatMessages } from '@/lib/data';
import { CompanyData } from '@/lib/ceo-types';
import { Member } from '@/lib/data';

function RevenueChart({ data }: { data: { month: string; revenue: number; operatingProfit: number }[] }) {
  if (data.length < 2) return (
    <div className="flex items-center justify-center h-32 text-sm" style={{ color: '#4b5563' }}>
      月次データが2件以上になるとグラフが表示されます
    </div>
  );

  const maxVal = Math.max(...data.map(d => d.revenue));
  const minVal = Math.min(0, ...data.map(d => d.operatingProfit));
  const range = maxVal - minVal || 1;

  const W = 560;
  const H = 140;
  const PAD = { top: 12, right: 16, bottom: 28, left: 56 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const n = data.length;
  const xOf = (i: number) => PAD.left + (i / (n - 1)) * chartW;
  const yOf = (v: number) => PAD.top + chartH - ((v - minVal) / range) * chartH;

  const revPts = data.map((d, i) => `${xOf(i)},${yOf(d.revenue)}`).join(' ');
  const profPts = data.map((d, i) => `${xOf(i)},${yOf(d.operatingProfit)}`).join(' ');
  const areaPath = `M${xOf(0)},${yOf(data[0].revenue)} ` +
    data.slice(1).map((d, i) => `L${xOf(i + 1)},${yOf(d.revenue)}`).join(' ') +
    ` L${xOf(n - 1)},${yOf(minVal)} L${xOf(0)},${yOf(minVal)} Z`;

  const yZero = yOf(0);
  const yGrids = [0, 0.25, 0.5, 0.75, 1].map(t => ({
    y: PAD.top + chartH * (1 - t),
    v: minVal + range * t,
  }));

  const fmtY = (v: number) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: '140px' }}>
      <defs>
        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {yGrids.map(({ y, v }) => (
        <g key={v}>
          <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize="9" fill="#4b5563">{fmtY(v)}</text>
        </g>
      ))}
      {/* Zero line */}
      {minVal < 0 && (
        <line x1={PAD.left} y1={yZero} x2={W - PAD.right} y2={yZero} stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3,3" />
      )}
      {/* Revenue area */}
      <path d={areaPath} fill="url(#revGrad)" />
      {/* Revenue line */}
      <polyline points={revPts} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {/* Profit line */}
      <polyline points={profPts} fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="4,2" />
      {/* X labels */}
      {data.map((d, i) => {
        const show = n <= 8 || i % Math.ceil(n / 6) === 0 || i === n - 1;
        return show ? (
          <text key={d.month} x={xOf(i)} y={H - 4} textAnchor="middle" fontSize="9" fill="#6b7280">
            {d.month.slice(2, 7)}
          </text>
        ) : null;
      })}
      {/* Dots on latest point */}
      <circle cx={xOf(n - 1)} cy={yOf(data[n - 1].revenue)} r="3" fill="#6366f1" stroke="#0f0f1a" strokeWidth="1.5" />
      <circle cx={xOf(n - 1)} cy={yOf(data[n - 1].operatingProfit)} r="2.5" fill="#22c55e" stroke="#0f0f1a" strokeWidth="1.5" />
    </svg>
  );
}

type ProjectStatus = 'active' | 'planning' | 'review' | 'completed';
interface StoredProject { id: string; name: string; client: string; status: ProjectStatus; progress: number; deadline: string; }
interface StoredTask { id: string; status: string; }

function KpiCard({ icon, label, value, sub, color }: { icon: string; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="glass glass-hover rounded-xl p-5 animate-fade-up">
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${color}22`, color }}>
          {sub}
        </span>
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm" style={{ color: '#6b7280' }}>{label}</div>
    </div>
  );
}

export default function Dashboard() {
  const [members, setMembers] = useState<Member[]>(defaultMembers);
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [lsProjects, setLsProjects] = useState<StoredProject[]>([]);
  const [lsTasks, setLsTasks] = useState<StoredTask[]>([]);
  // displayProjects / displayTasks show real data only — no fallback to samples

  useEffect(() => {
    try { const s = localStorage.getItem('imadoki-members'); if (s) setMembers(JSON.parse(s)); } catch { /* ignore */ }
    try { const s = localStorage.getItem('imadoki-company-data'); if (s) setCompanyData(JSON.parse(s)); } catch { /* ignore */ }
    try { const s = localStorage.getItem('imadoki-projects'); if (s) setLsProjects(JSON.parse(s)); } catch { /* ignore */ }
    try { const s = localStorage.getItem('imadoki-tasks'); if (s) setLsTasks(JSON.parse(s)); } catch { /* ignore */ }
  }, []);

  const activeAI = members.filter(m => m.isAI && m.status === 'online').length;

  // Derive KPIs from real data when available
  const sortedPL = companyData?.monthlyPL ? [...companyData.monthlyPL].sort((a, b) => a.month.localeCompare(b.month)) : [];
  // 未来月（受注見込み）はKPIから除外し、今月までの実績で「直近月」を決める
  const currentMonth = new Date().toISOString().slice(0, 7);
  const actualPL = sortedPL.filter(m => m.month <= currentMonth);
  const latestPL = actualPL[actualPL.length - 1] ?? sortedPL[sortedPL.length - 1];
  const prevPL = actualPL[actualPL.length - 2];
  const futureRevenue = sortedPL.filter(m => m.month > currentMonth).reduce((s, m) => s + m.revenue, 0);

  const activeProjectCount = lsProjects.filter(p => p.status === 'active').length;
  const doneTaskCount = lsTasks.filter(t => t.status === 'done').length;
  const activeClients = companyData?.clients?.filter(c => c.status === 'active') ?? [];
  const atRiskClients = companyData?.clients?.filter(c => c.status === 'at-risk') ?? [];
  // 契約クライアント: クライアント管理が未入力でも、PLインポートのクライアント別売上から集計
  const revenueClientCount = companyData?.clientRevenue?.length ?? 0;
  const clientCount = activeClients.length > 0 ? activeClients.length : revenueClientCount;

  const revenueDisplay = latestPL
    ? `¥${latestPL.revenue.toLocaleString()}`
    : '未入力';

  const revGrowthLabel = (() => {
    if (!latestPL || !prevPL || prevPL.revenue === 0) return latestPL ? `${latestPL.month.replace('-', '年')}月 実績` : 'データ入力へ';
    const growth = Math.round(((latestPL.revenue - prevPL.revenue) / prevPL.revenue) * 100);
    return `前月比${growth >= 0 ? '+' : ''}${growth}%`;
  })();

  // 原価データがない月の「利益率100%」表示は誤解を招くため、原価>0の月のみ表示
  const opMarginLabel = latestPL && latestPL.revenue > 0 && latestPL.cogs > 0
    ? `営業利益率${Math.round((latestPL.operatingProfit / latestPL.revenue) * 100)}%`
    : latestPL ? `${latestPL.month.split('-')[1]}月実績` : '';

  const clientCountLabel = activeClients.length > 0
    ? `${activeClients.length}社契約中${atRiskClients.length > 0 ? ` / リスク${atRiskClients.length}社` : ''}`
    : revenueClientCount > 0 ? '売上実績ベース' : '';

  const hasData = !!companyData && (companyData.monthlyPL.length > 0 || companyData.clients.length > 0);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 animate-fade-up">
        <div className="flex items-center gap-3 mb-2">
          <div className="text-3xl">✦</div>
          <div>
            <h1 className="text-2xl font-bold text-white">IMADOKI AI Office</h1>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>株式会社IMADOKI — AI組織管理プラットフォーム</p>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4 p-3 rounded-lg" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
          <div className="w-2 h-2 rounded-full" style={{ background: '#4ade80', boxShadow: '0 0 8px #4ade80' }} />
          <span className="text-sm" style={{ color: '#a5b4fc' }}>
            {activeAI}体のAIエージェントが稼働中 — リアルタイムでマーケティング業務を最適化しています
          </span>
        </div>
      </div>

      {/* Real data notice if no data yet */}
      {!hasData && (
        <div className="mb-5 px-4 py-3 rounded-xl flex items-center gap-3" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <span className="text-amber-400">⚠️</span>
          <span className="text-sm" style={{ color: '#fbbf24' }}>
            財務データが未入力です。
          </span>
          <Link href="/ceo/data" className="text-sm underline" style={{ color: '#a5b4fc' }}>データ入力ページ</Link>
          <span className="text-sm" style={{ color: '#fbbf24' }}>で実際の売上・クライアントを登録すると、ここに反映されます。</span>
        </div>
      )}

      {/* KPI Cards — financial */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <KpiCard icon="💰" label="直近月売上" value={revenueDisplay} sub={revGrowthLabel} color="#f59e0b" />
        <KpiCard
          icon="📈"
          label="直近月営業利益"
          value={latestPL ? `¥${latestPL.operatingProfit.toLocaleString()}` : '未入力'}
          sub={opMarginLabel || '—'}
          color={latestPL ? (latestPL.operatingProfit >= 0 ? '#22c55e' : '#ef4444') : '#6b7280'}
        />
        <KpiCard
          icon="👥"
          label="取引クライアント"
          value={companyData ? `${clientCount}社` : '未入力'}
          sub={clientCountLabel || '—'}
          color="#6366f1"
        />
        <KpiCard
          icon="📊"
          label="累計売上"
          value={companyData?.monthlyPL?.length
            ? `¥${companyData.monthlyPL.reduce((s, m) => s + m.revenue, 0).toLocaleString()}`
            : '未入力'}
          sub={futureRevenue > 0
            ? `うち受注見込み ¥${futureRevenue.toLocaleString()}`
            : companyData?.monthlyPL?.length ? `${companyData.monthlyPL.length}ヶ月分` : '—'}
          color="#a855f7"
        />
      </div>

      {/* KPI Cards — org */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard icon="🤖" label="AIエージェント" value={members.filter(m => m.isAI).length} sub="稼働中" color="#6366f1" />
        <KpiCard icon="👤" label="人間スタッフ" value={members.filter(m => !m.isAI).length} sub="メンバー" color="#ec4899" />
        <KpiCard icon="✅" label="完了タスク" value={`${doneTaskCount}件`} sub="累計" color="#22c55e" />
        <KpiCard icon="📁" label="進行中プロジェクト" value={activeProjectCount} sub="案件" color="#60a5fa" />
      </div>

      {/* Revenue Chart */}
      {sortedPL.length > 0 && (
        <div className="glass rounded-xl p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">📈 売上・営業利益 月次推移</h3>
            <div className="flex items-center gap-4 text-xs" style={{ color: '#6b7280' }}>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-5 h-0.5 rounded" style={{ background: '#6366f1' }} />売上
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-5 h-0.5 rounded" style={{ background: '#22c55e', borderTop: '1px dashed #22c55e' }} />営業利益
              </span>
            </div>
          </div>
          <RevenueChart data={sortedPL} />
        </div>
      )}

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Activity feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">💬 AIチームからの最新アクティビティ</h3>
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {chatMessages.map(msg => {
                const member = members.find(m => m.id === msg.from);
                return (
                  <div key={msg.id} className="flex gap-3 items-start">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                      style={{ background: msg.isAI ? 'rgba(99,102,241,0.15)' : 'rgba(168,85,247,0.15)' }}>
                      {member?.avatar ?? '👤'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-medium text-white">{member?.name ?? msg.from}</span>
                        {msg.isAI && (
                          <span className="text-xs px-1.5 rounded" style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}>AI</span>
                        )}
                        <span className="text-xs ml-auto" style={{ color: '#374151' }}>{msg.time}</span>
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: '#9ca3af' }}>{msg.content}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Project progress */}
          <div className="glass rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">📁 プロジェクト進捗</h3>
            {lsProjects.length === 0 ? (
              <div className="text-center py-6" style={{ color: '#4b5563' }}>
                <div className="text-2xl mb-2">📁</div>
                <p className="text-xs">プロジェクトが未登録です</p>
              </div>
            ) : (
            <div className="space-y-4">
              {lsProjects.slice(0, 5).map(p => (
                <div key={p.id}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-xs text-white font-medium truncate mr-2">{p.name}</span>
                    <span className="text-xs font-bold flex-shrink-0" style={{
                      color: p.progress > 80 ? '#22c55e' : p.progress > 50 ? '#f59e0b' : '#6366f1'
                    }}>{p.progress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full" style={{
                      width: `${p.progress}%`,
                      background: p.progress > 80 ? '#22c55e' : p.progress > 50 ? '#f59e0b' : 'linear-gradient(90deg, #6366f1, #a855f7)',
                    }} />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs" style={{ color: '#4b5563' }}>{p.client}</span>
                    <span className="text-xs" style={{ color: '#4b5563' }}>期限: {p.deadline}</span>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        </div>

        {/* AI Agent status */}
        <div className="glass rounded-xl p-5 h-fit">
          <h3 className="text-sm font-semibold text-white mb-4">🤖 AIエージェント稼働状況</h3>
          <div className="space-y-2">
            {members.filter(m => m.isAI).map(m => (
              <div key={m.id} className="flex items-center gap-3 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                  style={{ background: 'rgba(99,102,241,0.1)' }}>🤖</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-white truncate">{m.name}</div>
                  <div className="text-xs truncate" style={{ color: '#6b7280' }}>{m.department}</div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full" style={{
                    background: m.status === 'online' ? '#22c55e' : m.status === 'busy' ? '#f59e0b' : '#6b7280',
                    boxShadow: m.status === 'online' ? '0 0 6px #22c55e' : 'none',
                  }} />
                  <span className="text-xs" style={{ color: m.status === 'online' ? '#22c55e' : '#9ca3af' }}>
                    {m.status === 'online' ? '稼働中' : m.status === 'busy' ? '処理中' : 'オフ'}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-lg text-center" style={{ background: 'rgba(99,102,241,0.08)' }}>
            <div className="text-xs" style={{ color: '#818cf8' }}>AI稼働率</div>
            <div className="text-xl font-bold" style={{ color: '#a5b4fc' }}>
              {members.filter(m => m.isAI).length > 0
                ? `${Math.round((members.filter(m => m.isAI && m.status === 'online').length / members.filter(m => m.isAI).length) * 100)}%`
                : '—'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
