import { useState, useEffect, useRef } from 'react';
import { radarApi } from '../lib/api';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Bell, CheckCheck, Megaphone, Zap, Server, Info } from 'lucide-react';

const TYPE_CONFIG = {
  notice_new:   { icon: Megaphone, color: 'text-sky-600 bg-sky-50' },
  match_strong: { icon: Zap,       color: 'text-amber-600 bg-amber-50' },
  crawl_done:   { icon: Server,    color: 'text-emerald-600 bg-emerald-50' },
  system:       { icon: Info,       color: 'text-slate-600 bg-slate-100' },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}小时前`;
  const days = Math.floor(hrs / 24);
  return `${days}天前`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  // click outside to close
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchNotifications = () => {
    setLoading(true);
    radarApi.get('/notifications', { params: { pageSize: 15 } })
      .then(res => { setItems(res.data || []); setUnreadCount(res.unreadCount || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchNotifications(); }, []);

  const markRead = async (id) => {
    await radarApi.put(`/notifications/${id}/read`);
    setItems(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await radarApi.put('/notifications/read-all');
    setItems(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(!open); if (!open) fetchNotifications(); }}
        className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-100"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
          {/* header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h4 className="text-sm font-semibold text-slate-800">通知</h4>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
                <CheckCheck size={12} /> 全部已读
              </button>
            )}
          </div>

          {/* list */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-sm text-slate-400">加载中...</div>
            ) : items.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-400">暂无通知</div>
            ) : (
              items.map(n => {
                const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.system;
                const Icon = cfg.icon;
                return (
                  <div
                    key={n.id}
                    className={cn(
                      'flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer',
                      !n.is_read && 'bg-indigo-50/30',
                    )}
                    onClick={() => { if (!n.is_read) markRead(n.id); if (n.link) setOpen(false); }}
                  >
                    <div className={cn('shrink-0 w-8 h-8 rounded-lg flex items-center justify-center', cfg.color)}>
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm leading-snug', n.is_read ? 'text-slate-600' : 'text-slate-800 font-medium')}>
                        {n.link ? <Link to={n.link}>{n.title}</Link> : n.title}
                      </p>
                      {n.body && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{n.body}</p>}
                      <p className="text-[11px] text-slate-300 mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.is_read && <span className="shrink-0 w-2 h-2 rounded-full bg-indigo-500 mt-1.5" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
