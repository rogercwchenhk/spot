import { useEffect, useState } from 'react';
import { radarApi } from '../lib/api';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { ArrowRight, SlidersHorizontal } from 'lucide-react';

const LEVEL_CONFIG = {
  strong: { label: '强推', cls: 'badge-strong' },
  yes: { label: '可以投', cls: 'badge-yes' },
  risky: { label: '风险', cls: 'badge-risky' },
  no: { label: '不建议', cls: 'badge-no' },
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
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">标讯列表</h2>
          <p className="text-sm text-slate-400 mt-0.5">共 {total} 条标讯</p>
        </div>
      </div>

      {/* 等级筛选 Tab */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
        {[{ value: '', label: '全部' },
          { value: 'strong', label: '强推' },
          { value: 'yes', label: '可以投' },
          { value: 'risky', label: '风险' },
          { value: 'no', label: '不建议' },
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => { setLevel(tab.value); setPage(1); }}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
              level === tab.value
                ? 'bg-slate-800 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 标讯卡片列表 */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl border border-slate-200/80 p-4 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-3/4 mb-3" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : notices.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-slate-400">暂无标讯数据</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {notices.map(notice => {
            const match = Array.isArray(notice.match_result) ? notice.match_result[0] : notice.match_result;
            const levelInfo = match ? LEVEL_CONFIG[match.recommend_level] : null;

            return (
              <Link
                key={notice.id}
                to={`/notices/${notice.id}`}
                className="flex items-center gap-4 bg-white rounded-xl border border-slate-200/80 px-4 py-3.5 hover:border-indigo-200 hover:shadow-sm transition-all group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    {levelInfo && (
                      <span className={cn('inline-block text-[11px] font-medium px-2 py-0.5 rounded-md', levelInfo.cls)}>
                        {levelInfo.label}
                      </span>
                    )}
                    {match && (
                      <span className="text-[11px] text-slate-400">
                        扣分 {match.total_deduction}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-medium text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">{notice.title}</h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-slate-400">
                    {notice.budget_amount > 0 && <span>¥{notice.budget_amount}万</span>}
                    <span>{notice.city || notice.region_scope || '-'}</span>
                    {notice.end_date && <span>截止 {new Date(notice.end_date).toLocaleDateString('zh-CN')}</span>}
                  </div>
                  {notice.ai_extracted_fields?.tech_keywords?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {notice.ai_extracted_fields.tech_keywords.slice(0, 4).map(kw => (
                        <span key={kw} className="text-[11px] bg-slate-50 text-slate-500 px-2 py-0.5 rounded-md">
                          {kw}
                        </span>
                      ))}
                      {notice.ai_extracted_fields.tech_keywords.length > 4 && (
                        <span className="text-[11px] text-slate-300">+{notice.ai_extracted_fields.tech_keywords.length - 4}</span>
                      )}
                    </div>
                  )}
                </div>
                <ArrowRight size={16} className="shrink-0 text-slate-300 group-hover:text-indigo-400 transition-colors" />
              </Link>
            );
          })}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            className="px-3.5 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-30 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            上一页
          </button>
          <span className="text-sm text-slate-400">{page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            className="px-3.5 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-30 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
