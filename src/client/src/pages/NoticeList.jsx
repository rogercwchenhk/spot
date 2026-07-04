import { useEffect, useState } from 'react';
import { radarApi } from '../lib/api';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

const LEVEL_CONFIG = {
  strong: { label: '强推', emoji: '🟢', cls: 'badge-strong' },
  yes: { label: '可以投', emoji: '🟡', cls: 'badge-yes' },
  risky: { label: '风险', emoji: '🟠', cls: 'badge-risky' },
  no: { label: '不建议', emoji: '🔴', cls: 'badge-no' },
};

export default function NoticeList() {
  const [notices, setNotices] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [level, setLevel] = useState('');
  const [loading, setLoading] = useState(true);
  const pageSize = 20;

  useEffect(() => {
    setLoading(true);
    const params = { page, pageSize };
    if (level) params.recommend_level = level;
    radarApi.get('/notices', { params })
      .then(res => {
        setNotices(res.data || []);
        setTotal(res.total || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, level]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">标讯列表</h2>
        <span className="text-sm text-gray-500">共 {total} 条</span>
      </div>

      {/* 等级筛选 Tab */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {[{ value: '', label: '全部' },
          { value: 'strong', label: '🟢 强推' },
          { value: 'yes', label: '🟡 可以投' },
          { value: 'risky', label: '🟠 风险' },
          { value: 'no', label: '🔴 不建议' },
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => { setLevel(tab.value); setPage(1); }}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
              level === tab.value
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 标讯卡片列表 */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : notices.length === 0 ? (
        <div className="text-center text-gray-500 py-12">暂无标讯数据</div>
      ) : (
        <div className="space-y-3">
          {notices.map(notice => {
            const match = Array.isArray(notice.match_result) ? notice.match_result[0] : notice.match_result;
            const levelInfo = match ? LEVEL_CONFIG[match.recommend_level] : null;

            return (
              <Link
                key={notice.id}
                to={`/notices/${notice.id}`}
                className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {levelInfo && (
                      <span className={cn('inline-block text-xs px-2 py-0.5 rounded-full mb-2', levelInfo.cls)}>
                        {levelInfo.emoji} {levelInfo.label}
                      </span>
                    )}
                    <h3 className="text-sm font-medium text-gray-900 line-clamp-2">{notice.title}</h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                      {notice.budget_amount > 0 && <span>¥{(notice.budget_amount).toFixed(0)}万</span>}
                      <span>{notice.city || notice.region_scope || '-'}</span>
                      {notice.end_date && <span>截止 {new Date(notice.end_date).toLocaleDateString('zh-CN')}</span>}
                      {match && <span>扣分 {match.total_deduction}</span>}
                    </div>
                    {/* AI 提取的技术关键词 */}
                    {notice.ai_extracted_fields?.tech_keywords?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {notice.ai_extracted_fields.tech_keywords.map(kw => (
                          <span key={kw} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
          >
            上一页
          </button>
          <span className="text-sm text-gray-500">{page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
