'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { members as defaultMembers, Member } from '@/lib/data';
import CommandPalette from './CommandPalette';

// Nav groups
const NAV_GROUPS = [
  {
    label: '経営',
    items: [
      { href: '/',              label: 'ダッシュボード', icon: '📊' },
      { href: '/ceo',          label: '社長室',         icon: '👔' },
      { href: '/ceo/data',     label: 'データ入力',     icon: '📥' },
      { href: '/ceo/analysis', label: 'AI分析・承認',   icon: '🔍' },
      { href: '/analytics',   label: 'アナリティクス', icon: '📈' },
      { href: '/finance',     label: '財務・書類',      icon: '💰' },
    ],
  },
  {
    label: 'オフィス',
    items: [
      { href: '/office',    label: 'バーチャルオフィス', icon: '🏢' },
      { href: '/org',       label: '組織図',             icon: '🌐' },
      { href: '/members',   label: 'メンバー',           icon: '👥' },
    ],
  },
  {
    label: 'プロジェクト',
    items: [
      { href: '/projects',  label: 'プロジェクト',   icon: '📁' },
      { href: '/tasks',     label: 'タスク',         icon: '✅' },
      { href: '/workspace', label: 'ワークスペース', icon: '🚀' },
    ],
  },
  {
    label: 'AI',
    items: [
      { href: '/ai-hub', label: 'AIハブ', icon: '🤖' },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap(g => g.items);

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative group/tip flex items-center">
      {children}
      <div className="absolute left-full ml-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white
        opacity-0 group-hover/tip:opacity-100 pointer-events-none transition-opacity duration-150 whitespace-nowrap z-50"
        style={{ background: '#1a1a2e', border: '1px solid rgba(99,102,241,0.3)', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
        {label}
      </div>
    </div>
  );
}

function useBadgeCounts() {
  const [overdueTasks, setOverdueTasks] = useState(0);
  const [pendingAnalysis, setPendingAnalysis] = useState(0);

  useEffect(() => {
    const calc = () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const tasks: { status: string; dueDate?: string }[] = JSON.parse(localStorage.getItem('imadoki-tasks') || '[]');
        setOverdueTasks(tasks.filter(t => t.status !== 'done' && t.dueDate && t.dueDate < today).length);
      } catch { setOverdueTasks(0); }
      try {
        const data = JSON.parse(localStorage.getItem('imadoki-company-data') || 'null');
        setPendingAnalysis(data?.pendingActions?.length ?? 0);
      } catch { setPendingAnalysis(0); }
    };
    calc();
    window.addEventListener('storage', calc);
    window.addEventListener('imadoki-members-updated', calc);
    return () => {
      window.removeEventListener('storage', calc);
      window.removeEventListener('imadoki-members-updated', calc);
    };
  }, []);

  return { overdueTasks, pendingAnalysis };
}

function Sidebar({ collapsed, setCollapsed, onCmdK }: {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  onCmdK: () => void;
}) {
  const pathname = usePathname();
  const [self, setSelf] = useState<Member | null>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { overdueTasks, pendingAnalysis } = useBadgeCounts();

  useEffect(() => {
    const load = () => {
      try {
        const stored = localStorage.getItem('imadoki-members');
        const list: Member[] = stored ? JSON.parse(stored) : defaultMembers;
        setSelf(list.find(m => m.id === 'ceo') ?? list.find(m => !m.isAI) ?? null);
      } catch { setSelf(null); }
    };
    load();
    window.addEventListener('storage', load);
    window.addEventListener('imadoki-members-updated', load);
    return () => {
      window.removeEventListener('storage', load);
      window.removeEventListener('imadoki-members-updated', load);
    };
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => { setIsMobileOpen(false); }, [pathname]);

  const sidebarWidth = collapsed ? '64px' : '220px';

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', fontSize: '16px' }}>✦</div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white">IMADOKI</div>
            <div className="text-xs font-medium" style={{ color: '#818cf8' }}>AI Office</div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto text-xs hover:text-gray-300 transition-colors flex-shrink-0 hidden lg:block"
          style={{ color: '#4b5563' }}
          title={collapsed ? 'サイドバーを開く' : 'サイドバーを閉じる'}
        >
          {collapsed ? '▶' : '◀'}
        </button>
      </div>

      {/* Search / Cmd+K */}
      {!collapsed ? (
        <button onClick={onCmdK}
          className="mx-3 mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all w-[calc(100%-24px)]"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#6b7280' }}>
          <span>🔍</span>
          <span className="flex-1 text-left">検索...</span>
          <kbd className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.06)', color: '#4b5563', fontFamily: 'monospace' }}>⌘K</kbd>
        </button>
      ) : (
        <Tooltip label="検索 (⌘K)">
          <button onClick={onCmdK}
            className="mx-auto mt-3 w-9 h-9 flex items-center justify-center rounded-lg transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#6b7280' }}>
            🔍
          </button>
        </Tooltip>
      )}

      {/* Nav groups */}
      <nav className="flex-1 py-3 px-2 space-y-4 overflow-y-auto">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            {!collapsed && (
              <div className="px-2 mb-1 text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>
                {group.label}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => {
                const active = isActive(pathname, item.href);
                const badge = item.href === '/tasks' ? overdueTasks
                  : item.href === '/ceo/analysis' ? pendingAnalysis
                  : 0;
                const navItem = (
                  <Link key={item.href} href={item.href}>
                    <div className={`flex items-center gap-3 px-2 py-2 rounded-lg transition-all duration-200 ease-out cursor-pointer ${active ? '' : 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-200 hover:translate-x-0.5'}`}
                      style={{
                        background: active ? 'rgba(99,102,241,0.18)' : undefined,
                        borderLeft: `2px solid ${active ? '#6366f1' : 'transparent'}`,
                        color: active ? '#c7d2fe' : undefined,
                        boxShadow: active ? 'inset 0 0 0 1px rgba(99,102,241,0.15)' : undefined,
                        fontWeight: active ? 600 : undefined,
                      }}>
                      <span className="relative text-base flex-shrink-0 w-5 text-center">
                        {item.icon}
                        {badge > 0 && (
                          <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 px-0.5 rounded-full text-white flex items-center justify-center"
                            style={{ background: '#ef4444', fontSize: '9px', lineHeight: 1, fontWeight: 700 }}>
                            {badge > 9 ? '9+' : badge}
                          </span>
                        )}
                      </span>
                      {!collapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
                      {!collapsed && badge > 0 && (
                        <span className="ml-auto min-w-[18px] h-4.5 px-1.5 rounded-full text-white flex items-center justify-center flex-shrink-0"
                          style={{ background: '#ef4444', fontSize: '10px', fontWeight: 700 }}>
                          {badge > 99 ? '99+' : badge}
                        </span>
                      )}
                      {active && !collapsed && badge === 0 && <div className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#6366f1' }} />}
                    </div>
                  </Link>
                );
                return collapsed ? (
                  <Tooltip key={item.href} label={`${item.label}${badge > 0 ? ` (${badge})` : ''}`}>{navItem}</Tooltip>
                ) : navItem;
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Profile */}
      <div className="px-3 py-3 border-t flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        {!collapsed ? (
          <div className="flex items-center gap-2 px-2 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0"
              style={{ background: 'rgba(99,102,241,0.15)' }}>
              {self?.avatar ?? '👩‍💼'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-white font-medium truncate">{self?.name ?? '—'}</div>
              <div className="text-xs truncate" style={{ color: '#6b7280' }}>{self?.role?.split('/')[0]?.trim() ?? 'CEO'}</div>
            </div>
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#22c55e', boxShadow: '0 0 6px #4ade80' }} />
          </div>
        ) : (
          <Tooltip label={self?.name ?? 'CEO'}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm mx-auto relative cursor-default"
              style={{ background: 'rgba(99,102,241,0.15)' }}>
              {self?.avatar ?? '👩‍💼'}
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                style={{ background: '#22c55e', borderColor: '#08080f' }} />
            </div>
          </Tooltip>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-30 lg:hidden" style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setIsMobileOpen(false)} />
      )}

      {/* Mobile hamburger */}
      <button
        className="fixed top-4 left-4 z-50 lg:hidden w-9 h-9 flex items-center justify-center rounded-lg"
        style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)' }}
        onClick={() => setIsMobileOpen(v => !v)}>
        <span className="text-white text-lg">{isMobileOpen ? '✕' : '☰'}</span>
      </button>

      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 h-screen z-40 flex-col transition-all duration-300 hidden lg:flex"
        style={{ width: sidebarWidth, background: 'rgba(8,8,18,0.98)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        <NavContent />
      </aside>

      {/* Mobile sidebar (drawer) */}
      <aside className="fixed left-0 top-0 h-screen z-40 flex flex-col lg:hidden transition-transform duration-300"
        style={{
          width: '220px',
          background: 'rgba(8,8,18,0.99)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          transform: isMobileOpen ? 'translateX(0)' : 'translateX(-100%)',
        }}>
        <NavContent />
      </aside>
    </>
  );
}

// Route-change progress bar
function ProgressBar() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const prevPath = useRef(pathname);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (pathname !== prevPath.current) {
      prevPath.current = pathname;
      setWidth(0);
      setVisible(true);
      // Animate to 80% quickly, then complete
      const t1 = setTimeout(() => setWidth(80), 10);
      const t2 = setTimeout(() => setWidth(100), 300);
      const t3 = setTimeout(() => setVisible(false), 550);
      timerRef.current = t3;
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
  }, [pathname]);

  if (!visible) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-[200] h-0.5 pointer-events-none">
      <div className="h-full transition-all duration-300 ease-out"
        style={{ width: `${width}%`, background: 'linear-gradient(90deg, #6366f1, #a855f7)', boxShadow: '0 0 8px rgba(99,102,241,0.6)' }} />
    </div>
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [cmdKOpen, setCmdKOpen] = useState(false);

  // Global Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdKOpen(v => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div>
      <ProgressBar />
      <CommandPalette open={cmdKOpen} onClose={() => setCmdKOpen(false)} />
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} onCmdK={() => setCmdKOpen(true)} />
      <main className="min-h-screen transition-all duration-300"
        style={{ marginLeft: collapsed ? '64px' : '220px' }}
        // On mobile, no margin (sidebar is a drawer overlay)
      >
        <div className="p-5 lg:p-6 pt-14 lg:pt-6">{children}</div>
      </main>
    </div>
  );
}
