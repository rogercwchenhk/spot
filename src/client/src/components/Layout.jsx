import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  ClipboardList, Search, Award, Globe, Settings, LogOut, Menu, X, User, Bell,
} from 'lucide-react';
import { cn } from '../lib/utils';

const navItems = [
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
    <div className="min-h-screen flex flex-col">
      {/* 顶栏 */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button className="lg:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <h1 className="text-base font-semibold tracking-tight">客户雷达</h1>
        </div>
        <div className="flex items-center gap-4">
          <Bell size={18} className="text-gray-500 cursor-pointer hover:text-gray-700" />
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <User size={16} />
            <span className="hidden sm:inline">{user?.email}</span>
            <span className={cn(
              'text-xs px-1.5 py-0.5 rounded',
              isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
            )}>
              {isAdmin ? '管理员' : '销售'}
            </span>
          </div>
          <button onClick={logout} className="text-gray-500 hover:text-gray-700" title="登出">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* 侧边栏 (桌面) */}
        <aside className={cn(
          'fixed lg:sticky top-14 left-0 z-20 w-56 h-[calc(100vh-3.5rem)] bg-white border-r border-gray-200',
          'transition-transform lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}>
          <nav className="flex flex-col gap-1 p-3">
            {visibleItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* 遮罩 (移动端) */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/30 z-10 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* 主内容区 */}
        <main className="flex-1 p-4 lg:p-6 max-w-7xl w-full">
          <Outlet />
        </main>
      </div>

      {/* 底部 Tab 栏 (移动端) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex lg:hidden z-30">
        {visibleItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => cn(
              'flex-1 flex flex-col items-center py-2 text-xs',
              isActive ? 'text-gray-900 font-medium' : 'text-gray-500'
            )}
          >
            <item.icon size={20} />
            <span className="mt-0.5">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* 移动端底部留白 */}
      <div className="h-14 lg:hidden" />
    </div>
  );
}
