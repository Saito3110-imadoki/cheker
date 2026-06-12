'use client';

import { useState } from 'react';
import { members, Member } from '@/lib/data';

const statusLabel: Record<string, string> = { online: '稼働中', busy: '処理中', away: '離席中', offline: 'オフライン' };
const statusColor: Record<string, string> = { online: '#22c55e', busy: '#f59e0b', away: '#6b7280', offline: '#374151' };

function MemberDetail({ member, onClose }: { member: Member; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="glass rounded-2xl p-6 max-w-md w-full animate-fade-up" style={{ border: '1px solid rgba(99,102,241,0.3)' }}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
              style={{ background: member.isAI ? 'rgba(99,102,241,0.15)' : 'rgba(168,85,247,0.15)' }}>
              {member.avatar}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-bold text-white">{member.name}</h2>
                {member.isAI && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white' }}>AI</span>
                )}
              </div>
              <div className="text-sm" style={{ color: '#818cf8' }}>{member.role}</div>
              <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{member.department}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-xl">×</button>
        </div>

        <div className="flex items-center gap-2 mb-4 p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="w-2 h-2 rounded-full" style={{ background: statusColor[member.status], boxShadow: member.status === 'online' ? `0 0 6px ${statusColor[member.status]}` : 'none' }} />
          <span className="text-xs" style={{ color: statusColor[member.status] }}>{statusLabel[member.status]}</span>
        </div>

        <p className="text-sm leading-relaxed mb-4" style={{ color: '#9ca3af' }}>{member.description}</p>

        <div className="mb-4">
          <div className="text-xs font-semibold text-white mb-2">スキル</div>
          <div className="flex flex-wrap gap-2">
            {member.skills.map(s => (
              <span key={s} className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.2)' }}>
                {s}
              </span>
            ))}
          </div>
        </div>

        {member.aiCapabilities && (
          <div>
            <div className="text-xs font-semibold text-white mb-2">🤖 AI機能</div>
            <div className="space-y-1.5">
              {member.aiCapabilities.map(cap => (
                <div key={cap} className="flex items-center gap-2 text-xs" style={{ color: '#9ca3af' }}>
                  <span style={{ color: '#6366f1' }}>▸</span> {cap}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MembersPage() {
  const [selected, setSelected] = useState<Member | null>(null);
  const [filter, setFilter] = useState<'all' | 'ai' | 'human'>('all');
  const [deptFilter, setDeptFilter] = useState('全部署');

  const depts = ['全部署', ...Array.from(new Set(members.map(m => m.department)))];
  const filtered = members.filter(m => {
    const aiMatch = filter === 'all' || (filter === 'ai' && m.isAI) || (filter === 'human' && !m.isAI);
    const deptMatch = deptFilter === '全部署' || m.department === deptFilter;
    return aiMatch && deptMatch;
  });

  return (
    <div className="max-w-7xl mx-auto">
      {selected && <MemberDetail member={selected} onClose={() => setSelected(null)} />}

      <div className="mb-6">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">👥 メンバー</h1>
        <p className="text-sm mt-1" style={{ color: '#6b7280' }}>人間とAIエージェントが連携するチーム</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: '総メンバー', value: members.length, color: '#6366f1', icon: '👥' },
          { label: 'AIエージェント', value: members.filter(m => m.isAI).length, color: '#a855f7', icon: '🤖' },
          { label: '人間スタッフ', value: members.filter(m => !m.isAI).length, color: '#ec4899', icon: '👤' },
        ].map(s => (
          <div key={s.label} className="glass rounded-xl p-4 text-center">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-2xl font-bold text-white">{s.value}</div>
            <div className="text-xs" style={{ color: '#6b7280' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          {(['all', 'ai', 'human'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 text-xs font-medium transition-all"
              style={{
                background: filter === f ? 'rgba(99,102,241,0.2)' : 'transparent',
                color: filter === f ? '#a5b4fc' : '#6b7280',
              }}
            >
              {f === 'all' ? 'すべて' : f === 'ai' ? '🤖 AI' : '👤 人間'}
            </button>
          ))}
        </div>
        <select
          value={deptFilter}
          onChange={e => setDeptFilter(e.target.value)}
          className="text-xs px-3 py-1.5 rounded-lg outline-none"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#9ca3af' }}
        >
          {depts.map(d => <option key={d} value={d} style={{ background: '#0f0f1a' }}>{d}</option>)}
        </select>
      </div>

      {/* Members grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(m => (
          <div
            key={m.id}
            onClick={() => setSelected(m)}
            className="glass glass-hover rounded-xl p-4 cursor-pointer animate-fade-up"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ background: m.isAI ? 'rgba(99,102,241,0.12)' : 'rgba(168,85,247,0.12)' }}>
                  {m.avatar}
                </div>
                <div
                  className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                  style={{
                    borderColor: '#07070f',
                    background: statusColor[m.status],
                    boxShadow: m.status === 'online' ? `0 0 6px ${statusColor[m.status]}` : 'none',
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-sm font-semibold text-white truncate">{m.name}</span>
                  {m.isAI && (
                    <span className="text-xs px-1.5 rounded flex-shrink-0" style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}>AI</span>
                  )}
                </div>
                <div className="text-xs truncate" style={{ color: '#6b7280' }}>{m.role.split('/')[0]}</div>
                <div className="text-xs" style={{ color: '#4b5563', fontSize: '10px' }}>{m.department}</div>
              </div>
            </div>
            <p className="text-xs leading-relaxed mb-3 line-clamp-2" style={{ color: '#9ca3af' }}>{m.description}</p>
            <div className="flex flex-wrap gap-1">
              {m.skills.slice(0, 3).map(s => (
                <span key={s} className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.05)', color: '#6b7280', fontSize: '10px' }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
