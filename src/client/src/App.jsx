import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ToastProvider } from './hooks/useToast';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';

// ── 路由级懒加载（B8）──────────────────────────────────────
// 登录页保持同步导入（首屏入口）
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// 业务页面懒加载
const Dashboard = lazy(() => import('./pages/Dashboard'));
const NoticeList = lazy(() => import('./pages/NoticeList'));
const NoticeDetail = lazy(() => import('./pages/NoticeDetail'));
const Search = lazy(() => import('./pages/Search'));
const Qualifications = lazy(() => import('./pages/Qualifications'));
const Contracts = lazy(() => import('./pages/Contracts'));
const Reports = lazy(() => import('./pages/Reports'));
const Platforms = lazy(() => import('./pages/Platforms'));
const Settings = lazy(() => import('./pages/Settings'));

// ── 加载骨架 ──────────────────────────────────────────
function PageLoading() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="flex items-center gap-3 text-slate-400 text-sm">
        <span className="w-5 h-5 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
        <span>加载中...</span>
      </div>
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-slate-400 text-sm">
          <span className="w-4 h-4 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin" />
          加载中...
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  return children;
}

// ── ErrorBoundary 包装的 Suspense 路由 ──────────────────
function SuspenseRoute({ children }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoading />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
              <Routes>
                {/* 公开页面（同步加载） */}
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                {/* 受保护页面（懒加载） */}
                <Route
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="dashboard" element={<SuspenseRoute><Dashboard /></SuspenseRoute>} />
                  <Route index element={<SuspenseRoute><NoticeList /></SuspenseRoute>} />
                  <Route path="notices/:id" element={<SuspenseRoute><NoticeDetail /></SuspenseRoute>} />
                  <Route path="search" element={<SuspenseRoute><Search /></SuspenseRoute>} />
                  <Route path="qualifications" element={<SuspenseRoute><Qualifications /></SuspenseRoute>} />
                  <Route path="contracts" element={<SuspenseRoute><Contracts /></SuspenseRoute>} />
                  <Route path="reports" element={<SuspenseRoute><Reports /></SuspenseRoute>} />
                  <Route path="platforms" element={<ProtectedRoute adminOnly><SuspenseRoute><Platforms /></SuspenseRoute></ProtectedRoute>} />
                  <Route path="settings" element={<ProtectedRoute adminOnly><SuspenseRoute><Settings /></SuspenseRoute></ProtectedRoute>} />
                </Route>
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
