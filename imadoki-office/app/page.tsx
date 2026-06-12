'use client';

import { members, projects, tasks, kpiData, chatMessages } from '@/lib/data';

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
  const activeAI = members.filter(m => m.isAI && m.status === 'online').length;

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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <KpiCard icon="🤖" label="AIエージェント" value={kpiData.aiMembers} sub="稼働中" color="#6366f1" />
        <KpiCard icon="📁" label="アクティブ案件" value={kpiData.activeProjects} sub="進行中" color="#a855f7" />
        <KpiCard icon="✅" label="完了タスク" value={`${kpiData.tasksCompleted}件`} sub="今月" color="#22c55e" />
        <KpiCard icon="💰" label="月次売上" value={kpiData.monthlyRevenue} sub="前月比+12%" color="#f59e0b" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard icon="👥" label="総メンバー数" value={members.length} sub={`AI ${kpiData.aiMembers}名含む`} color="#818cf8" />
        <KpiCard icon="🎯" label="顧客満足度" value={`${kpiData.clientSatisfaction}%`} sub="高水準維持" color="#34d399" />
        <KpiCard icon="⚡" label="処理中タスク" value={`${kpiData.tasksInProgress}件`} sub="AI自動処理" color="#fb923c" />
        <KpiCard icon="📊" label="総プロジェクト" value={kpiData.totalProjects} sub="今期" color="#60a5fa" />
      </div>

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
                      {member?.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-medium text-white">{member?.name}</span>
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
            <div className="space-y-4">
              {projects.map(p => (
                <div key={p.id}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-xs text-white font-medium truncate mr-2">{p.name}</span>
                    <span className="text-xs font-bold flex-shrink-0" style={{
                      color: p.progress > 80 ? '#22c55e' : p.progress > 50 ? '#f59e0b' : '#6366f1'
                    }}>{p.progress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${p.progress}%`,
                        background: p.progress > 80 ? '#22c55e' : p.progress > 50 ? '#f59e0b' : 'linear-gradient(90deg, #6366f1, #a855f7)',
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs" style={{ color: '#4b5563' }}>{p.client}</span>
                    <span className="text-xs" style={{ color: '#4b5563' }}>期限: {p.deadline}</span>
                  </div>
                </div>
              ))}
            </div>
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
              {Math.round((members.filter(m => m.isAI && m.status === 'online').length / members.filter(m => m.isAI).length) * 100)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
