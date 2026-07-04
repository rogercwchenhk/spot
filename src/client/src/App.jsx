import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Login from './pages/Login';
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500 text-sm">加载中...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
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
              <Route index element={<NoticeList />} />
              <Route path="notices/:id" element={<NoticeDetail />} />
              <Route path="search" element={<Search />} />
              <Route path="qualifications" element={<Qualifications />} />
              <Route path="platforms" element={<ProtectedRoute adminOnly><Platforms /></ProtectedRoute>} />
              <Route path="settings" element={<ProtectedRoute adminOnly><Settings /></ProtectedRoute>} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
