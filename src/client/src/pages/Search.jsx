import { useState } from 'react';
import { radarApi } from '../lib/api';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Search as SearchIcon, ArrowRight } from 'lucide-react';

const LEVEL_CONFIG = {
  strong: { label: '强推', cls: 'badge-strong' },
  yes: { label: '可以投', cls: 'badge-yes' },
  risky: { label: '风险', cls: 'badge-risky' },
  no: { label: '不建议', cls: 'badge-no' },
};

const HOT_KEYWORDS = ['运维', '小型机', '存储', '数据库', '驻场', '桌面', '网络', '服务器'];

export default function Search() {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = (kw) => {
    const q = kw || keyword;
    if (!q.trim()) return;
    setKeyword(q);
    setLoading(true);
    setSearched(true);
    radarApi.get('/notices', { params: { keyword: q, pageSize: 50 } })
      .then(res => {
        setResults(res.data || []);
        setTotal(res.total || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-800 mb-5">搜索标讯</h2>

      <div className="flex gap-2 mb-5">
        <div className="relative flex-1">
          <SearchIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doSearch()}
            placeholder="输入关键词搜索..."
            className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"
          />
        </div>
        <button
          onClick={() => doSearch()}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-600/20"
        >
          搜索
        </button>
      </div>

      {/* 热门标签 */}
      {!searched && (
        <div className="mb-6">
          <div className="text-xs text-slate-400 mb-2.5 uppercase tracking-wider font-medium">热门关键词</div>
          <div className="flex flex-wrap gap-2">
            {HOT_KEYWORDS.map(kw => (
              <button
                key={kw}
                onClick={() => doSearch(kw)}
                className="text-sm bg-white border border-slate-200 text-slate-600 px-3.5 py-1.5 rounded-lg hover:border-indigo-300 hover:text-indigo-600 transition-colors"
              >
                {kw}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 搜索结果 */}
      {loading ? (
        <div className="space-y-2.5">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-slate-200/80 p-4 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-3/4 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : searched && results.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-slate-400">未找到相关标讯</p>
        </div>
      ) : searched ? (
        <div>
          <p className="text-xs text-slate-400 mb-3">找到 {total} 条结果</p>
          <div className="space-y-2.5">
            {results.map(notice => {
              const match = Array.isArray(notice.match_result) ? notice.match_result[0] : notice.match_result;
              const levelInfo = match ? LEVEL_CONFIG[match.recommend_level] : null;
              return (
                <Link
                  key={notice.id}
                  to={`/notices/${notice.id}`}
                  className="flex items-center gap-4 bg-white rounded-xl border border-slate-200/80 px-4 py-3.5 hover:border-indigo-200 hover:shadow-sm transition-all group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {levelInfo && (
                        <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-md', levelInfo.cls)}>
                          {levelInfo.label}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-medium text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">{notice.title}</h3>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-slate-400">
                      {notice.budget_amount > 0 && <span>{notice.budget_amount}万</span>}
                      <span>{notice.city || '-'}</span>
                      {match && <span>扣分 {match.total_deduction}</span>}
                    </div>
                  </div>
                  <ArrowRight size={16} className="shrink-0 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
