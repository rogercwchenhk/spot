import { useEffect, useState } from 'react';
import { radarApi } from '../lib/api';

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
      <h2 className="text-lg font-semibold mb-4">平台管理</h2>

      {loading ? (
        <div className="text-center text-gray-500 py-8">加载中...</div>
      ) : platforms.length === 0 ? (
        <div className="text-center text-gray-500 py-8">暂无平台数据</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">平台名称</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">URL</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">类型</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">反爬等级</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {platforms.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium">{p.platform_name}</td>
                  <td className="px-4 py-2.5 text-xs text-blue-600 truncate max-w-[200px]">
                    <a href={p.base_url} target="_blank" rel="noopener noreferrer">{p.base_url}</a>
                  </td>
                  <td className="px-4 py-2.5">{p.platform_type}</td>
                  <td className="px-4 py-2.5">{p.anti_bot_level || '-'}</td>
                  <td className="px-4 py-2.5">
                    <span className={p.is_active ? 'badge-active text-xs px-2 py-0.5 rounded-full' : 'badge-expired text-xs px-2 py-0.5 rounded-full'}>
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
