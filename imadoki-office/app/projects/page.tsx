'use client';

import { useState, useEffect } from 'react';
import { members as defaultMembers, Member, Department } from '@/lib/data';
import { CompanyData } from '@/lib/ceo-types';

const STORAGE_KEY = 'imadoki-projects';

export type ProjectOrigin = 'ceo-directive' | 'client-consult' | 'ai-suggestion' | 'manual';

export interface Project {
  id: string;
  name: string;
  client: string;
  origin: ProjectOrigin;
  status: 'active' | 'planning' | 'review' | 'completed';
  progress: number;
  deadline: string;
  budget: string;
  description: string;
  tags: string[];
  department: Department;
  team: string[];
}

const statusConfig = {
  active:    { label: '進行中', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  planning:  { label: '計画中', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
  review:    { label: 'レビュー', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  completed: { label: '完了',   color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' },
};

const originConfig: Record<ProjectOrigin, { label: string; icon: string; color: string }> = {
  'ceo-directive': { label: '社長指示', icon: '👔', color: '#a855f7' },
  'client-consult': { label: 'クライアント相談', icon: '🤝', color: '#6366f1' },
  'ai-suggestion':  { label: 'AI提案', icon: '🤖', color: '#22c55e' },
  'manual':         { label: '手動追加', icon: '✏️', color: '#6b7280' },
};

const departments: Department[] = ['経営', 'マーケティング戦略', 'クリエイティブ', 'デジタル広告', 'データ分析', '営業', 'PR・広報', 'カスタマーサクセス'];

const emptyProject = (): Omit<Project, 'id'> => ({
  name: '', client: '', origin: 'ceo-directive', status: 'planning', progress: 0,
  deadline: '', budget: '', description: '', tags: [], department: 'マーケティング戦略', team: [],
});

function ProjectForm({ initial, title, members, clientNames, onSave, onCancel }: {
  initial: Omit<Project, 'id'>;
  title: string;
  members: Member[];
  clientNames: string[];
  onSave: (p: Omit<Project, 'id'>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [tagInput, setTagInput] = useState(initial.tags.join(', '));
  const set = (f: keyof typeof form, v: unknown) => setForm(prev => ({ ...prev, [f]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="glass rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{ border: '1px solid rgba(99,102,241,0.3)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-white">{title}</h2>
          <button onClick={onCancel} className="text-gray-500 hover:text-white text-xl">×</button>
        </div>
        <div className="space-y-3">
          {/* Origin */}
          <div>
            <label className="text-xs mb-1.5 block" style={{ color: '#6b7280' }}>起点・きっかけ</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(originConfig) as [ProjectOrigin, typeof originConfig[ProjectOrigin]][]).map(([key, cfg]) => (
                <button key={key} onClick={() => set('origin', key)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all text-left"
                  style={{
                    background: form.origin === key ? `${cfg.color}22` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${form.origin === key ? cfg.color : 'rgba(255,255,255,0.08)'}`,
                    color: form.origin === key ? cfg.color : '#6b7280',
                  }}>
                  <span>{cfg.icon}</span>{cfg.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs mb-1 block" style={{ color: '#6b7280' }}>プロジェクト名 *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="例：evolution LP制作プロジェクト"
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>

          {/* Client selector — show known clients if available */}
          <div>
            <label className="text-xs mb-1 block" style={{ color: '#6b7280' }}>クライアント *</label>
            {clientNames.length > 0 ? (
              <select value={form.client} onChange={e => set('client', e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: form.client ? '#d1d5db' : '#6b7280' }}>
                <option value="" style={{ background: '#0f0f1a' }}>— 選択 or 直接入力 —</option>
                {clientNames.map(n => <option key={n} value={n} style={{ background: '#0f0f1a' }}>{n}</option>)}
              </select>
            ) : (
              <input value={form.client} onChange={e => set('client', e.target.value)}
                placeholder="例：株式会社evolution"
                className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
            )}
          </div>

          <div>
            <label className="text-xs mb-1 block" style={{ color: '#6b7280' }}>概要・相談内容</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
              placeholder="社長からの指示内容、クライアントからの相談内容を記載"
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none resize-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs mb-1 block" style={{ color: '#6b7280' }}>ステータス</label>
              <select value={form.status} onChange={e => set('status', e.target.value as Project['status'])}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: statusConfig[form.status].color }}>
                {Object.entries(statusConfig).map(([k, v]) => (
                  <option key={k} value={k} style={{ background: '#0f0f1a' }}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: '#6b7280' }}>期限</label>
              <input type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs mb-1 block" style={{ color: '#6b7280' }}>予算</label>
              <input value={form.budget} onChange={e => set('budget', e.target.value)}
                placeholder="例：¥330,000"
                className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: '#6b7280' }}>部署</label>
              <select value={form.department} onChange={e => set('department', e.target.value as Department)}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#d1d5db' }}>
                {departments.map(d => <option key={d} value={d} style={{ background: '#0f0f1a' }}>{d}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs mb-1 block" style={{ color: '#6b7280' }}>進捗: {form.progress}%</label>
            <input type="range" min={0} max={100} value={form.progress} onChange={e => set('progress', Number(e.target.value))}
              className="w-full accent-indigo-500" />
          </div>

          <div>
            <label className="text-xs mb-1 block" style={{ color: '#6b7280' }}>タグ（カンマ区切り）</label>
            <input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="例：LP制作, 広告運用, SNS"
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>

          <div>
            <label className="text-xs mb-1.5 block" style={{ color: '#6b7280' }}>担当メンバー</label>
            <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
              {members.map(m => (
                <button key={m.id} onClick={() => {
                  const t = form.team.includes(m.id) ? form.team.filter(id => id !== m.id) : [...form.team, m.id];
                  set('team', t);
                }} className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all"
                  style={{
                    background: form.team.includes(m.id) ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.04)',
                    color: form.team.includes(m.id) ? '#a5b4fc' : '#6b7280',
                    border: `1px solid ${form.team.includes(m.id) ? 'rgba(99,102,241,0.4)' : 'transparent'}`,
                  }}>
                  {m.avatar} {m.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={() => onSave({ ...form, tags: tagInput.split(',').map(s => s.trim()).filter(Boolean) })}
            disabled={!form.name.trim() || !form.client.trim()}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', opacity: !form.name.trim() || !form.client.trim() ? 0.5 : 1 }}>
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

function ProjectCard({ project, members, onEdit, onDelete }: {
  project: Project;
  members: Member[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const s = statusConfig[project.status];
  const o = originConfig[project.origin ?? 'manual'];
  const teamMembers = project.team.map(id => members.find(m => m.id === id)).filter(Boolean) as Member[];
  const aiCount = teamMembers.filter(m => m.isAI).length;

  return (
    <div className="glass glass-hover rounded-xl p-5 animate-fade-up relative group">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0 mr-3">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold inline-flex items-center gap-1"
              style={{ background: `${o.color}26`, color: o.color, border: `1px solid ${o.color}66`, boxShadow: `0 0 0 1px ${o.color}1a` }}>
              {o.icon} {o.label}
            </span>
          </div>
          <h3 className="text-sm font-bold text-white mt-1.5">{project.name}</h3>
          <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>🏢 {project.client}</div>
        </div>
        <span className="text-xs px-2 py-1 rounded-full font-medium flex-shrink-0" style={{ background: s.bg, color: s.color }}>{s.label}</span>
      </div>

      {project.description && <p className="text-xs leading-relaxed mb-3 mt-2" style={{ color: '#9ca3af' }}>{project.description}</p>}

      <div className="mb-3">
        <div className="flex justify-between mb-1">
          <span className="text-xs" style={{ color: '#6b7280' }}>進捗</span>
          <span className="text-xs font-bold" style={{ color: project.progress > 80 ? '#22c55e' : project.progress > 50 ? '#f59e0b' : '#6366f1' }}>{project.progress}%</span>
        </div>
        <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded-full transition-all" style={{
            width: `${project.progress}%`,
            background: project.progress > 80 ? '#22c55e' : project.progress > 50 ? 'linear-gradient(90deg, #f59e0b, #fb923c)' : 'linear-gradient(90deg, #6366f1, #a855f7)',
          }} />
        </div>
      </div>

      {project.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {project.tags.map(tag => (
            <span key={tag} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', fontSize: '10px' }}>{tag}</span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-1">
          {teamMembers.slice(0, 4).map(m => (
            <div key={m.id} className="w-6 h-6 rounded-full flex items-center justify-center text-xs -ml-1 first:ml-0"
              style={{ background: m.isAI ? 'rgba(99,102,241,0.2)' : 'rgba(168,85,247,0.2)', border: '1px solid rgba(0,0,0,0.4)' }}>
              {m.avatar}
            </div>
          ))}
          {teamMembers.length > 4 && (
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs -ml-1"
              style={{ background: 'rgba(255,255,255,0.08)', color: '#6b7280' }}>+{teamMembers.length - 4}</div>
          )}
          {aiCount > 0 && <span className="ml-2 text-xs" style={{ color: '#6b7280' }}>AI {aiCount}体</span>}
        </div>
        <div className="text-right">
          {project.budget && <div className="text-xs font-bold" style={{ color: '#f59e0b' }}>{project.budget}</div>}
          {project.deadline && <div className="text-xs" style={{ color: '#4b5563' }}>期限 {project.deadline}</div>}
        </div>
      </div>

      <div className="absolute top-3 right-3 hidden group-hover:flex gap-1" onClick={e => e.stopPropagation()}>
        <button onClick={onEdit} className="p-1.5 rounded-lg text-xs" style={{ background: 'rgba(99,102,241,0.3)', color: '#a5b4fc' }}>✏️</button>
        <button onClick={onDelete} className="p-1.5 rounded-lg text-xs" style={{ background: 'rgba(239,68,68,0.3)', color: '#fca5a5' }}>🗑️</button>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [clientNames, setClientNames] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [originFilter, setOriginFilter] = useState<string>('all');
  const [adding, setAdding] = useState(false);
  const [addingOrigin, setAddingOrigin] = useState<ProjectOrigin>('ceo-directive');
  const [editing, setEditing] = useState<Project | null>(null);

  useEffect(() => {
    try { const s = localStorage.getItem(STORAGE_KEY); if (s) setProjects(JSON.parse(s)); } catch { /* ignore */ }

    const loadMembers = () => {
      try {
        const m = localStorage.getItem('imadoki-members');
        setMembers(m ? JSON.parse(m) : defaultMembers);
      } catch { setMembers(defaultMembers); }
    };
    loadMembers();
    window.addEventListener('imadoki-members-updated', loadMembers);

    // Load client names from company data
    try {
      const cd: CompanyData = JSON.parse(localStorage.getItem('imadoki-company-data') || 'null');
      if (cd?.clients?.length) {
        const names = [...new Set(cd.clients.map(c => c.name))].sort();
        setClientNames(names);
      }
    } catch { /* ignore */ }

    return () => window.removeEventListener('imadoki-members-updated', loadMembers);
  }, []);

  const persist = (next: Project[]) => {
    setProjects(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const openAdd = (origin: ProjectOrigin = 'ceo-directive') => {
    setAddingOrigin(origin);
    setAdding(true);
  };

  const handleAdd = (form: Omit<Project, 'id'>) => {
    persist([...projects, { ...form, id: `proj-${Date.now()}` }]);
    setAdding(false);
  };

  const handleEdit = (form: Omit<Project, 'id'>) => {
    if (!editing) return;
    persist(projects.map(p => p.id === editing.id ? { ...form, id: p.id } : p));
    if (form.status === 'completed' && editing.status !== 'completed') {
      import('@/lib/gamification').then(m => m.addXp('project-done'));
    }
    setEditing(null);
  };

  const handleDelete = (id: string) => {
    if (!confirm('このプロジェクトを削除しますか？')) return;
    persist(projects.filter(p => p.id !== id));
  };

  const filtered = projects
    .filter(p => statusFilter === 'all' || p.status === statusFilter)
    .filter(p => originFilter === 'all' || p.origin === originFilter);

  return (
    <div className="max-w-7xl mx-auto">
      {adding && (
        <ProjectForm
          title="プロジェクトを追加"
          initial={{ ...emptyProject(), origin: addingOrigin }}
          members={members}
          clientNames={clientNames}
          onSave={handleAdd}
          onCancel={() => setAdding(false)}
        />
      )}
      {editing && (
        <ProjectForm
          title="プロジェクトを編集"
          initial={editing}
          members={members}
          clientNames={clientNames}
          onSave={handleEdit}
          onCancel={() => setEditing(null)}
        />
      )}

      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-bold flex items-center gap-2" style={{ fontSize: '22px', color: '#f1f5f9' }}>📁 プロジェクト</h1>
          <p className="mt-1" style={{ fontSize: '13px', color: '#94a3b8' }}>社長指示・クライアント相談を起点に登録 — 進捗と期限を一元管理して対応漏れを防ぐ</p>
        </div>
        <button onClick={() => openAdd('ceo-directive')}
          className="text-sm px-4 py-2 rounded-xl font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
          ＋ プロジェクト追加
        </button>
      </div>

      {/* Quick-add origin shortcuts */}
      <div className="flex gap-3 mb-5 flex-wrap">
        {(Object.entries(originConfig) as [ProjectOrigin, typeof originConfig[ProjectOrigin]][]).map(([key, cfg]) => (
          <button key={key} onClick={() => openAdd(key)}
            className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl transition-all"
            style={{ background: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}40` }}>
            {cfg.icon} {cfg.label}から追加
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {Object.entries(statusConfig).map(([key, cfg]) => (
          <div key={key} className="glass rounded-xl p-4 text-center glass-hover cursor-pointer"
            onClick={() => setStatusFilter(key === statusFilter ? 'all' : key)}>
            <div className="text-xl font-bold" style={{ color: cfg.color }}>{projects.filter(p => p.status === key).length}</div>
            <div className="text-xs" style={{ color: '#6b7280' }}>{cfg.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <button onClick={() => setOriginFilter('all')}
          className="text-xs px-3 py-1.5 rounded-lg transition-all"
          style={{ background: originFilter === 'all' ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)', color: originFilter === 'all' ? '#a5b4fc' : '#6b7280', border: `1px solid ${originFilter === 'all' ? 'rgba(99,102,241,0.4)' : 'transparent'}` }}>
          すべて
        </button>
        {(Object.entries(originConfig) as [ProjectOrigin, typeof originConfig[ProjectOrigin]][]).map(([key, cfg]) => (
          <button key={key} onClick={() => setOriginFilter(key === originFilter ? 'all' : key)}
            className="text-xs px-3 py-1.5 rounded-lg transition-all"
            style={{ background: originFilter === key ? `${cfg.color}25` : 'rgba(255,255,255,0.04)', color: originFilter === key ? cfg.color : '#6b7280', border: `1px solid ${originFilter === key ? `${cfg.color}60` : 'transparent'}` }}>
            {cfg.icon} {cfg.label}
          </button>
        ))}
        <div className="w-px mx-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
        {(['active', 'planning', 'review', 'completed'] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s === statusFilter ? 'all' : s)}
            className="text-xs px-3 py-1.5 rounded-lg transition-all"
            style={{ background: statusFilter === s ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)', color: statusFilter === s ? '#a5b4fc' : '#6b7280', border: `1px solid ${statusFilter === s ? 'rgba(99,102,241,0.4)' : 'transparent'}` }}>
            {statusConfig[s].label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="glass rounded-2xl text-center py-20">
          <div className="text-5xl mb-4">📁</div>
          <p className="text-base font-medium mb-2" style={{ color: '#f1f5f9' }}>
            {projects.length === 0 ? '最初のプロジェクトを登録しましょう' : 'フィルター条件に一致するプロジェクトがありません'}
          </p>
          <p className="text-sm mb-6 max-w-md mx-auto leading-relaxed" style={{ color: '#94a3b8' }}>
            {projects.length === 0
              ? '社長からの指示やクライアントからの相談を登録しておくと、進捗・期限・担当がひと目で把握でき、対応漏れを防げます。まずは起点を選んで1件追加してみてください'
              : 'フィルターを解除するか、別の条件をお試しください'}
          </p>
          {projects.length === 0 && (
            <div className="flex gap-3 justify-center flex-wrap">
              {(Object.entries(originConfig) as [ProjectOrigin, typeof originConfig[ProjectOrigin]][]).map(([key, cfg]) => (
                <button key={key} onClick={() => openAdd(key)}
                  className="text-sm px-4 py-2 rounded-xl font-medium"
                  style={{ background: `${cfg.color}20`, color: cfg.color, border: `1px solid ${cfg.color}50` }}>
                  {cfg.icon} {cfg.label}から追加
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(p => (
            <ProjectCard key={p.id} project={p} members={members}
              onEdit={() => setEditing(p)} onDelete={() => handleDelete(p.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
