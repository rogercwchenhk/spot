import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { radarApi } from '../lib/api';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import {
  Megaphone, TrendingUp, ThumbsUp, Activity, ArrowRight,
  FileText, Globe, Award,
} from 'lucide-react';

const LEVEL_CONFIG = {
  strong: { label: '强推', color: 'emerald' },
  yes: { label: '可以投', color: 'sky' },
  risky: { label: '风险', color: 'amber' },
  no: { label: '不建议', color: 'rose' },
};

const DIST_COLORS = {
  strong: 'bg-emerald-500',
  yes: 'bg-sky-500',
  risky: 'bg-amber-500',
  no: 'bg-rose-500',
  unmatched: 'bg-slate-200',
};

function StatCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 flex items-start gap-4" role="region" aria-label={label}>
      <div className={cn('shrink-0 w-10 h-10 rounded-lg flex items-center justify-center', accent)}>
        <Icon size={20} strokeWidth={1.8} />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-semibold tracking-tight text-slate-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function MatchDistribution({ dist, total }) {
  if (!total) return null;
  const keys = ['strong', 'yes', 'risky', 'no'];
  const matchedTotal = keys.reduce((s, k) => s + (dist[k] || 0), 0);

  return (
    <div>
      {/* stacked bar */}
      <div className="flex h-3 rounded-full overflow-hidden bg-slate-100 mb-4">
        {keys.map(k => {
          const pct = total > 0 ? ((dist[k] || 0) / total) * 100 : 0;
          if (pct < 1) return null;
          return <div key={k} className={cn(DIST_COLORS[k], 'transition-all')} style={{ width: `${pct}%` }} />;
        })}
        {total > matchedTotal && (
          <div className={cn(DIST_COLORS.unmatched, 'transition-all')} style={{ width: `${((total - matchedTotal) / total) * 100}%` }} />
        )}
      </div>

      {/* legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {keys.map(k => (
          <div key={k} className="flex items-center gap-2 text-sm">
            <span className={cn('w-2.5 h-2.5 rounded-full', DIST_COLORS[k])} />
            <span className="text-slate-500">{LEVEL_CONFIG[k].label}</span>
            <span className="font-medium text-slate-800">{dist[k] || 0}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 text-sm">
          <span className={cn('w-2.5 h-2.5 rounded-full', DIST_COLORS.unmatched)} />
          <span className="text-slate-400">未匹配</span>
          <span className="font-medium text-slate-600">{total - matchedTotal}</span>
        </div>
      </div>
    </div>
  );
}

function RecentNoticeRow({ notice }) {
  const match = notice.match_result;
  const levelCfg = match ? LEVEL_CONFIG[match.recommend_level] : null;

  return (
    <Link
      to={`/notices/${notice.id}`}
      className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors group"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
          {notice.title}
        </p>
        <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
          {notice.budget_amount > 0 && <span>{notice.budget_amount}万</span>}
          <span>{notice.city || '-'}</span>
          {notice.publish_date && <span>{notice.publish_date}</span>}
        </div>
      </div>
      {levelCfg && (
        <span className={cn(
          'shrink-0 text-xs font-medium px-2.5 py-1 rounded-full',
          levelCfg.color === 'emerald' && 'bg-emerald-50 text-emerald-700',
          levelCfg.color === 'sky' && 'bg-sky-50 text-sky-700',
          levelCfg.color === 'amber' && 'bg-amber-50 text-amber-700',
          levelCfg.color === 'rose' && 'bg-rose-50 text-rose-700',
        )}>
          {levelCfg.label}
        </span>
      )}
      <ArrowRight size={14} className="shrink-0 text-slate-300 group-hover:text-slate-500 transition-colors" />
    </Link>
  );
}

export default function Dashboard() {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    radarApi.get('/dashboard/stats')
      .then(res => setStats(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl border border-slate-200/80 p-5 animate-pulse">
              <div className="w-10 h-10 bg-slate-100 rounded-lg mb-3" />
              <div className="h-3 bg-slate-100 rounded w-16 mb-2" />
              <div className="h-7 bg-slate-100 rounded w-12" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return <div className="text-center text-slate-400 py-16">数据加载失败</div>;
  }

  const { totalNotices, todayNew, matchDistribution, matchRate, recentNotices, platformCount } = stats;
  const strongCount = matchDistribution?.strong || 0;

  return (
    <div className="space-y-6">
      {/* 顶部统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Megaphone}
          label="标讯总量"
          value={totalNotices}
          sub={`${platformCount} 个平台`}
          accent="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          icon={TrendingUp}
          label="今日新增"
          value={todayNew}
          sub={todayNew > 0 ? '有新标讯' : '暂无更新'}
          accent="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={ThumbsUp}
          label="强推标讯"
          value={strongCount}
          sub={strongCount > 0 ? '建议尽快跟进' : '暂无强推'}
          accent="bg-amber-50 text-amber-600"
        />
        <StatCard
          icon={Activity}
          label="匹配率"
          value={`${matchRate}%`}
          sub="已匹配 / 总量"
          accent="bg-sky-50 text-sky-600"
        />
        <QualWarningCard />
      </div>

      {/* 匹配分布 */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">匹配等级分布</h3>
        <MatchDistribution dist={matchDistribution} total={totalNotices} />
      </div>

        <QualWarningCard />
      {/* 最近标讯 */}
      <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">最近标讯</h3>
          <Link to="/" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
            查看全部 <ArrowRight size={12} />
          </Link>
        </div>
        {recentNotices.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">暂无标讯数据</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentNotices.map(n => <RecentNoticeRow key={n.id} notice={n} />)}
          </div>
        )}
      </div>

      {/* 快捷入口 */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Link to="/search" className="bg-white rounded-xl border border-slate-200/80 p-4 flex items-center gap-3 hover:border-indigo-300 hover:shadow-sm transition-all group">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
            <FileText size={18} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-800">搜索标讯</p>
            <p className="text-xs text-slate-400">关键词检索</p>
          </div>
        </Link>
        <Link to="/qualifications" className="bg-white rounded-xl border border-slate-200/80 p-4 flex items-center gap-3 hover:border-indigo-300 hover:shadow-sm transition-all group">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
            <Award size={18} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-800">资质管理</p>
            <p className="text-xs text-slate-400">公司 / 人员</p>
          </div>
        </Link>
        {isAdmin && (
          <Link to="/platforms" className="bg-white rounded-xl border border-slate-200/80 p-4 flex items-center gap-3 hover:border-indigo-300 hover:shadow-sm transition-all group">
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
              <Globe size={18} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800">平台管理</p>
              <p className="text-xs text-slate-400">数据源</p>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}

// ── 资质到期预警卡片 (B6) ─────────────────────────────────────
function QualWarningCard() {
  const [warning, setWarning] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    radarApi.get('/admin/qual-warning?days=30')
      .then(res => setWarning(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 animate-pulse">
        <div className="h-4 bg-slate-100 rounded w-24 mb-3" />
        <div className="h-8 bg-slate-100 rounded w-16" />
      </div>
    );
  }

  const total = warning?.total || 0;
  const companyCount = warning?.companyQuals?.length || 0;
  const personnelCount = warning?.personnelQuals?.length || 0;

  return (
    <Link to="/qualifications" className="bg-white rounded-xl border border-slate-200/80 p-5 hover:border-indigo-300 hover:shadow-sm transition-all group">
      <div className="flex items-start gap-4">
        <div className={cn(
          'shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
          total > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
        )}>
          <Award size={20} strokeWidth={1.8} />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-slate-500">资质到期预警</p>
          <p className="text-2xl font-semibold tracking-tight text-slate-900 mt-0.5">
            {total > 0 ? total : '✅'}
          </p>
          {total > 0 ? (
            <p className="text-xs text-rose-500 mt-1">
              {companyCount > 0 && `${companyCount}项公司资质`}
              {companyCount > 0 && personnelCount > 0 && '、'}
              {personnelCount > 0 && `${personnelCount}项人员资质`}
              {' '}即将到期
            </p>
          ) : (
            <p className="text-xs text-emerald-500 mt-1">30天内无到期资质</p>
          )}
        </div>
      </div>
    </Link>
  );
}
