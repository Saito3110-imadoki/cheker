'use client';

import { useState, useEffect } from 'react';
import { members as defaultMembers, Member } from '@/lib/data';
import { Project } from '@/app/projects/page';

const STORAGE_KEY = 'imadoki-tasks';

export interface Task {
  id: string;
  title: string;
  projectId: string;
  assigneeId: string;
  priority: 'high' | 'medium' | 'low';
  status: 'todo' | 'in-progress' | 'review' | 'done';
  dueDate: string;
  isAITask: boolean;
  description: string;
}


const priorityConfig = {
  high: { label: '高', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  medium: { label: '中', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  low: { label: '低', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
};

const statusColumns = [
  { key: 'todo' as const, label: '未着手', icon: '⏳' },
  { key: 'in-progress' as const, label: '進行中', icon: '⚡' },
  { key: 'review' as const, label: 'レビュー', icon: '👁' },
  { key: 'done' as const, label: '完了', icon: '✅' },
];

const emptyTask = (): Omit<Task, 'id'> => ({
  title: '', projectId: '', assigneeId: '', priority: 'medium',
  status: 'todo', dueDate: '', isAITask: false, description: '',
});

function TaskForm({ initial, title, members, projects, onSave, onCancel }: {
  initial: Omit<Task, 'id'>;
  title: string;
  members: Member[];
  projects: Project[];
  onSave: (t: Omit<Task, 'id'>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(initial);
  const set = (f: keyof typeof form, v: unknown) => setForm(prev => ({ ...prev, [f]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="glass rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" style={{ border: '1px solid rgba(99,102,241,0.3)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-white">{title}</h2>
          <button onClick={onCancel} className="text-gray-500 hover:text-white text-xl">×</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs mb-1 block" style={{ color: '#6b7280' }}>タスク名 *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="例：SNSキャンペーン企画書作成"
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: '#6b7280' }}>説明</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none resize-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs mb-1 block" style={{ color: '#6b7280' }}>ステータス</label>
              <select value={form.status} onChange={e => set('status', e.target.value as Task['status'])}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#d1d5db' }}>
                {statusColumns.map(s => <option key={s.key} value={s.key} style={{ background: '#0f0f1a' }}>{s.icon} {s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: '#6b7280' }}>優先度</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value as Task['priority'])}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: priorityConfig[form.priority].color }}>
                {Object.entries(priorityConfig).map(([k, v]) => <option key={k} value={k} style={{ background: '#0f0f1a' }}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: '#6b7280' }}>期日</label>
            <input type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: '#6b7280' }}>担当者</label>
            <select value={form.assigneeId} onChange={e => {
              const m = members.find(m => m.id === e.target.value);
              set('assigneeId', e.target.value);
              set('isAITask', m?.isAI ?? false);
            }} className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#d1d5db' }}>
              <option value="" style={{ background: '#0f0f1a' }}>未割当</option>
              {members.map(m => <option key={m.id} value={m.id} style={{ background: '#0f0f1a' }}>{m.avatar} {m.name}{m.isAI ? ' [AI]' : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: '#6b7280' }}>関連プロジェクト</label>
            <select value={form.projectId} onChange={e => set('projectId', e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#d1d5db' }}>
              <option value="" style={{ background: '#0f0f1a' }}>なし</option>
              {projects.map(p => <option key={p.id} value={p.id} style={{ background: '#0f0f1a' }}>📁 {p.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={() => onSave(form)} disabled={!form.title.trim()}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', opacity: !form.title.trim() ? 0.5 : 1 }}>
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

function TaskCard({ task, members, projects, onEdit, onDelete, onMove }: {
  task: Task;
  members: Member[];
  projects: Project[];
  onEdit: () => void;
  onDelete: () => void;
  onMove: (status: Task['status']) => void;
}) {
  const assignee = members.find(m => m.id === task.assigneeId);
  const project = projects.find(p => p.id === task.projectId);
  const p = priorityConfig[task.priority];
  const isOverdue = !!task.dueDate && task.status !== 'done' && task.dueDate < new Date().toISOString().slice(0, 10);

  return (
    <div className="glass rounded-lg p-3 mb-2 relative group"
      style={{
        border: isOverdue ? '1px solid rgba(248,113,113,0.45)' : task.isAITask ? '1px solid rgba(99,102,241,0.2)' : '1px solid rgba(255,255,255,0.05)',
        background: isOverdue ? 'rgba(248,113,113,0.06)' : undefined,
        boxShadow: isOverdue ? '0 0 12px rgba(248,113,113,0.08)' : undefined,
      }}>
      {isOverdue && (
        <div className="flex items-center gap-1 mb-1.5 text-xs font-semibold" style={{ color: '#f87171', fontSize: '10px' }}>
          ⚠ 期限超過 — 対応が必要です
        </div>
      )}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-xs text-white font-medium leading-snug flex-1">{task.title}</p>
        <span className="text-xs px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: p.bg, color: p.color, fontSize: '9px' }}>{p.label}</span>
      </div>
      {task.description && <p className="text-xs mb-2 leading-relaxed" style={{ color: '#6b7280' }}>{task.description}</p>}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {assignee && (
            <>
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs"
                style={{ background: assignee.isAI ? 'rgba(99,102,241,0.15)' : 'rgba(168,85,247,0.15)' }}>
                {assignee.avatar}
              </div>
              <span className="text-xs" style={{ color: '#6b7280', fontSize: '10px' }}>
                {assignee.name.split(' ')[0]}
                {assignee.isAI && <span className="ml-1 px-1 rounded" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>AI</span>}
              </span>
            </>
          )}
        </div>
        {task.dueDate && (
          <span className="text-xs px-1 py-0.5 rounded" style={{
            color: isOverdue ? '#f87171' : '#9ca3af',
            background: isOverdue ? 'rgba(248,113,113,0.12)' : 'transparent',
            fontWeight: isOverdue ? 600 : 400,
            fontSize: '9px',
          }}>
            {isOverdue ? '⏰ ' : ''}{task.dueDate}
          </span>
        )}
      </div>
      {project && <div className="mt-1.5 text-xs truncate" style={{ color: '#9ca3af', fontSize: '9px' }}>📁 {project.name}</div>}

      {/* Move buttons */}
      <div className="mt-2 hidden group-hover:flex items-center gap-1 flex-wrap">
        {statusColumns.filter(s => s.key !== task.status).map(s => (
          <button key={s.key} onClick={() => onMove(s.key)}
            className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', fontSize: '9px' }}>
            → {s.label}
          </button>
        ))}
        <button onClick={onEdit} className="text-xs px-1.5 py-0.5 rounded ml-auto" style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', fontSize: '9px' }}>✏️</button>
        <button onClick={onDelete} className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.2)', color: '#fca5a5', fontSize: '9px' }}>🗑️</button>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [adding, setAdding] = useState(false);
  const [addingStatus, setAddingStatus] = useState<Task['status']>('todo');
  const [editing, setEditing] = useState<Task | null>(null);

  useEffect(() => {
    const t = localStorage.getItem(STORAGE_KEY);
    if (t) { try { setTasks(JSON.parse(t)); } catch { /* ignore */ } }

    const loadMembers = () => {
      const m = localStorage.getItem('imadoki-members');
      if (m) { try { setMembers(JSON.parse(m)); } catch { /* ignore */ } }
      else { import('@/lib/data').then(mod => setMembers(mod.members)); }
    };
    loadMembers();

    const p = localStorage.getItem('imadoki-projects');
    if (p) { try { setProjects(JSON.parse(p)); } catch { /* ignore */ } }

    window.addEventListener('imadoki-members-updated', loadMembers);
    return () => window.removeEventListener('imadoki-members-updated', loadMembers);
  }, []);

  const persist = (next: Task[]) => {
    setTasks(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const handleAdd = (form: Omit<Task, 'id'>) => {
    persist([...tasks, { ...form, id: `t-${Date.now()}` }]);
    setAdding(false);
  };

  const handleEdit = (form: Omit<Task, 'id'>) => {
    if (!editing) return;
    persist(tasks.map(t => t.id === editing.id ? { ...form, id: t.id } : t));
    setEditing(null);
  };

  const handleDelete = (id: string) => {
    if (!confirm('このタスクを削除しますか？')) return;
    persist(tasks.filter(t => t.id !== id));
  };

  const handleMove = (id: string, status: Task['status']) => {
    persist(tasks.map(t => t.id === id ? { ...t, status } : t));
  };

  const openAdd = (status: Task['status']) => {
    setAddingStatus(status);
    setAdding(true);
  };

  return (
    <div className="max-w-7xl mx-auto">
      {adding && (
        <TaskForm title="新しいタスクを追加" initial={{ ...emptyTask(), status: addingStatus }}
          members={members} projects={projects} onSave={handleAdd} onCancel={() => setAdding(false)} />
      )}
      {editing && (
        <TaskForm title="タスクを編集" initial={editing}
          members={members} projects={projects} onSave={handleEdit} onCancel={() => setEditing(null)} />
      )}

      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-bold flex items-center gap-2" style={{ fontSize: '22px', color: '#f1f5f9' }}>✅ タスク管理</h1>
          <p className="mt-1" style={{ fontSize: '13px', color: '#94a3b8' }}>カンバンボードで進捗を可視化 — AIと人間が分担してタスクを前に進める</p>
        </div>
        <button onClick={() => openAdd('todo')}
          className="text-sm px-4 py-2 rounded-xl font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
          ＋ タスク追加
        </button>
      </div>

      {/* Overdue alert */}
      {(() => {
        const today = new Date().toISOString().slice(0, 10);
        const overdue = tasks.filter(t => t.dueDate && t.status !== 'done' && t.dueDate < today).length;
        if (overdue === 0) return null;
        return (
          <div className="mb-4 px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm"
            style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171' }}>
            <span>⚠</span>
            <span className="font-semibold">期限超過のタスクが {overdue} 件あります</span>
            <span className="text-xs" style={{ color: '#94a3b8' }}>— 赤枠のカードから優先的にご対応ください</span>
          </div>
        );
      })()}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {statusColumns.map(col => (
          <div key={col.key} className="glass rounded-xl p-3 text-center">
            <div className="text-lg mb-0.5">{col.icon}</div>
            <div className="text-xl font-bold text-white">{tasks.filter(t => t.status === col.key).length}</div>
            <div className="text-xs" style={{ color: '#6b7280' }}>{col.label}</div>
          </div>
        ))}
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-4 gap-4">
        {statusColumns.map(col => (
          <div key={col.key}>
            <div className="flex items-center gap-2 mb-3 px-1">
              <span>{col.icon}</span>
              <span className="text-sm font-semibold text-white">{col.label}</span>
              <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: '#6b7280' }}>
                {tasks.filter(t => t.status === col.key).length}
              </span>
            </div>
            <div className="rounded-xl p-2 min-h-48" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
              {tasks.filter(t => t.status === col.key).map(t => (
                <TaskCard key={t.id} task={t} members={members} projects={projects}
                  onEdit={() => setEditing(t)}
                  onDelete={() => handleDelete(t.id)}
                  onMove={status => handleMove(t.id, status)} />
              ))}
              <button onClick={() => openAdd(col.key)}
                className="w-full mt-1 py-2 rounded-lg text-xs transition-all"
                style={{ color: '#374151', border: '1px dashed rgba(255,255,255,0.06)' }}>
                ＋ 追加
              </button>
            </div>
          </div>
        ))}
      </div>

      {tasks.length === 0 && (
        <div className="mt-4 glass rounded-2xl text-center py-14">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-sm font-medium mb-1" style={{ color: '#f1f5f9' }}>最初のタスクを追加しましょう</p>
          <p className="text-xs mb-5 max-w-sm mx-auto leading-relaxed" style={{ color: '#94a3b8' }}>
            やるべきことをタスクに分解して登録すると、担当・期限・進捗がボードで一目瞭然に。プロジェクトに紐づければ案件単位の状況もすぐ追えます
          </p>
          <button onClick={() => openAdd('todo')} className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
            最初のタスクを追加
          </button>
        </div>
      )}
      {tasks.length > 0 && (
        <div className="mt-4 p-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.1)' }}>
          <span className="text-xs" style={{ color: '#818cf8' }}>
            🤖 AI担当タスク {tasks.filter(t => t.isAITask && t.status !== 'done').length}件処理中 /
            完了 {tasks.filter(t => t.status === 'done').length}件
          </span>
        </div>
      )}
    </div>
  );
}
