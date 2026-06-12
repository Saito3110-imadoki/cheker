'use client';

import { members, Member } from '@/lib/data';

function MemberCard({ member, isRoot }: { member: Member; isRoot?: boolean }) {
  const reports = member.reports?.map(id => members.find(m => m.id === id)).filter(Boolean) as Member[];

  return (
    <div className="flex flex-col items-center">
      <div
        className="glass rounded-xl p-4 text-center cursor-pointer transition-all hover:scale-105"
        style={{
          width: isRoot ? '180px' : '148px',
          border: member.isAI ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(168,85,247,0.25)',
        }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-2xl mx-auto mb-2"
          style={{ background: member.isAI ? 'rgba(99,102,241,0.12)' : 'rgba(168,85,247,0.12)' }}
        >
          {member.avatar}
        </div>
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: member.status === 'online' ? '#22c55e' : member.status === 'busy' ? '#f59e0b' : '#6b7280',
              boxShadow: member.status === 'online' ? '0 0 5px #22c55e' : 'none',
            }}
          />
          {member.isAI && (
            <span className="text-xs px-1 rounded" style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8', fontSize: '10px' }}>AI</span>
          )}
        </div>
        <div className="text-xs font-semibold text-white leading-tight">{member.name}</div>
        <div className="text-xs mt-0.5 leading-tight" style={{ color: '#6b7280', fontSize: '10px' }}>{member.role.split('/')[0].trim()}</div>
        <div className="text-xs mt-1 px-1.5 py-0.5 rounded-full inline-block" style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af', fontSize: '9px' }}>
          {member.department}
        </div>
      </div>

      {reports.length > 0 && (
        <div className="flex flex-col items-center">
          <div className="w-px h-6" style={{ background: 'rgba(99,102,241,0.3)' }} />
          <div className="flex items-start gap-6">
            {reports.length > 1 && (
              <div
                className="absolute"
                style={{ borderTop: '1px solid rgba(99,102,241,0.3)', width: `${(reports.length - 1) * 160}px` }}
              />
            )}
            {reports.map((r, i) => (
              <div key={r.id} className="flex flex-col items-center">
                <div className="w-px h-6" style={{ background: 'rgba(99,102,241,0.3)' }} />
                <MemberCard member={r} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrgPage() {
  const ceo = members.find(m => m.id === 'ceo')!;
  const deptColors: Record<string, string> = {
    '経営': '#6366f1',
    'マーケティング戦略': '#a855f7',
    'クリエイティブ': '#ec4899',
    'デジタル広告': '#f59e0b',
    'データ分析': '#22c55e',
    '営業': '#06b6d4',
    'PR・広報': '#f97316',
    'カスタマーサクセス': '#84cc16',
  };

  const deptGroups = members.reduce<Record<string, Member[]>>((acc, m) => {
    if (!acc[m.department]) acc[m.department] = [];
    acc[m.department].push(m);
    return acc;
  }, {});

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">🌐 組織図</h1>
        <p className="text-sm mt-1" style={{ color: '#6b7280' }}>IMADOKI AI組織の全体構造</p>
      </div>

      {/* Top-down org chart */}
      <div className="glass rounded-xl p-8 mb-6 overflow-x-auto">
        <div className="flex flex-col items-center min-w-max mx-auto">
          {/* CEO */}
          <div
            className="glass rounded-xl p-5 text-center"
            style={{ width: '200px', border: '1px solid rgba(168,85,247,0.4)' }}
          >
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-3xl mx-auto mb-2"
              style={{ background: 'rgba(168,85,247,0.15)' }}>
              {ceo.avatar}
            </div>
            <div className="text-sm font-bold text-white">{ceo.name}</div>
            <div className="text-xs" style={{ color: '#a78bfa' }}>{ceo.role}</div>
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <div className="w-2 h-2 rounded-full bg-green-400" style={{ boxShadow: '0 0 5px #4ade80' }} />
              <span className="text-xs" style={{ color: '#4ade80' }}>オンライン</span>
            </div>
          </div>

          <div className="w-px h-8" style={{ background: 'rgba(99,102,241,0.3)' }} />

          {/* Direct reports */}
          <div className="flex gap-6 items-start">
            {['coo', 'cmo', 'cfo'].map((id, i) => {
              const m = members.find(x => x.id === id)!;
              const hasReports = (m.reports?.length ?? 0) > 0;
              return (
                <div key={id} className="flex flex-col items-center">
                  <div
                    className="glass rounded-xl p-4 text-center"
                    style={{ width: '160px', border: `1px solid ${m.isAI ? 'rgba(99,102,241,0.3)' : 'rgba(168,85,247,0.25)'}` }}
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl mx-auto mb-2"
                      style={{ background: m.isAI ? 'rgba(99,102,241,0.12)' : 'rgba(168,85,247,0.12)' }}>
                      {m.avatar}
                    </div>
                    {m.isAI && <span className="text-xs px-1.5 rounded mb-1 inline-block" style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}>AI</span>}
                    <div className="text-xs font-semibold text-white">{m.name}</div>
                    <div className="text-xs" style={{ color: '#6b7280', fontSize: '10px' }}>{m.role.split('/')[0]}</div>
                  </div>

                  {hasReports && (
                    <>
                      <div className="w-px h-6" style={{ background: 'rgba(99,102,241,0.3)' }} />
                      <div className="flex gap-4 items-start">
                        {m.reports!.map(rid => {
                          const r = members.find(x => x.id === rid)!;
                          if (!r) return null;
                          return (
                            <div key={rid} className="flex flex-col items-center">
                              <div className="w-px h-6" style={{ background: 'rgba(99,102,241,0.3)' }} />
                              <div
                                className="glass rounded-lg p-3 text-center"
                                style={{ width: '136px', border: `1px solid ${r.isAI ? 'rgba(99,102,241,0.25)' : 'rgba(168,85,247,0.2)'}` }}
                              >
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-base mx-auto mb-1"
                                  style={{ background: r.isAI ? 'rgba(99,102,241,0.1)' : 'rgba(168,85,247,0.1)' }}>
                                  {r.avatar}
                                </div>
                                {r.isAI && <span className="text-xs px-1 rounded mb-0.5 inline-block" style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8', fontSize: '9px' }}>AI</span>}
                                <div className="text-xs font-medium text-white" style={{ fontSize: '11px' }}>{r.name}</div>
                                <div style={{ color: '#6b7280', fontSize: '9px' }}>{r.department}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Department summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(deptGroups).map(([dept, mems]) => (
          <div key={dept} className="glass rounded-xl p-4 glass-hover">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full" style={{ background: deptColors[dept] || '#6366f1' }} />
              <div className="text-xs font-semibold text-white">{dept}</div>
            </div>
            <div className="space-y-2">
              {mems.map(m => (
                <div key={m.id} className="flex items-center gap-2">
                  <div className="text-sm">{m.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-white truncate">{m.name}</div>
                  </div>
                  {m.isAI && (
                    <span className="text-xs px-1 rounded flex-shrink-0" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', fontSize: '9px' }}>AI</span>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 pt-2 border-t text-xs" style={{ borderColor: 'rgba(255,255,255,0.05)', color: '#6b7280' }}>
              {mems.length}名 (AI: {mems.filter(m => m.isAI).length}名)
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
