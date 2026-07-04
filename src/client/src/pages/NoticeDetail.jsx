import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { radarApi } from '../lib/api';
import { cn } from '../lib/utils';
import { ArrowLeft, ExternalLink } from 'lucide-react';

const LEVEL_CONFIG = {
  strong: { label: '强推', emoji: '🟢', cls: 'badge-strong' },
  yes: { label: '可以投', emoji: '🟡', cls: 'badge-yes' },
  risky: { label: '风险', emoji: '🟠', cls: 'badge-risky' },
  no: { label: '不建议', emoji: '🔴', cls: 'badge-no' },
};

export default function NoticeDetail() {
  const { id } = useParams();
  const [notice, setNotice] = useState(null);
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    radarApi.get(`/notices/${id}`)
      .then(res => {
        setNotice(res.data);
        const m = Array.isArray(res.data?.match_result) ? res.data.match_result[0] : res.data?.match_result;
        setMatch(m);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="animate-pulse space-y-4"><div className="h-8 bg-gray-200 rounded w-2/3" /><div className="h-32 bg-gray-100 rounded" /></div>;
  }

  if (!notice) {
    return <div className="text-center text-gray-500 py-12">标讯未找到</div>;
  }

  const levelInfo = match ? LEVEL_CONFIG[match.recommend_level] : null;
  const extracted = notice.ai_extracted_fields || {};

  return (
    <div>
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-4">
        <ArrowLeft size={16} /> 返回列表
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 左侧：标讯信息 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            {levelInfo && (
              <span className={cn('inline-block text-xs px-2 py-0.5 rounded-full mb-3', levelInfo.cls)}>
                {levelInfo.emoji} {levelInfo.label}
              </span>
            )}
            <h1 className="text-lg font-semibold text-gray-900 mb-4">{notice.title}</h1>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">预算：</span>{notice.budget_amount ? `¥${notice.budget_amount}万` : '未公开'}</div>
              <div><span className="text-gray-500">地区：</span>{notice.city || notice.region_scope || '-'}</div>
              <div><span className="text-gray-500">发布：</span>{notice.publish_date || '-'}</div>
              <div><span className="text-gray-500">截止：</span>{notice.end_date || '-'}</div>
              <div><span className="text-gray-500">采购单位：</span>{notice.tenderee || '-'}</div>
              <div><span className="text-gray-500">代理机构：</span>{notice.tender_agent || '-'}</div>
            </div>

            {notice.source_url && (
              <a href={notice.source_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-4">
                <ExternalLink size={14} /> 查看原文
              </a>
            )}
          </div>

          {/* AI 提取结果 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">AI 结构化提取</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">项目类型：</span>{extracted.project_type || '-'}</div>
              <div><span className="text-gray-500">行业：</span>{extracted.industry_type || '-'}</div>
              <div><span className="text-gray-500">来源：</span>{extracted.source || '-'}</div>
            </div>
            {extracted.tech_keywords?.length > 0 && (
              <div className="mt-3">
                <span className="text-sm text-gray-500">技术关键词：</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {extracted.tech_keywords.map(kw => (
                    <span key={kw} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{kw}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 右侧：匹配结果 */}
        <div className="space-y-4">
          {match ? (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">匹配结果</h2>
              <div className={cn('text-center py-4 rounded-lg mb-4', levelInfo?.cls)}>
                <div className="text-2xl font-bold">{100 - match.total_deduction}分</div>
                <div className="text-sm mt-1">{levelInfo?.emoji} {levelInfo?.label}</div>
              </div>

              <div className="space-y-3">
                {(match.match_details || []).map((d, i) => (
                  <div key={i} className="text-sm">
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-700">{d.dimension}</span>
                      <span className="font-medium">{d.score}/{d.max_score}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className={cn('h-1.5 rounded-full',
                          d.score / d.max_score >= 0.8 ? 'bg-green-500' :
                          d.score / d.max_score >= 0.5 ? 'bg-blue-500' : 'bg-orange-500'
                        )}
                        style={{ width: `${(d.score / d.max_score) * 100}%` }}
                      />
                    </div>
                    {d.matched && Array.isArray(d.matched) && d.matched.length > 0 && (
                      <div className="text-xs text-gray-500 mt-1">匹配: {d.matched.join('、')}</div>
                    )}
                    {d.unmatched && d.unmatched.length > 0 && (
                      <div className="text-xs text-orange-500 mt-1">缺口: {d.unmatched.join('、')}</div>
                    )}
                  </div>
                ))}
              </div>

              {match.risk_notes?.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <div className="text-xs text-orange-600 space-y-1">
                    {match.risk_notes.map((note, i) => <div key={i}>⚠ {note}</div>)}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-5 text-sm text-gray-500">
              暂无匹配结果
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
