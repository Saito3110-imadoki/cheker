'use client';

import { useState } from 'react';
import { tasks, members, projects, Task } from '@/lib/data';

const priorityConfig = {
  high: { label: '高', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  medium: { label: '中', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  low: { label: '低', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
};

const statusColumns = [
  { key: 'todo', label: '未着手', icon: '⏳' },
  { key: 'in-progress', label: '進行中', icon: '⚡' },
  { key: 'review', label: 'レビュー', icon: '👁' },
  { key: 'done', label: '完了', icon: '✅' },
] as const;

function TaskCard({ task }: { task: Task }) {
  const assignee = members.find(m => m.id === task.assignee);
  const project = projects.find(p => p.id === task.projectId);
  const p = priorityConfig[task.priority];

  return (
    <div
      className="glass rounded-lg p-3 mb-2 animate-fade-up"
      style={{ border: task.isAITask ? '1px solid rgba(99,102,241,0.2)' : '1px solid rgba(255,255,255,0.05)' }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-xs text-white font-medium leading-snug flex-1">{task.title}</p>
        <span className="text-xs px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: p.bg, color: p.color, fontSize: '9px' }}>
          {p.label}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs"
            style={{ background: assignee?.isAI ? 'rgba(99,102,241,0.15)' : 'rgba(168,85,247,0.15)' }}>
            {assignee?.avatar}
          </div>
          <span className="text-xs" style={{ color: '#6b7280', fontSize: '10px' }}>
            {assignee?.name.split(' ')[0]}
            {assignee?.isAI && <span className="ml-1 px-1 rounded" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>AI</span>}
          </span>
        </div>
        <span className="text-xs" style={{ color: '#374151', fontSize: '9px' }}>{task.dueDate}</span>
      </div>
      {project && (
        <div className="mt-1.5 text-xs truncate" style={{ color: '#374151', fontSize: '9px' }}>📁 {project.name}</div>
      )}
    </div>
  );
}

export default function TasksPage() {
  const [allTasks, setAllTasks] = useState(tasks);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">✅ タスク管理</h1>
        <p className="text-sm mt-1" style={{ color: '#6b7280' }}>カンバンボード — AIと人間が協力してタスクを推進</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {statusColumns.map(col => (
          <div key={col.key} className="glass rounded-xl p-3 text-center">
            <div className="text-lg mb-0.5">{col.icon}</div>
            <div className="text-xl font-bold text-white">{allTasks.filter(t => t.status === col.key).length}</div>
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
                {allTasks.filter(t => t.status === col.key).length}
              </span>
            </div>
            <div
              className="rounded-xl p-2 min-h-48"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
            >
              {allTasks.filter(t => t.status === col.key).map(t => (
                <TaskCard key={t.id} task={t} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 rounded-xl text-center" style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)' }}>
        <span className="text-sm" style={{ color: '#818cf8' }}>
          🤖 AIエージェントが自動で{allTasks.filter(t => t.isAITask).length}件のタスクを担当中 —
          残り{allTasks.filter(t => t.isAITask && t.status !== 'done').length}件を処理しています
        </span>
      </div>
    </div>
  );
}
