'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { members as defaultMembers, chatMessages } from '@/lib/data';
import { CompanyData } from '@/lib/ceo-types';
import { Member } from '@/lib/data';
import { loadGame, levelFromXp, BADGE_DEFS } from '@/lib/gamification';

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
        {sub && (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${color}22`, color }}>
            {sub}
          </span>
        )}
      </div>
      <div className="font-bold mb-1.5" style={{ color: '#f1f5f9', fontSize: '28px', lineHeight: 1.2, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{value}</div>
      <div className="text-sm" style={{ color: '#94a3b8' }}>{label}</div>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return 'おはようございます';
  if (h >= 11 && h < 18) return 'こんにちは';
  return 'お疲れさまです';
}

// ゲーミフィケーションウィジェット
function GameWidget() {
  const [game, setGame] = useState<ReturnType<typeof loadGame> | null>(null);

  useEffect(() => {
    const calc = () => { try { setGame(loadGame()); } catch { /* ignore */ } };
    calc();
    window.addEventListener('imadoki-game-updated', calc);
    return () => window.removeEventListener('imadoki-game-updated', calc);
  }, []);

  if (!game) return null;
  const lv = levelFromXp(game.xp);
  const pct = Math.min(100, (lv.currentXp / lv.nextLevelXp) * 100);

  return (
    <div className="glass rounded-xl p-5 mb-6 animate-fade-up">
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Level + XP */}
        <div className="flex items-center gap-4 flex-1 min-w-[240px]">
          <div className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)', boxShadow: '0 4px 16px rgba(99,102,241,0.4)' }}>
            <span className="text-[10px] font-medium text-white opacity-80">Lv</span>
            <span className="text-xl font-bold text-white" style={{ lineHeight: 1 }}>{lv.level}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="font-bold" style={{ color: '#f1f5f9', fontSize: 15 }}>{lv.title}</span>
              {game.streak >= 2 && (
                <span className="text-xs font-semibold" style={{ color: '#fb923c' }}>🔥 {game.streak}日連続</span>
              )}
            </div>
            <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#6366f1,#a855f7)', boxShadow: '0 0 8px rgba(99,102,241,0.6)' }} />
            </div>
            <div className="mt-1 text-xs" style={{ color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
              次のレベルまで {lv.nextLevelXp - lv.currentXp} XP（タスク完了+50 / 入金確認+100 / データ取込+80）
            </div>
          </div>
        </div>
        {/* Badges */}
        <div className="flex items-center gap-1.5">
          {BADGE_DEFS.map(def => {
            const earned = game.badges.find(b => b.id === def.id);
            return (
              <div key={def.id} title={`${def.name} — ${def.desc}${earned ? '' : '（未獲得）'}`}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all"
                style={{
                  background: earned ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.03)',
                  border: earned ? '1px solid rgba(99,102,241,0.45)' : '1px solid rgba(255,255,255,0.06)',
                  filter: earned ? 'none' : 'grayscale(1)',
                  opacity: earned ? 1 : 0.35,
                }}>
                {def.icon}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [members, setMembers] = useState<Member[]>(defaultMembers);
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [lsProjects, setLsProjects] = useState<StoredProject[]>([]);
  const [lsTasks, setLsTasks] = useState<StoredTask[]>([]);
  const [overdueInvoices, setOverdueInvoices] = useState<{ clientName: string; total: number }[]>([]);
  // displayProjects / displayTasks show real data only — no fallback to samples

  useEffect(() => {
    try { const s = localStorage.getItem('imadoki-members'); if (s) setMembers(JSON.parse(s)); } catch { /* ignore */ }
    try { const s = localStorage.getItem('imadoki-company-data'); if (s) setCompanyData(JSON.parse(s)); } catch { /* ignore */ }
    try { const s = localStorage.getItem('imadoki-projects'); if (s) setLsProjects(JSON.parse(s)); } catch { /* ignore */ }
    try { const s = localStorage.getItem('imadoki-tasks'); if (s) setLsTasks(JSON.parse(s)); } catch { /* ignore */ }
    try {
      const invoices: { status: string; dueDate?: string; clientName: string; total: number }[] =
        JSON.parse(localStorage.getItem('imadoki-invoices') || '[]');
      const today = new Date().toISOString().slice(0, 10);
      setOverdueInvoices(invoices.filter(i =>
        i.status === 'overdue' || (i.status === 'sent' && i.dueDate && i.dueDate < today)));
    } catch { /* ignore */ }
  }, []);

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
            <h1 className="font-bold" style={{ color: '#f1f5f9', fontSize: '22px' }}>{greeting()}。今日の経営状況をまとめました</h1>
            <p style={{ color: '#94a3b8', fontSize: '13px' }}>売上・利益・クライアント・チームの動きを、ここで一目で把握できます</p>
          </div>
        </div>
        {latestPL && (
          <div className="flex items-center gap-3 mt-4 p-3 rounded-lg" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#4ade80', boxShadow: '0 0 8px #4ade80' }} />
            <span className="text-sm" style={{ color: '#a5b4fc', fontVariantNumeric: 'tabular-nums' }}>
              {latestPL.month.split('-')[1].replace(/^0/, '')}月の売上は ¥{latestPL.revenue.toLocaleString()}
              {prevPL && prevPL.revenue > 0 && `（前月比${latestPL.revenue >= prevPL.revenue ? '+' : ''}${Math.round(((latestPL.revenue - prevPL.revenue) / prevPL.revenue) * 100)}%）`}
              {futureRevenue > 0 && ` — 来月以降の受注見込みは ¥${futureRevenue.toLocaleString()} です`}
            </span>
          </div>
        )}
      </div>

      {/* Real data notice if no data yet */}
      {!hasData && (
        <div className="mb-5 px-4 py-3 rounded-xl flex items-center gap-3" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <span className="text-amber-400">⚠️</span>
          <span className="text-sm" style={{ color: '#fbbf24' }}>
            まずは財務データを登録しましょう。
          </span>
          <Link href="/ceo/data" className="text-sm underline" style={{ color: '#a5b4fc' }}>データ入力ページ</Link>
          <span className="text-sm" style={{ color: '#fbbf24' }}>で売上・クライアントを入力すると、このダッシュボードに経営指標が表示されます。</span>
        </div>
      )}

      {/* 未回収アラート */}
      {overdueInvoices.length > 0 && (
        <Link href="/finance">
          <div className="mb-5 px-4 py-3 rounded-xl flex items-center gap-3 cursor-pointer transition-all hover:opacity-90"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)' }}>
            <span>🚨</span>
            <span className="text-sm font-semibold" style={{ color: '#f87171' }}>
              支払期日を過ぎた請求書が{overdueInvoices.length}件（合計 ¥{overdueInvoices.reduce((s, i) => s + i.total, 0).toLocaleString()}）あります
            </span>
            <span className="text-xs ml-auto" style={{ color: '#fca5a5' }}>財務・書類で確認 →</span>
          </div>
        </Link>
      )}

      {/* Gamification */}
      <GameWidget />

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
        <KpiCard icon="🤖" label="AIエージェント" value={members.filter(m => m.isAI).length} sub={`${members.filter(m => m.isAI && m.status === 'online').length}体が稼働中`} color="#6366f1" />
        <KpiCard icon="👤" label="人間スタッフ" value={members.filter(m => !m.isAI).length} sub="チームの中核" color="#ec4899" />
        <KpiCard icon="✅" label="完了タスク" value={`${doneTaskCount}件`} sub="チームの実行力" color="#22c55e" />
        <KpiCard icon="📁" label="進行中プロジェクト" value={activeProjectCount} sub={activeProjectCount > 0 ? '進捗は下で確認' : 'まず案件登録を'} color="#60a5fa" />
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
              <div className="text-center py-6">
                <div className="text-2xl mb-2">📁</div>
                <p className="text-xs mb-2" style={{ color: '#64748b' }}>プロジェクトはまだありません</p>
                <Link href="/projects" className="text-xs underline" style={{ color: '#a5b4fc' }}>
                  プロジェクトページで最初の案件を登録する →
                </Link>
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
