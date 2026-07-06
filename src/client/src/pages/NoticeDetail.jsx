import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { radarApi } from '../lib/api';
import { cn } from '../lib/utils';
import { ArrowLeft, ExternalLink, Calendar, MapPin, Building2, Users } from 'lucide-react';

const LEVEL_CONFIG = {
  strong: { label: '强推', cls: 'badge-strong', accent: 'bg-emerald-50 text-emerald-700' },
  yes: { label: '可以投', cls: 'badge-yes', accent: 'bg-sky-50 text-sky-700' },
  risky: { label: '风险', cls: 'badge-risky', accent: 'bg-amber-50 text-amber-700' },
  no: { label: '不建议', cls: 'badge-no', accent: 'bg-rose-50 text-rose-700' },
};

const STATUS_OPTIONS = [
  { value: 'new', label: '新标讯' },
  { value: 'following', label: '跟进中' },
  { value: 'ignored', label: '已忽略' },
  { value: 'bidding', label: '已投标' },
  { value: 'won', label: '已中标' },
  { value: 'lost', label: '未中标' },
];

export default function NoticeDetail() {
  const { id } = useParams();
  const [notice, setNotice] = useState(null);
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    radarApi.get(`/notices/${id}`)
      .then(res => {
        setNotice(res.data);
        setStatus(res.data?.notice_status || 'new');
        const m = Array.isArray(res.data?.match_result) ? res.data.match_result[0] : res.data?.match_result;
        setMatch(m);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const updateStatus = async (newStatus) => {
    setSaving(true);
    try {
      await radarApi.patch(`/notices/${id}/status`, { notice_status: newStatus });
      setStatus(newStatus);
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('状态更新失败: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-5 bg-slate-100 rounded w-24" />
        <div className="h-8 bg-slate-100 rounded w-2/3" />
        <div className="h-40 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  if (!notice) {
    return <div className="text-center text-slate-400 py-16">标讯未找到</div>;
  }

  const levelInfo = match ? LEVEL_CONFIG[match.recommend_level] : null;
  const extracted = notice.ai_extracted_fields || {};

  return (
    <div>
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 mb-5 transition-colors">
        <ArrowLeft size={16} /> 返回列表
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 左侧：标讯信息 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200/80 p-5">
            <div className="flex items-center gap-2 mb-3">
              {levelInfo && (
                <span className={cn('text-xs font-medium px-2.5 py-1 rounded-md', levelInfo.cls)}>
                  {levelInfo.label}
                </span>
              )}
              {match && (
                <span className="text-xs text-slate-400">扣分 {match.total_deduction}</span>
              )}
              {/* 状态选择器 */}
              <div className="ml-auto">
                <select
                  value={status}
                  onChange={(e) => updateStatus(e.target.value)}
                  disabled={saving}
                  className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 disabled:opacity-50"
                  aria-label="标讯状态"
                >
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <h1 className="text-sm font-semibold text-slate-900 leading-snug mb-3">{notice.title}</h1>

            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 shrink-0">预算</span>
                <span className="text-slate-700 font-medium">{notice.budget_amount ? `¥${notice.budget_amount}万` : '未公开'}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-slate-400 shrink-0" />
                <span className="text-slate-700">{notice.city || notice.region_scope || '-'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-slate-400 shrink-0" />
                <span className="text-slate-700">{notice.publish_date || '-'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-slate-400 shrink-0" />
                <span className="text-slate-700">截止 {notice.end_date || '-'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 size={14} className="text-slate-400 shrink-0" />
                <span className="text-slate-700 truncate">{notice.tenderee || '-'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users size={14} className="text-slate-400 shrink-0" />
                <span className="text-slate-700 truncate">{notice.tender_agent || '-'}</span>
              </div>
            </div>

            {notice.source_url && (
              <a href={notice.source_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 mt-4 transition-colors">
                <ExternalLink size={14} /> 查看原文
              </a>
            )}
          </div>

          {/* AI 提取结果 */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-3">AI 结构化提取</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-slate-400">项目类型：</span><span className="text-slate-700">{extracted.project_type || '-'}</span></div>
              <div><span className="text-slate-400">行业：</span><span className="text-slate-700">{extracted.industry_type || '-'}</span></div>
              <div><span className="text-slate-400">来源：</span><span className="text-slate-700">{extracted.source || '-'}</span></div>
            </div>
            {extracted.tech_keywords?.length > 0 && (
              <div className="mt-3">
                <span className="text-xs text-slate-400">技术关键词</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {extracted.tech_keywords.map(kw => (
                    <span key={kw} className="text-xs bg-slate-50 text-slate-600 px-2.5 py-1 rounded-md border border-slate-100">{kw}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 右侧：匹配结果 */}
        <div className="space-y-4">
          {match ? (
            <div className="bg-white rounded-xl border border-slate-200/80 p-5">
              <h2 className="text-sm font-semibold text-slate-800 mb-4">匹配结果</h2>

              {/* 分数圆环 */}
              <div className={cn('text-center py-5 rounded-xl mb-5', levelInfo?.accent)}>
                <div className="text-3xl font-bold tracking-tight">{100 - match.total_deduction}</div>
                <div className="text-sm mt-1 font-medium">{levelInfo?.label}</div>
              </div>

              <div className="space-y-4">
                {(match.match_details || []).map((d, i) => {
                  const pct = d.max_score > 0 ? (d.score / d.max_score) * 100 : 0;
                  return (
                    <div key={i}>
                      <div className="flex justify-between mb-1.5">
                        <span className="text-sm text-slate-600">{d.dimension}</span>
                        <span className="text-sm font-medium text-slate-800">{d.score}/{d.max_score}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div
                          className={cn('h-2 rounded-full transition-all',
                            pct >= 80 ? 'bg-emerald-500' :
                            pct >= 50 ? 'bg-indigo-500' : 'bg-amber-500'
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {d.matched?.length > 0 && (
                        <div className="text-xs text-emerald-600 mt-1.5">匹配: {d.matched.join('、')}</div>
                      )}
                      {d.unmatched?.length > 0 && (
                        <div className="text-xs text-amber-600 mt-1">缺口: {d.unmatched.join('、')}</div>
                      )}
                    </div>
                  );
                })}
              </div>

              {match.risk_notes?.length > 0 && (
                <div className="mt-5 pt-4 border-t border-slate-100">
                  <div className="text-xs text-amber-700 bg-amber-50 rounded-lg p-3 space-y-1.5 border border-amber-200/60">
                    {match.risk_notes.map((note, i) => <div key={i}>{note}</div>)}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200/80 p-5">
              <p className="text-sm text-slate-400 text-center py-4">暂无匹配结果</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
