import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { CheckCircle2 } from 'lucide-react';

export default function ResetPassword() {
  const { updatePassword } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('密码至少 6 位'); return; }
    if (password !== confirm) { setError('两次密码不一致'); return; }
    setLoading(true);
    try {
      await updatePassword(password);
      setDone(true);
      toast.success('密码已更新');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message || '更新失败');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={24} />
          </div>
          <h2 className="text-lg font-semibold text-slate-800 mb-1">密码已更新</h2>
          <p className="text-sm text-slate-400">2 秒后跳转到登录页...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-lg font-bold">R</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-800">设置新密码</h1>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-6 space-y-4">
          {error && (
            <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">新密码</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"
              placeholder="至少 6 位" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">确认密码</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"
              placeholder="再次输入" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm shadow-indigo-600/20">
            {loading ? '更新中...' : '更新密码'}
          </button>
        </form>
      </div>
    </div>
  );
}
