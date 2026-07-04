import { useState } from 'react';
import { radarApi } from '../lib/api';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Search as SearchIcon } from 'lucide-react';

const LEVEL_CONFIG = {
  strong: { label: '强推', emoji: '🟢', cls: 'badge-strong' },
  yes: { label: '可以投', emoji: '🟡', cls: 'badge-yes' },
  risky: { label: '风险', emoji: '🟠', cls: 'badge-risky' },
  no: { label: '不建议', emoji: '🔴', cls: 'badge-no' },
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
      <h2 className="text-lg font-semibold mb-4">搜索标讯</h2>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doSearch()}
            placeholder="输入关键词搜索..."
            className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => doSearch()}
          className="bg-gray-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800"
        >
          搜索
        </button>
      </div>

      {/* 热门标签 */}
      {!searched && (
        <div className="mb-6">
          <div className="text-sm text-gray-500 mb-2">热门关键词</div>
          <div className="flex flex-wrap gap-2">
            {HOT_KEYWORDS.map(kw => (
              <button
                key={kw}
                onClick={() => doSearch(kw)}
                className="text-sm bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-100"
              >
                {kw}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 搜索结果 */}
      {loading ? (
        <div className="text-center text-gray-500 py-8">搜索中...</div>
      ) : searched && results.length === 0 ? (
        <div className="text-center text-gray-500 py-8">未找到相关标讯</div>
      ) : searched ? (
        <div>
          <div className="text-sm text-gray-500 mb-3">找到 {total} 条结果</div>
          <div className="space-y-3">
            {results.map(notice => {
              const match = Array.isArray(notice.match_result) ? notice.match_result[0] : notice.match_result;
              const levelInfo = match ? LEVEL_CONFIG[match.recommend_level] : null;
              return (
                <Link
                  key={notice.id}
                  to={`/notices/${notice.id}`}
                  className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
                >
                  {levelInfo && (
                    <span className={cn('inline-block text-xs px-2 py-0.5 rounded-full mb-2', levelInfo.cls)}>
                      {levelInfo.emoji} {levelInfo.label}
                    </span>
                  )}
                  <h3 className="text-sm font-medium text-gray-900 line-clamp-2">{notice.title}</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                    {notice.budget_amount > 0 && <span>¥{notice.budget_amount}万</span>}
                    <span>{notice.city || '-'}</span>
                    {match && <span>扣分 {match.total_deduction}</span>}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
