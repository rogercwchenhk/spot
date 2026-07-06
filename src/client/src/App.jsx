import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ToastProvider } from './hooks/useToast';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NoticeList from './pages/NoticeList';
import NoticeDetail from './pages/NoticeDetail';
import Search from './pages/Search';
import Qualifications from './pages/Qualifications';
import Platforms from './pages/Platforms';
import Settings from './pages/Settings';

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

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="dashboard" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
                  <Route index element={<ErrorBoundary><NoticeList /></ErrorBoundary>} />
                  <Route path="notices/:id" element={<ErrorBoundary><NoticeDetail /></ErrorBoundary>} />
                  <Route path="search" element={<ErrorBoundary><Search /></ErrorBoundary>} />
                  <Route path="qualifications" element={<ErrorBoundary><Qualifications /></ErrorBoundary>} />
                  <Route path="platforms" element={<ProtectedRoute adminOnly><ErrorBoundary><Platforms /></ErrorBoundary></ProtectedRoute>} />
                  <Route path="settings" element={<ProtectedRoute adminOnly><ErrorBoundary><Settings /></ErrorBoundary></ProtectedRoute>} />
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
