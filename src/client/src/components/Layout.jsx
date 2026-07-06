import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import {
  LayoutDashboard, ClipboardList, Search, Award, FileText, BarChart3,
  Globe, Settings, LogOut, Menu, X, MoreHorizontal, WifiOff,
} from 'lucide-react';
import { cn } from '../lib/utils';
import NotificationBell from './NotificationBell';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: '工作台' },
  { to: '/', icon: ClipboardList, label: '标讯' },
  { to: '/search', icon: Search, label: '搜索' },
  { to: '/qualifications', icon: Award, label: '资质' },
  { to: '/contracts', icon: FileText, label: '合同' },
  { to: '/reports', icon: BarChart3, label: '报表' },
  { to: '/platforms', icon: Globe, label: '平台', adminOnly: true },
  { to: '/settings', icon: Settings, label: '设置', adminOnly: true },
];

const MOBILE_TAB_COUNT = 4; // first 4 + "更多"

export default function Layout() {
  const { user, role, isAdmin, canManageQualifications, logout } = useAuth();
  const online = useOnlineStatus();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const visibleItems = navItems.filter(item => !item.adminOnly || isAdmin);
  const mobileTabs = visibleItems.slice(0, MOBILE_TAB_COUNT);
  const moreItems = visibleItems.slice(MOBILE_TAB_COUNT);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* 离线提示条 */}
      {!online && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white text-xs font-medium text-center py-1.5 flex items-center justify-center gap-1.5">
          <WifiOff size={12} />
          当前处于离线模式
        </div>
      )}

      {/* 顶栏 */}
      <header className={cn(
        'h-14 bg-white border-b border-slate-200/80 flex items-center justify-between px-4 sticky z-30 backdrop-blur-sm bg-white/95',
        !online ? 'top-6' : 'top-0'
      )}>
        <div className="flex items-center gap-3">
          <button className="lg:hidden text-slate-500 hover:text-slate-700" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label={sidebarOpen ? "关闭菜单" : "打开菜单"}>
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">R</span>
            </div>
            <h1 className="text-base font-semibold tracking-tight text-slate-800">客户雷达</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-slate-200">
            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold">
              {(user?.email || 'U')[0].toUpperCase()}
            </div>
            <span className="text-sm text-slate-600 max-w-[120px] truncate">{user?.email}</span>
            <span className={cn(
              'text-[10px] font-medium px-1.5 py-0.5 rounded-md uppercase tracking-wider',
              isAdmin ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'
            )}>
              {role === 'admin' ? 'Admin' : role === 'hr' ? 'HR' : role === 'presales' ? 'PreSales' : 'Sales'}
            </span>
          </div>
          <button onClick={logout} className="p-2 text-slate-400 hover:text-rose-500 transition-colors rounded-lg hover:bg-rose-50" aria-label="登出">
            <LogOut size={17} />
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* 侧边栏 (桌面) */}
        <aside className={cn(
          'fixed lg:sticky left-0 z-20 w-56 bg-white border-r border-slate-200/80',
          'transition-transform lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          !online ? 'top-[5.5rem]' : 'top-14',
          'h-[calc(100vh-var(--header-h))]'
        )} style={{ '--header-h': !online ? '5.5rem' : '3.5rem' }}>
          <nav className="flex flex-col gap-0.5 p-3 pt-4">
            {visibleItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                )}
              >
                <item.icon size={18} strokeWidth={1.8} />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* 遮罩 (移动端) */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-10 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* 主内容区 */}
        <main className={cn('flex-1 p-4 lg:p-6 max-w-7xl w-full', !online && 'mt-6')}>
          <Outlet />
        </main>
      </div>

      {/* 底部 Tab 栏 (移动端) */}
      <nav
        className={cn(
          'fixed left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-slate-200/80 flex lg:hidden z-30',
          !online ? 'bottom-0' : 'bottom-0'
        )}
        aria-label="移动端导航"
      >
        {mobileTabs.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => cn(
              'flex-1 flex flex-col items-center py-2.5 text-xs transition-colors',
              isActive ? 'text-indigo-600 font-medium' : 'text-slate-400'
            )}
          >
            <item.icon size={20} strokeWidth={1.8} />
            <span className="mt-0.5">{item.label}</span>
          </NavLink>
        ))}
        {/* 更多按钮 */}
        {moreItems.length > 0 && (
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className="flex-1 flex flex-col items-center py-2.5 text-xs text-slate-400 transition-colors"
            aria-label="更多菜单"
          >
            <MoreHorizontal size={20} />
            <span className="mt-0.5">更多</span>
          </button>
        )}
      </nav>

      {/* 更多菜单弹出层 */}
      {moreOpen && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={() => setMoreOpen(false)} />
          <div className="fixed bottom-14 left-0 right-0 bg-white border-t border-slate-200 z-50 lg:hidden safe-area-pb">
            <div className="grid grid-cols-4 gap-1 p-3">
              {moreItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) => cn(
                    'flex flex-col items-center py-3 rounded-lg text-xs transition-colors',
                    isActive ? 'text-indigo-600 bg-indigo-50 font-medium' : 'text-slate-500 hover:bg-slate-50'
                  )}
                >
                  <item.icon size={20} strokeWidth={1.8} />
                  <span className="mt-1">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </>
      )}

      {/* 移动端底部留白 */}
      <div className="h-14 lg:hidden" />
    </div>
  );
}
