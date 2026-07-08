'use client';

import { useState, useEffect } from 'react';
import { members as defaultMembers, Member, Department } from '@/lib/data';

const STORAGE_KEY = 'imadoki-projects';

export interface Project {
  id: string;
  name: string;
  client: string;
  status: 'active' | 'planning' | 'review' | 'completed';
  progress: number;
  deadline: string;
  budget: string;
  description: string;
  tags: string[];
  department: Department;
  team: string[];
}

const defaultProjects: Project[] = [
  { id: 'proj-1', name: 'ブランドリニューアル2025', client: '株式会社フューチャーテック', status: 'active', progress: 68, deadline: '2025-08-31', budget: '¥5,000,000', description: 'IT企業のブランドイメージをモダンにリニューアル。VI策定からWebサイトまで一括対応。', tags: ['ブランディング', 'VI', 'Web'], department: 'クリエイティブ', team: ['ceo', 'creative-lead', 'creative-ai', 'strategy-ai'] },
  { id: 'proj-2', name: 'SNS集客キャンペーン', client: '株式会社グリーンエナジー', status: 'active', progress: 45, deadline: '2025-07-15', budget: '¥2,800,000', description: 'Instagram・TikTokを中心とした若年層向け認知拡大キャンペーン。', tags: ['SNS', 'Instagram', 'TikTok'], department: 'デジタル広告', team: ['cmo', 'ads-ai', 'creative-ai', 'pr-ai'] },
  { id: 'proj-3', name: 'データドリブン広告最適化', client: '山田食品株式会社', status: 'active', progress: 82, deadline: '2025-06-30', budget: '¥1,500,000', description: 'Google/Meta広告のデータ分析によるROAS改善。AIによる自動入札最適化を実施。', tags: ['Google Ads', 'Meta', 'ROAS', 'AI最適化'], department: 'データ分析', team: ['data-ai', 'ads-ai', 'strategy-ai'] },
  { id: 'proj-4', name: '新規ECサイトマーケティング', client: 'ライフスタイル株式会社', status: 'planning', progress: 20, deadline: '2025-09-30', budget: '¥8,000,000', description: 'EC立ち上げに伴う総合マーケティング戦略の策定と実行。', tags: ['EC', 'D2C', '総合マーケ'], department: 'マーケティング戦略', team: ['strategy-ai', 'ads-ai', 'cs-ai', 'sales-lead'] },
  { id: 'proj-5', name: 'プレスリリース・メディア対応', client: 'テックスタート株式会社', status: 'review', progress: 90, deadline: '2025-06-20', budget: '¥800,000', description: '新サービスローンチに向けたPR戦略。主要メディア15社へのプレスリリース配信。', tags: ['PR', 'メディア', 'プレスリリース'], department: 'PR・広報', team: ['pr-lead', 'pr-ai', 'creative-ai'] },
];

const statusConfig = {
  active: { label: '進行中', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  planning: { label: '計画中', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
  review: { label: 'レビュー', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  completed: { label: '完了', color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' },
};

const departments: Department[] = ['経営', 'マーケティング戦略', 'クリエイティブ', 'デジタル広告', 'データ分析', '営業', 'PR・広報', 'カスタマーサクセス'];

const emptyProject = (): Omit<Project, 'id'> => ({
  name: '', client: '', status: 'planning', progress: 0, deadline: '',
  budget: '', description: '', tags: [], department: 'マーケティング戦略', team: [],
});

function ProjectForm({ initial, title, members, onSave, onCancel }: {
  initial: Omit<Project, 'id'>;
  title: string;
  members: Member[];
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
          {[
            { label: 'プロジェクト名 *', key: 'name' as const, placeholder: '例：SNSマーケティング強化' },
            { label: 'クライアント名 *', key: 'client' as const, placeholder: '例：株式会社〇〇' },
            { label: '予算', key: 'budget' as const, placeholder: '例：¥1,500,000' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs mb-1 block" style={{ color: '#6b7280' }}>{f.label}</label>
              <input value={form[f.key] as string} onChange={e => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
          ))}
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
          <div>
            <label className="text-xs mb-1 block" style={{ color: '#6b7280' }}>進捗: {form.progress}%</label>
            <input type="range" min={0} max={100} value={form.progress} onChange={e => set('progress', Number(e.target.value))}
              className="w-full accent-indigo-500" />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: '#6b7280' }}>部署</label>
            <select value={form.department} onChange={e => set('department', e.target.value as Department)}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#d1d5db' }}>
              {departments.map(d => <option key={d} value={d} style={{ background: '#0f0f1a' }}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: '#6b7280' }}>説明</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none resize-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: '#6b7280' }}>タグ（カンマ区切り）</label>
            <input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="例：SNS, マーケ, Instagram"
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div>
            <label className="text-xs mb-1.5 block" style={{ color: '#6b7280' }}>担当メンバー</label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
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
  const teamMembers = project.team.map(id => members.find(m => m.id === id)).filter(Boolean) as Member[];
  const aiCount = teamMembers.filter(m => m.isAI).length;

  return (
    <div className="glass glass-hover rounded-xl p-5 animate-fade-up relative group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 mr-3">
          <h3 className="text-sm font-bold text-white mb-0.5">{project.name}</h3>
          <div className="text-xs" style={{ color: '#6b7280' }}>{project.client}</div>
        </div>
        <span className="text-xs px-2 py-1 rounded-full font-medium flex-shrink-0" style={{ background: s.bg, color: s.color }}>{s.label}</span>
      </div>
      {project.description && <p className="text-xs leading-relaxed mb-4" style={{ color: '#9ca3af' }}>{project.description}</p>}
      <div className="mb-4">
        <div className="flex justify-between mb-1.5">
          <span className="text-xs" style={{ color: '#6b7280' }}>進捗</span>
          <span className="text-xs font-bold" style={{ color: project.progress > 80 ? '#22c55e' : project.progress > 50 ? '#f59e0b' : '#6366f1' }}>{project.progress}%</span>
        </div>
        <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded-full transition-all" style={{
            width: `${project.progress}%`,
            background: project.progress > 80 ? '#22c55e' : project.progress > 50 ? 'linear-gradient(90deg, #f59e0b, #fb923c)' : 'linear-gradient(90deg, #6366f1, #a855f7)',
          }} />
        </div>
      </div>
      {project.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
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
      {/* Hover actions */}
      <div className="absolute top-3 right-3 hidden group-hover:flex gap-1" onClick={e => e.stopPropagation()}>
        <button onClick={onEdit} className="p-1.5 rounded-lg text-xs" style={{ background: 'rgba(99,102,241,0.3)', color: '#a5b4fc' }}>✏️</button>
        <button onClick={onDelete} className="p-1.5 rounded-lg text-xs" style={{ background: 'rgba(239,68,68,0.3)', color: '#fca5a5' }}>🗑️</button>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>(defaultProjects);
  const [members, setMembers] = useState<Member[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) { try { setProjects(JSON.parse(stored)); } catch { /* ignore */ } }
    const m = localStorage.getItem('imadoki-members');
    if (m) { try { setMembers(JSON.parse(m)); } catch { /* ignore */ } }
    else {
      import('@/lib/data').then(mod => setMembers(mod.members));
    }
  }, []);

  const persist = (next: Project[]) => {
    setProjects(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const handleAdd = (form: Omit<Project, 'id'>) => {
    persist([...projects, { ...form, id: `proj-${Date.now()}` }]);
    setAdding(false);
  };

  const handleEdit = (form: Omit<Project, 'id'>) => {
    if (!editing) return;
    persist(projects.map(p => p.id === editing.id ? { ...form, id: p.id } : p));
    setEditing(null);
  };

  const handleDelete = (id: string) => {
    if (!confirm('このプロジェクトを削除しますか？')) return;
    persist(projects.filter(p => p.id !== id));
  };

  const filtered = statusFilter === 'all' ? projects : projects.filter(p => p.status === statusFilter);

  return (
    <div className="max-w-7xl mx-auto">
      {adding && <ProjectForm title="新しいプロジェクトを追加" initial={emptyProject()} members={members} onSave={handleAdd} onCancel={() => setAdding(false)} />}
      {editing && <ProjectForm title="プロジェクトを編集" initial={editing} members={members} onSave={handleEdit} onCancel={() => setEditing(null)} />}

      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">📁 プロジェクト</h1>
          <p className="text-sm mt-1" style={{ color: '#6b7280' }}>進行中の全クライアント案件</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setProjects(defaultProjects); localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultProjects)); }}
            className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', color: '#6b7280', border: '1px solid rgba(255,255,255,0.08)' }}>
            🔄 リセット
          </button>
          <button onClick={() => setAdding(true)}
            className="text-sm px-4 py-2 rounded-xl font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
            ＋ プロジェクト追加
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {Object.entries(statusConfig).map(([key, cfg]) => (
          <div key={key} className="glass rounded-xl p-4 text-center glass-hover cursor-pointer"
            onClick={() => setStatusFilter(key === statusFilter ? 'all' : key)}>
            <div className="text-xl font-bold" style={{ color: cfg.color }}>{projects.filter(p => p.status === key).length}</div>
            <div className="text-xs" style={{ color: '#6b7280' }}>{cfg.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        {(['all', 'active', 'planning', 'review', 'completed'] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className="text-xs px-3 py-1.5 rounded-lg transition-all"
            style={{
              background: statusFilter === s ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
              color: statusFilter === s ? '#a5b4fc' : '#6b7280',
              border: `1px solid ${statusFilter === s ? 'rgba(99,102,241,0.4)' : 'transparent'}`,
            }}>
            {s === 'all' ? 'すべて' : statusConfig[s].label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="glass rounded-xl text-center py-16">
          <div className="text-4xl mb-3">📁</div>
          <p className="text-sm mb-4" style={{ color: '#6b7280' }}>プロジェクトを追加してください</p>
          <button onClick={() => setAdding(true)} className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
            最初のプロジェクトを追加
          </button>
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
