import { useEffect, useState } from 'react';
import { radarApi } from '../lib/api';
import { ExternalLink } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Platforms() {
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    radarApi.get('/platforms')
      .then(res => setPlatforms(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-800">平台管理</h2>
        <p className="text-sm text-slate-400 mt-0.5">已接入的招标数据源平台</p>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-8">
          <div className="text-center text-slate-400">加载中...</div>
        </div>
      ) : platforms.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-8">
          <div className="text-center text-slate-400">暂无平台数据</div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">平台名称</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">URL</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">类型</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">反爬等级</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {platforms.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{p.platform_name}</td>
                  <td className="px-4 py-3">
                    <a href={p.base_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 max-w-[200px] truncate transition-colors">
                      {p.base_url}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.platform_type}</td>
                  <td className="px-4 py-3 text-slate-600">{p.anti_bot_level || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'text-xs font-medium px-2.5 py-1 rounded-md',
                      p.is_active ? 'badge-active' : 'badge-expired'
                    )}>
                      {p.is_active ? '已接入' : '未启用'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
