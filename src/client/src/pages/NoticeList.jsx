import { useEffect, useState } from 'react';
import { radarApi } from '../lib/api';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { ArrowRight } from 'lucide-react';

const LEVEL_CONFIG = {
  strong: { label: '强推', cls: 'badge-strong', barColor: 'bg-emerald-500' },
  yes:    { label: '可以投', cls: 'badge-yes',    barColor: 'bg-sky-500' },
  risky:  { label: '风险',   cls: 'badge-risky',  barColor: 'bg-amber-500' },
  no:     { label: '不建议', cls: 'badge-no',     barColor: 'bg-rose-500' },
};

const STATUS_CONFIG = {
  new:       { label: '新标讯',   cls: 'bg-slate-100 text-slate-600' },
  following: { label: '跟进中',   cls: 'bg-blue-100 text-blue-600' },
  ignored:   { label: '已忽略',   cls: 'bg-slate-100 text-slate-400' },
  bidding:   { label: '已投标',   cls: 'bg-purple-100 text-purple-600' },
  won:       { label: '已中标',   cls: 'bg-emerald-100 text-emerald-600' },
  lost:      { label: '未中标',   cls: 'bg-rose-100 text-rose-600' },
};

const SOURCE_LABELS = {
  zhiliao: '知了',
  scrapling: '爬虫',
  qianlima: '千里马',
  gdzzzb: '广东招标',
};

function MatchScoreBar({ match }) {
  if (!match) return null;
  const score = 100 - (match.total_deduction || 0);
  const pct = Math.max(0, Math.min(100, score));
  const levelCfg = LEVEL_CONFIG[match.recommend_level];

  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', levelCfg?.barColor || 'bg-slate-300')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] font-medium text-slate-500 tabular-nums w-7 text-right">{pct}</span>
    </div>
  );
}

export default function NoticeList() {
  const [notices, setNotices] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [level, setLevel] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const pageSize = 20;

  useEffect(() => {
    setLoading(true);
    const params = { page, pageSize };
    if (level) params.recommend_level = level;
    if (status) params.notice_status = status;
    radarApi.get('/notices', { params })
      .then(res => {
        setNotices(res.data || []);
        setTotal(res.total || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, level, status]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">标讯列表</h2>
          <p className="text-xs text-slate-400 mt-0.5">共 {total} 条标讯</p>
        </div>
      </div>

      {/* 等级筛选 Tab */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
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
              'px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all',
              level === tab.value
                ? 'bg-slate-800 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 状态筛选 Tab */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
        {[{ value: '', label: '全部状态' },
          { value: 'new', label: '新标讯' },
          { value: 'following', label: '跟进中' },
          { value: 'bidding', label: '已投标' },
          { value: 'won', label: '已中标' },
          { value: 'ignored', label: '已忽略' },
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => { setStatus(tab.value); setPage(1); }}
            className={cn(
              'px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all',
              status === tab.value
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 列表 */}
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
          <p className="text-sm text-slate-400">暂无标讯数据</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {notices.map(notice => {
            const match = Array.isArray(notice.match_result) ? notice.match_result[0] : notice.match_result;
            const levelInfo = match ? LEVEL_CONFIG[match.recommend_level] : null;
            const statusInfo = notice.notice_status ? STATUS_CONFIG[notice.notice_status] : null;
            const sourceLabel = notice.data_source ? (SOURCE_LABELS[notice.data_source] || notice.data_source) : null;

            return (
              <Link
                key={notice.id}
                to={`/notices/${notice.id}`}
                className="block bg-white rounded-xl border border-slate-200/80 px-4 py-3.5 hover:border-indigo-200 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    {/* 标签行 */}
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      {levelInfo && (
                        <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-md', levelInfo.cls)}>
                          {levelInfo.label}
                        </span>
                      )}
                      {statusInfo && notice.notice_status !== 'new' && (
                        <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-md', statusInfo.cls)}>
                          {statusInfo.label}
                        </span>
                      )}
                      {match && (
                        <span className="text-[10px] text-slate-400">
                          扣分 {match.total_deduction}
                        </span>
                      )}
                      {sourceLabel && (
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                          {sourceLabel}
                        </span>
                      )}
                      {notice.notice_type && (
                        <span className="text-[10px] text-slate-400">
                          {notice.notice_type === 'tender' ? '招标' : notice.notice_type === 'result' ? '中标' : notice.notice_type}
                        </span>
                      )}
                    </div>

                    {/* 标题 */}
                    <h3 className="text-xs font-medium text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">{notice.title}</h3>

                    {/* 元数据行 */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-slate-400">
                      {notice.budget_amount > 0 && <span>¥{notice.budget_amount}万</span>}
                      <span>{notice.city || notice.region_scope || '-'}</span>
                      {notice.end_date && <span>截止 {new Date(notice.end_date).toLocaleDateString('zh-CN')}</span>}
                    </div>

                    {/* 技术关键词 */}
                    {notice.ai_extracted_fields?.tech_keywords?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {notice.ai_extracted_fields.tech_keywords.slice(0, 4).map(kw => (
                          <span key={kw} className="text-[10px] bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded-md">
                            {kw}
                          </span>
                        ))}
                        {notice.ai_extracted_fields.tech_keywords.length > 4 && (
                          <span className="text-[10px] text-slate-300">+{notice.ai_extracted_fields.tech_keywords.length - 4}</span>
                        )}
                      </div>
                    )}

                    {/* 匹配分数进度条 */}
                    <MatchScoreBar match={match} />
                  </div>

                  <ArrowRight size={16} className="shrink-0 text-slate-300 group-hover:text-indigo-400 transition-colors mt-1" />
                </div>
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
            className="px-3 py-1 text-xs border border-slate-200 rounded-lg disabled:opacity-30 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            上一页
          </button>
          <span className="text-xs text-slate-400">{page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1 text-xs border border-slate-200 rounded-lg disabled:opacity-30 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
