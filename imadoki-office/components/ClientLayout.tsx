'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { members as defaultMembers, Member } from '@/lib/data';

const navItems = [
  { href: '/', label: 'ダッシュボード', icon: '📊' },
  { href: '/ceo', label: '社長室', icon: '👔' },
  { href: '/ceo/data', label: 'データ入力', icon: '📥' },
  { href: '/ceo/analysis', label: 'AI分析・承認', icon: '🔍' },
  { href: '/office', label: 'バーチャルオフィス', icon: '🏢' },
  { href: '/org', label: '組織図', icon: '🌐' },
  { href: '/members', label: 'メンバー', icon: '👥' },
  { href: '/projects', label: 'プロジェクト', icon: '📁' },
  { href: '/tasks', label: 'タスク', icon: '✅' },
  { href: '/ai-hub', label: 'AIハブ', icon: '🤖' },
];

function Sidebar({ collapsed, setCollapsed }: { collapsed: boolean; setCollapsed: (v: boolean) => void }) {
  const pathname = usePathname();
  const [self, setSelf] = useState<Member | null>(null);

  useEffect(() => {
    const load = () => {
      try {
        const stored = localStorage.getItem('imadoki-members');
        const list: Member[] = stored ? JSON.parse(stored) : defaultMembers;
        const me = list.find(m => m.id === 'ceo') ?? list.find(m => !m.isAI) ?? null;
        setSelf(me);
      } catch { setSelf(null); }
    };
    load();
    // re-read when storage changes (e.g. after profile edit)
    window.addEventListener('storage', load);
    // also listen for custom event from members page
    window.addEventListener('imadoki-members-updated', load);
    return () => {
      window.removeEventListener('storage', load);
      window.removeEventListener('imadoki-members-updated', load);
    };
  }, []);

  return (
    <aside
      className="fixed left-0 top-0 h-screen z-40 flex flex-col transition-all duration-300"
      style={{
        width: collapsed ? '64px' : '220px',
        background: 'rgba(8,8,18,0.98)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', fontSize: '16px' }}
        >✦</div>
        {!collapsed && (
          <div>
            <div className="text-sm font-bold text-white">IMADOKI</div>
            <div className="text-xs font-medium" style={{ color: '#818cf8' }}>AI Office</div>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className="ml-auto text-xs text-gray-600 hover:text-gray-400 transition-colors">
          {collapsed ? '▶' : '◀'}
        </button>
      </div>

      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map(item => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div
                className="flex items-center gap-3 px-2 py-2.5 rounded-lg transition-all duration-150 cursor-pointer group"
                style={{
                  background: active ? 'rgba(99,102,241,0.12)' : 'transparent',
                  borderLeft: `2px solid ${active ? '#6366f1' : 'transparent'}`,
                  color: active ? '#a5b4fc' : '#6b7280',
                }}
              >
                <span className="text-lg flex-shrink-0">{item.icon}</span>
                {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0"
            style={{ background: 'rgba(99,102,241,0.15)' }}
          >{self?.avatar ?? '👩‍💼'}</div>
          {!collapsed && (
            <div>
              <div className="text-xs text-white font-medium">{self?.name ?? '—'}</div>
              <div className="text-xs" style={{ color: '#6b7280' }}>{self?.role?.split('/')[0]?.trim() ?? 'CEO'}</div>
            </div>
          )}
          {!collapsed && <div className="ml-auto w-2 h-2 rounded-full bg-green-400" style={{ boxShadow: '0 0 6px #4ade80' }} />}
        </div>
      </div>
    </aside>
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <main
        className="min-h-screen transition-all duration-300"
        style={{ marginLeft: collapsed ? '64px' : '220px' }}
      >
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
