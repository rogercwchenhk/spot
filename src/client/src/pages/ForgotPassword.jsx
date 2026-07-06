import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ArrowLeft, Mail } from 'lucide-react';

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.message || '发送失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-lg font-bold">R</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-800">重置密码</h1>
          <p className="text-sm text-slate-400 mt-1">输入注册邮箱，我们将发送重置链接</p>
        </div>

        {sent ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <Mail size={22} />
            </div>
            <p className="text-sm text-slate-700 mb-1">重置邮件已发送</p>
            <p className="text-xs text-slate-400 mb-4">请查看 {email} 的收件箱</p>
            <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              <ArrowLeft size={14} /> 返回登录
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-6 space-y-4">
            {error && (
              <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">邮箱</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"
                placeholder="your@email.com" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm shadow-indigo-600/20">
              {loading ? '发送中...' : '发送重置链接'}
            </button>
            <Link to="/login" className="block text-center text-sm text-slate-400 hover:text-slate-600">
              <ArrowLeft size={12} className="inline mr-1" /> 返回登录
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
