'use client';

import { useState } from 'react';
import { projects, members, Project } from '@/lib/data';

const statusConfig = {
  active: { label: '進行中', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  planning: { label: '計画中', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
  review: { label: 'レビュー', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  completed: { label: '完了', color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' },
};

function ProjectCard({ project }: { project: Project }) {
  const s = statusConfig[project.status];
  const teamMembers = project.team.map(id => members.find(m => m.id === id)).filter(Boolean);
  const aiCount = teamMembers.filter(m => m?.isAI).length;

  return (
    <div className="glass glass-hover rounded-xl p-5 animate-fade-up">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 mr-3">
          <h3 className="text-sm font-bold text-white mb-0.5">{project.name}</h3>
          <div className="text-xs" style={{ color: '#6b7280' }}>{project.client}</div>
        </div>
        <span className="text-xs px-2 py-1 rounded-full font-medium flex-shrink-0" style={{ background: s.bg, color: s.color }}>
          {s.label}
        </span>
      </div>

      <p className="text-xs leading-relaxed mb-4" style={{ color: '#9ca3af' }}>{project.description}</p>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between mb-1.5">
          <span className="text-xs" style={{ color: '#6b7280' }}>進捗</span>
          <span className="text-xs font-bold" style={{ color: project.progress > 80 ? '#22c55e' : project.progress > 50 ? '#f59e0b' : '#6366f1' }}>
            {project.progress}%
          </span>
        </div>
        <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${project.progress}%`,
              background: project.progress > 80 ? '#22c55e' : project.progress > 50 ? 'linear-gradient(90deg, #f59e0b, #fb923c)' : 'linear-gradient(90deg, #6366f1, #a855f7)',
            }}
          />
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {project.tags.map(tag => (
          <span key={tag} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', fontSize: '10px' }}>
            {tag}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-1">
          {teamMembers.slice(0, 4).map(m => m && (
            <div key={m.id} className="w-6 h-6 rounded-full flex items-center justify-center text-xs -ml-1 first:ml-0"
              style={{ background: m.isAI ? 'rgba(99,102,241,0.2)' : 'rgba(168,85,247,0.2)', border: '1px solid rgba(0,0,0,0.4)' }}>
              {m.avatar}
            </div>
          ))}
          {teamMembers.length > 4 && (
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs -ml-1"
              style={{ background: 'rgba(255,255,255,0.08)', color: '#6b7280', border: '1px solid rgba(0,0,0,0.4)' }}>
              +{teamMembers.length - 4}
            </div>
          )}
          {aiCount > 0 && (
            <span className="ml-2 text-xs" style={{ color: '#6b7280' }}>AI {aiCount}体</span>
          )}
        </div>
        <div className="text-right">
          <div className="text-xs font-bold" style={{ color: '#f59e0b' }}>{project.budget}</div>
          <div className="text-xs" style={{ color: '#4b5563' }}>期限 {project.deadline}</div>
        </div>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = statusFilter === 'all' ? projects : projects.filter(p => p.status === statusFilter);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">📁 プロジェクト</h1>
        <p className="text-sm mt-1" style={{ color: '#6b7280' }}>進行中の全クライアント案件</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {Object.entries(statusConfig).map(([key, cfg]) => (
          <div key={key} className="glass rounded-xl p-4 text-center glass-hover cursor-pointer" onClick={() => setStatusFilter(key === statusFilter ? 'all' : key)}>
            <div className="text-xl font-bold" style={{ color: cfg.color }}>{projects.filter(p => p.status === key).length}</div>
            <div className="text-xs" style={{ color: '#6b7280' }}>{cfg.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-5">
        {(['all', 'active', 'planning', 'review', 'completed'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className="text-xs px-3 py-1.5 rounded-lg transition-all"
            style={{
              background: statusFilter === s ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
              color: statusFilter === s ? '#a5b4fc' : '#6b7280',
              border: `1px solid ${statusFilter === s ? 'rgba(99,102,241,0.4)' : 'transparent'}`,
            }}
          >
            {s === 'all' ? 'すべて' : statusConfig[s].label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map(p => <ProjectCard key={p.id} project={p} />)}
      </div>
    </div>
  );
}
