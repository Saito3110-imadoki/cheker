'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Command {
  id: string;
  label: string;
  icon: string;
  href?: string;
  group: string;
  keywords?: string[];
}

const STATIC_COMMANDS: Command[] = [
  { id: 'home',      label: 'ダッシュボード',         icon: '📊', href: '/',              group: 'ページ' },
  { id: 'ceo',       label: '社長室',                 icon: '👔', href: '/ceo',           group: 'ページ' },
  { id: 'data',      label: 'データ入力',             icon: '📥', href: '/ceo/data',      group: 'ページ' },
  { id: 'analysis',  label: 'AI分析・承認',           icon: '🔍', href: '/ceo/analysis',  group: 'ページ' },
  { id: 'analytics', label: 'アナリティクス',         icon: '📈', href: '/analytics',     group: 'ページ', keywords: ['売上分析', 'クライアント別', 'グラフ'] },
  { id: 'finance',   label: '財務・書類',             icon: '💰', href: '/finance',       group: 'ページ', keywords: ['請求書', '契約書', 'リーガルチェック', '入金'] },
  { id: 'office',    label: 'バーチャルオフィス',     icon: '🏢', href: '/office',        group: 'ページ' },
  { id: 'org',       label: '組織図',                 icon: '🌐', href: '/org',           group: 'ページ' },
  { id: 'members',   label: 'メンバー管理',           icon: '👥', href: '/members',       group: 'ページ' },
  { id: 'projects',  label: 'プロジェクト',           icon: '📁', href: '/projects',      group: 'ページ' },
  { id: 'tasks',     label: 'タスク管理',             icon: '✅', href: '/tasks',         group: 'ページ' },
  { id: 'ai-hub',    label: 'AIハブ',                 icon: '🤖', href: '/ai-hub',        group: 'ページ' },
  { id: 'workspace', label: 'ワークスペース',         icon: '🚀', href: '/workspace',     group: 'ページ' },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CommandPalette({ open, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const [dynamicCommands, setDynamicCommands] = useState<Command[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Load members/projects from localStorage for dynamic search
  useEffect(() => {
    if (!open) return;
    const cmds: Command[] = [];
    try {
      const members = JSON.parse(localStorage.getItem('imadoki-members') || '[]');
      members.slice(0, 20).forEach((m: { id: string; name: string; avatar: string; role: string }) => {
        cmds.push({ id: `m-${m.id}`, label: m.name, icon: m.avatar, href: '/members', group: 'メンバー', keywords: [m.role] });
      });
    } catch { /* ignore */ }
    try {
      const projects = JSON.parse(localStorage.getItem('imadoki-projects') || '[]');
      projects.slice(0, 10).forEach((p: { id: string; name: string; client: string }) => {
        cmds.push({ id: `p-${p.id}`, label: p.name, icon: '📁', href: '/projects', group: 'プロジェクト', keywords: [p.client] });
      });
    } catch { /* ignore */ }
    setDynamicCommands(cmds);
  }, [open]);

  const allCommands = [...STATIC_COMMANDS, ...dynamicCommands];

  const filtered = query.trim()
    ? allCommands.filter(c => {
        const q = query.toLowerCase();
        return c.label.toLowerCase().includes(q) ||
          c.group.toLowerCase().includes(q) ||
          c.keywords?.some(k => k.toLowerCase().includes(q));
      })
    : STATIC_COMMANDS;

  const grouped = filtered.reduce<Record<string, Command[]>>((acc, c) => {
    if (!acc[c.group]) acc[c.group] = [];
    acc[c.group].push(c);
    return acc;
  }, {});

  const flat = Object.values(grouped).flat();

  useEffect(() => { setSelected(0); }, [query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const execute = useCallback((cmd: Command) => {
    if (cmd.href) router.push(cmd.href);
    onClose();
  }, [router, onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, flat.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      if (e.key === 'Enter' && flat[selected]) { execute(flat[selected]); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, flat, selected, execute, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="w-full max-w-xl mx-4 rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: '#0f0f1a', border: '1px solid rgba(99,102,241,0.35)', boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}
        onClick={e => e.stopPropagation()}>

        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <span className="text-lg flex-shrink-0" style={{ color: '#6b7280' }}>🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="ページ検索・メンバー・プロジェクト..."
            className="flex-1 bg-transparent outline-none text-white text-sm placeholder:text-gray-600"
          />
          <kbd className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.06)', color: '#6b7280' }}>Esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {flat.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm" style={{ color: '#6b7280' }}>
              「{query}」に一致する結果がありません
            </div>
          ) : (
            Object.entries(grouped).map(([group, items]) => (
              <div key={group}>
                <div className="px-4 py-1.5 text-xs font-semibold" style={{ color: '#4b5563' }}>{group}</div>
                {items.map(cmd => {
                  const idx = flat.indexOf(cmd);
                  const isActive = idx === selected;
                  return (
                    <button key={cmd.id} onClick={() => execute(cmd)}
                      onMouseEnter={() => setSelected(idx)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                      style={{ background: isActive ? 'rgba(99,102,241,0.15)' : 'transparent' }}>
                      <span className="text-base w-6 flex-shrink-0 text-center">{cmd.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium" style={{ color: isActive ? '#a5b4fc' : '#e5e7eb' }}>{cmd.label}</div>
                        {cmd.keywords?.[0] && <div className="text-xs truncate" style={{ color: '#6b7280' }}>{cmd.keywords[0]}</div>}
                      </div>
                      {isActive && <kbd className="text-xs px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}>↵</kbd>}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t text-xs" style={{ borderColor: 'rgba(255,255,255,0.05)', color: '#4b5563' }}>
          <span><kbd className="mr-1 px-1 rounded" style={{ background: 'rgba(255,255,255,0.05)' }}>↑↓</kbd>選択</span>
          <span><kbd className="mr-1 px-1 rounded" style={{ background: 'rgba(255,255,255,0.05)' }}>↵</kbd>移動</span>
          <span><kbd className="mr-1 px-1 rounded" style={{ background: 'rgba(255,255,255,0.05)' }}>Esc</kbd>閉じる</span>
        </div>
      </div>
    </div>
  );
}
