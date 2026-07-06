import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  LayoutDashboard, ClipboardList, Search, Award, Globe, Settings, LogOut, Menu, X, User, Bell,
} from 'lucide-react';
import { cn } from '../lib/utils';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: '工作台' },
  { to: '/', icon: ClipboardList, label: '标讯' },
  { to: '/search', icon: Search, label: '搜索' },
  { to: '/qualifications', icon: Award, label: '资质' },
  { to: '/platforms', icon: Globe, label: '平台', adminOnly: true },
  { to: '/settings', icon: Settings, label: '设置', adminOnly: true },
];

export default function Layout() {
  const { user, role, isAdmin, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const visibleItems = navItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* 顶栏 */}
      <header className="h-14 bg-white border-b border-slate-200/80 flex items-center justify-between px-4 sticky top-0 z-30 backdrop-blur-sm bg-white/95">
        <div className="flex items-center gap-3">
          <button className="lg:hidden text-slate-500 hover:text-slate-700" onClick={() => setSidebarOpen(!sidebarOpen)}>
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
          <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-100">
            <Bell size={18} />
          </button>
          <div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-slate-200">
            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold">
              {(user?.email || 'U')[0].toUpperCase()}
            </div>
            <span className="text-sm text-slate-600 max-w-[120px] truncate">{user?.email}</span>
            <span className={cn(
              'text-[10px] font-medium px-1.5 py-0.5 rounded-md uppercase tracking-wider',
              isAdmin ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'
            )}>
              {isAdmin ? 'Admin' : 'Sales'}
            </span>
          </div>
          <button onClick={logout} className="p-2 text-slate-400 hover:text-rose-500 transition-colors rounded-lg hover:bg-rose-50" title="登出">
            <LogOut size={17} />
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* 侧边栏 (桌面) */}
        <aside className={cn(
          'fixed lg:sticky top-14 left-0 z-20 w-56 h-[calc(100vh-3.5rem)] bg-white border-r border-slate-200/80',
          'transition-transform lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}>
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
        <main className="flex-1 p-4 lg:p-6 max-w-7xl w-full">
          <Outlet />
        </main>
      </div>

      {/* 底部 Tab 栏 (移动端) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-slate-200/80 flex lg:hidden z-30">
        {visibleItems.map(item => (
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
      </nav>

      {/* 移动端底部留白 */}
      <div className="h-14 lg:hidden" />
    </div>
  );
}
