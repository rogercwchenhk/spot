import { useEffect, useState } from 'react';
import { radarApi } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import { Plus, Pencil, Trash2 } from 'lucide-react';

export default function Qualifications() {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState('company');
  const [companyQuals, setCompanyQuals] = useState([]);
  const [personnelQuals, setPersonnelQuals] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchQuals = () => {
    setLoading(true);
    Promise.all([
      radarApi.get('/qualifications/company'),
      radarApi.get('/qualifications/personnel'),
    ]).then(([comp, pers]) => {
      setCompanyQuals(comp.data || []);
      setPersonnelQuals(pers.data || []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchQuals(); }, []);

  const currentData = tab === 'company' ? companyQuals : personnelQuals;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">资质管理</h2>
          <p className="text-sm text-slate-400 mt-0.5">公司与人员资质证书管理</p>
        </div>
        {isAdmin && (
          <button className="inline-flex items-center gap-1.5 bg-indigo-600 text-white px-3.5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-600/20">
            <Plus size={14} /> 新增
          </button>
        )}
      </div>

      <div className="flex gap-1.5 mb-5">
        {[{ value: 'company', label: '公司资质' }, { value: 'personnel', label: '人员资质' }].map(t => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all',
              tab === t.value ? 'bg-slate-800 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-700'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-8">
          <div className="text-center text-slate-400">加载中...</div>
        </div>
      ) : currentData.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-8">
          <div className="text-center text-slate-400">暂无{tab === 'company' ? '公司' : '人员'}资质数据</div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {tab === 'company' ? (
                  <>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">类型</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">名称</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">等级</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">证书编号</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">有效期</th>
                  </>
                ) : (
                  <>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">姓名</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">类型</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">证书名称</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">证书编号</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">有效期</th>
                  </>
                )}
                {isAdmin && <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">操作</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentData.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  {tab === 'company' ? (
                    <>
                      <td className="px-4 py-3 text-slate-600">{item.qual_type}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{item.qual_name}</td>
                      <td className="px-4 py-3 text-slate-600">{item.qual_level || '-'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{item.cert_number || '-'}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{item.expiry_date || '永久'}</td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-medium text-slate-800">{item.person_name}</td>
                      <td className="px-4 py-3 text-slate-600">{item.qual_type}</td>
                      <td className="px-4 py-3 text-slate-600">{item.qual_name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{item.cert_number || '-'}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{item.expiry_date || '永久'}</td>
                    </>
                  )}
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <button className="text-slate-400 hover:text-indigo-600 mr-2 transition-colors"><Pencil size={14} /></button>
                      <button className="text-slate-400 hover:text-rose-500 transition-colors"><Trash2 size={14} /></button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
