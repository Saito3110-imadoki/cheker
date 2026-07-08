'use client';

import { useState, useEffect } from 'react';
import { members as defaultMembers, Member, Department } from '@/lib/data';

const STORAGE_KEY = 'imadoki-members';

const statusLabel: Record<string, string> = { online: '稼働中', busy: '処理中', away: '離席中', offline: 'オフライン' };
const statusColor: Record<string, string> = { online: '#22c55e', busy: '#f59e0b', away: '#6b7280', offline: '#374151' };

const departments: Department[] = ['経営', 'マーケティング戦略', 'クリエイティブ', 'デジタル広告', 'データ分析', '営業', 'PR・広報', 'カスタマーサクセス'];
const avatarOptions = ['👩‍💼', '👨‍💼', '👩‍🎨', '👨‍🎨', '👩‍💻', '👨‍💻', '👩‍🔬', '👨‍🔬', '🤖', '👩‍📊', '👨‍📊'];

const emptyMember = (): Omit<Member, 'id'> => ({
  name: '',
  nameEn: '',
  role: '',
  department: '経営',
  avatar: '👩‍💼',
  isAI: false,
  status: 'online',
  skills: [],
  description: '',
  aiCapabilities: [],
});

function MemberForm({
  initial,
  onSave,
  onCancel,
  title,
}: {
  initial: Omit<Member, 'id'>;
  onSave: (m: Omit<Member, 'id'>) => void;
  onCancel: () => void;
  title: string;
}) {
  const [form, setForm] = useState(initial);
  const [skillInput, setSkillInput] = useState(initial.skills.join(', '));
  const [capInput, setCapInput] = useState((initial.aiCapabilities ?? []).join(', '));

  const set = (field: keyof typeof form, value: unknown) => setForm(f => ({ ...f, [field]: value }));

  const handleSave = () => {
    if (!form.name.trim() || !form.role.trim()) return;
    onSave({
      ...form,
      skills: skillInput.split(',').map(s => s.trim()).filter(Boolean),
      aiCapabilities: form.isAI ? capInput.split(',').map(s => s.trim()).filter(Boolean) : [],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="glass rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-up" style={{ border: '1px solid rgba(99,102,241,0.3)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-white">{title}</h2>
          <button onClick={onCancel} className="text-gray-500 hover:text-white text-xl">×</button>
        </div>

        <div className="space-y-4">
          {/* Avatar & AI toggle */}
          <div className="flex gap-3 items-center flex-wrap">
            <div>
              <label className="text-xs mb-1 block" style={{ color: '#6b7280' }}>アバター</label>
              <select value={form.avatar} onChange={e => set('avatar', e.target.value)}
                className="rounded-lg px-2 py-2 text-xl outline-none" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {avatarOptions.map(a => <option key={a} value={a} style={{ background: '#0f0f1a' }}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: '#6b7280' }}>種別</label>
              <div className="flex gap-2">
                {[false, true].map(ai => (
                  <button key={String(ai)} onClick={() => set('isAI', ai)}
                    className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: form.isAI === ai ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.05)',
                      color: form.isAI === ai ? '#a5b4fc' : '#6b7280',
                      border: `1px solid ${form.isAI === ai ? 'rgba(99,102,241,0.5)' : 'transparent'}`,
                    }}>
                    {ai ? '🤖 AI' : '👤 人間'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: '#6b7280' }}>ステータス</label>
              <select value={form.status} onChange={e => set('status', e.target.value as Member['status'])}
                className="rounded-lg px-2 py-1.5 text-xs outline-none" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: statusColor[form.status] }}>
                {Object.entries(statusLabel).map(([k, v]) => (
                  <option key={k} value={k} style={{ background: '#0f0f1a', color: statusColor[k] }}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Name & Role */}
          {[
            { label: '名前 *', key: 'name' as const, placeholder: '例：今時 花子' },
            { label: '役職 *', key: 'role' as const, placeholder: '例：マーケティングマネージャー' },
            { label: '英語名', key: 'nameEn' as const, placeholder: '例：Hanako Imadoki' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs mb-1 block" style={{ color: '#6b7280' }}>{f.label}</label>
              <input value={form[f.key] as string} onChange={e => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
          ))}

          {/* Department */}
          <div>
            <label className="text-xs mb-1 block" style={{ color: '#6b7280' }}>部署</label>
            <select value={form.department} onChange={e => set('department', e.target.value as Department)}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#d1d5db' }}>
              {departments.map(d => <option key={d} value={d} style={{ background: '#0f0f1a' }}>{d}</option>)}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs mb-1 block" style={{ color: '#6b7280' }}>説明・プロフィール</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={2} placeholder="役割や経歴など..."
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none resize-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>

          {/* Skills */}
          <div>
            <label className="text-xs mb-1 block" style={{ color: '#6b7280' }}>スキル（カンマ区切り）</label>
            <input value={skillInput} onChange={e => setSkillInput(e.target.value)}
              placeholder="例：マーケ戦略, SNS運用, データ分析"
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>

          {/* AI capabilities */}
          {form.isAI && (
            <div>
              <label className="text-xs mb-1 block" style={{ color: '#6b7280' }}>AI機能（カンマ区切り）</label>
              <input value={capInput} onChange={e => setCapInput(e.target.value)}
                placeholder="例：レポート自動生成, 異常検知, 予測分析"
                className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={handleSave}
            disabled={!form.name.trim() || !form.role.trim()}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', opacity: !form.name.trim() || !form.role.trim() ? 0.5 : 1 }}>
            保存する
          </button>
          <button onClick={onCancel} className="px-5 py-2.5 rounded-xl text-sm"
            style={{ background: 'rgba(255,255,255,0.05)', color: '#6b7280' }}>
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}

function MemberDetail({ member, onClose, onEdit, onDelete }: {
  member: Member;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
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

        {member.description && <p className="text-sm leading-relaxed mb-4" style={{ color: '#9ca3af' }}>{member.description}</p>}

        {member.skills.length > 0 && (
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
        )}

        {member.aiCapabilities && member.aiCapabilities.length > 0 && (
          <div className="mb-4">
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

        <div className="flex gap-2 mt-4">
          <button onClick={onEdit} className="flex-1 py-2 rounded-xl text-xs font-medium"
            style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
            ✏️ 編集
          </button>
          <button onClick={onDelete} className="px-4 py-2 rounded-xl text-xs font-medium"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
            🗑️ 削除
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>(defaultMembers);
  const [selected, setSelected] = useState<Member | null>(null);
  const [editing, setEditing] = useState<Member | null>(null);
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<'all' | 'ai' | 'human'>('all');
  const [deptFilter, setDeptFilter] = useState('全部署');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try { setMembers(JSON.parse(stored)); } catch { /* ignore */ }
    }
  }, []);

  const persist = (next: Member[]) => {
    setMembers(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const handleAdd = (form: Omit<Member, 'id'>) => {
    const next = [...members, { ...form, id: `m-${Date.now()}` }];
    persist(next);
    setAdding(false);
  };

  const handleEdit = (form: Omit<Member, 'id'>) => {
    if (!editing) return;
    const next = members.map(m => m.id === editing.id ? { ...form, id: m.id } : m);
    persist(next);
    setEditing(null);
    setSelected(null);
  };

  const handleDelete = (id: string) => {
    if (!confirm('このメンバーを削除しますか？')) return;
    persist(members.filter(m => m.id !== id));
    setSelected(null);
  };

  const handleReset = () => {
    if (!confirm('メンバーをデフォルトにリセットしますか？')) return;
    persist(defaultMembers);
  };

  const depts = ['全部署', ...Array.from(new Set(members.map(m => m.department)))];
  const filtered = members.filter(m => {
    const aiMatch = filter === 'all' || (filter === 'ai' && m.isAI) || (filter === 'human' && !m.isAI);
    const deptMatch = deptFilter === '全部署' || m.department === deptFilter;
    return aiMatch && deptMatch;
  });

  return (
    <div className="max-w-7xl mx-auto">
      {/* Modals */}
      {adding && (
        <MemberForm
          title="新しいメンバーを追加"
          initial={emptyMember()}
          onSave={handleAdd}
          onCancel={() => setAdding(false)}
        />
      )}
      {editing && (
        <MemberForm
          title="メンバーを編集"
          initial={editing}
          onSave={handleEdit}
          onCancel={() => setEditing(null)}
        />
      )}
      {selected && !editing && (
        <MemberDetail
          member={selected}
          onClose={() => setSelected(null)}
          onEdit={() => { setEditing(selected); }}
          onDelete={() => handleDelete(selected.id)}
        />
      )}

      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">👥 メンバー</h1>
          <p className="text-sm mt-1" style={{ color: '#6b7280' }}>人間とAIエージェントが連携するチーム</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleReset} className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', color: '#6b7280', border: '1px solid rgba(255,255,255,0.08)' }}>
            🔄 リセット
          </button>
          <button onClick={() => setAdding(true)}
            className="text-sm px-4 py-2 rounded-xl font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
            ＋ メンバー追加
          </button>
        </div>
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
            <button key={f} onClick={() => setFilter(f)}
              className="px-3 py-1.5 text-xs font-medium transition-all"
              style={{ background: filter === f ? 'rgba(99,102,241,0.2)' : 'transparent', color: filter === f ? '#a5b4fc' : '#6b7280' }}>
              {f === 'all' ? 'すべて' : f === 'ai' ? '🤖 AI' : '👤 人間'}
            </button>
          ))}
        </div>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
          className="text-xs px-3 py-1.5 rounded-lg outline-none"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#9ca3af' }}>
          {depts.map(d => <option key={d} value={d} style={{ background: '#0f0f1a' }}>{d}</option>)}
        </select>
      </div>

      {/* Members grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(m => (
          <div key={m.id} onClick={() => setSelected(m)}
            className="glass glass-hover rounded-xl p-4 cursor-pointer animate-fade-up relative group">
            <div className="flex items-start gap-3 mb-3">
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ background: m.isAI ? 'rgba(99,102,241,0.12)' : 'rgba(168,85,247,0.12)' }}>
                  {m.avatar}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                  style={{ borderColor: '#07070f', background: statusColor[m.status], boxShadow: m.status === 'online' ? `0 0 6px ${statusColor[m.status]}` : 'none' }} />
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
            {m.description && (
              <p className="text-xs leading-relaxed mb-3 line-clamp-2" style={{ color: '#9ca3af' }}>{m.description}</p>
            )}
            {m.skills.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {m.skills.slice(0, 3).map(s => (
                  <span key={s} className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.05)', color: '#6b7280', fontSize: '10px' }}>
                    {s}
                  </span>
                ))}
              </div>
            )}
            {/* Quick edit/delete on hover */}
            <div className="absolute top-2 right-2 hidden group-hover:flex gap-1" onClick={e => e.stopPropagation()}>
              <button onClick={() => setEditing(m)} className="p-1 rounded text-xs" style={{ background: 'rgba(99,102,241,0.3)', color: '#a5b4fc' }}>✏️</button>
              <button onClick={() => handleDelete(m.id)} className="p-1 rounded text-xs" style={{ background: 'rgba(239,68,68,0.3)', color: '#fca5a5' }}>🗑️</button>
            </div>
          </div>
        ))}

        {/* Add card */}
        <div onClick={() => setAdding(true)}
          className="glass rounded-xl p-4 cursor-pointer border-dashed flex flex-col items-center justify-center gap-2 min-h-[120px] transition-all hover:border-indigo-500"
          style={{ border: '2px dashed rgba(99,102,241,0.25)' }}>
          <div className="text-3xl" style={{ color: 'rgba(99,102,241,0.4)' }}>＋</div>
          <span className="text-xs" style={{ color: '#6b7280' }}>メンバーを追加</span>
        </div>
      </div>
    </div>
  );
}
