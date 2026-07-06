import { useEffect, useState } from 'react';
import { radarApi } from '../lib/api';
import { cn } from '../lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import { TrendingUp, PieChart as PieIcon, MapPin } from 'lucide-react';

const COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4', '#84cc16'];
function ChartCard({ title, icon: Icon, children, wide }) {
  return (
    <div className={cn('bg-white rounded-xl border border-slate-200/80 p-5', wide && 'lg:col-span-2')}>
      <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
        {Icon && <Icon size={16} className="text-slate-400" />}
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function Reports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    radarApi.get('/dashboard/trend', { params: { days } })
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-xl border border-slate-200/80 p-5 animate-pulse">
            <div className="h-4 bg-slate-100 rounded w-32 mb-4" />
            <div className="h-48 bg-slate-50 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!data) return <div className="text-center text-slate-400 py-16">数据加载失败</div>;

  const { trend, industryDist, regionDist } = data;

  // 计算总览
  const totalInRange = trend.reduce((s, d) => s + d.total, 0);
  const strongInRange = trend.reduce((s, d) => s + d.strong, 0);
  const avgPerDay = (totalInRange / days).toFixed(1);

  // 为堆叠图准备数据
  const stackData = trend.map(d => ({
    date: d.date.slice(5), // MM-DD
    强推: d.strong,
    可以投: d.yes,
    风险: d.risky,
    不建议: d.no,
    未匹配: d.total - d.matched,
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">数据看板</h2>
          <p className="text-sm text-slate-400 mt-0.5">近 {days} 天数据概览，日均 {avgPerDay} 条标讯</p>
        </div>
        <div className="flex gap-1.5">
          {[7, 14, 30].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                days === d ? 'bg-slate-800 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-700')}>
              {d} 天
            </button>
          ))}
        </div>
      </div>

      {/* 总览数字 */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">{totalInRange}</p>
          <p className="text-xs text-slate-400 mt-0.5">标讯总量</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{strongInRange}</p>
          <p className="text-xs text-slate-400 mt-0.5">强推标讯</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 text-center">
          <p className="text-2xl font-bold text-indigo-600">{avgPerDay}</p>
          <p className="text-xs text-slate-400 mt-0.5">日均入库</p>
        </div>
      </div>

      {/* 趋势图 */}
      <ChartCard title="标讯入库趋势" icon={TrendingUp} wide>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={stackData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
            />
            <Area type="monotone" dataKey="强推" stackId="1" fill="#d1fae5" stroke="#10b981" />
            <Area type="monotone" dataKey="可以投" stackId="1" fill="#e0f2fe" stroke="#0ea5e9" />
            <Area type="monotone" dataKey="风险" stackId="1" fill="#fef3c7" stroke="#f59e0b" />
            <Area type="monotone" dataKey="不建议" stackId="1" fill="#ffe4e6" stroke="#f43f5e" />
            <Area type="monotone" dataKey="未匹配" stackId="1" fill="#f1f5f9" stroke="#cbd5e1" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 行业分布 */}
        <ChartCard title="行业分布" icon={PieIcon}>
          {industryDist.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">暂无数据</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={industryDist} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: '#94a3b8' }}>
                  {industryDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* 地区分布 */}
        <ChartCard title="地区分布" icon={MapPin}>
          {regionDist.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">暂无数据</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={regionDist} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} width={80} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="value" fill="#4f46e5" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
