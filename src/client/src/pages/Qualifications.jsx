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
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">资质管理</h2>
        {isAdmin && (
          <button className="inline-flex items-center gap-1 bg-gray-900 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-gray-800">
            <Plus size={14} /> 新增
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        {[{ value: 'company', label: '公司资质' }, { value: 'personnel', label: '人员资质' }].map(t => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium',
              tab === t.value ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-8">加载中...</div>
      ) : currentData.length === 0 ? (
        <div className="text-center text-gray-500 py-8">暂无{tab === 'company' ? '公司' : '人员'}资质数据</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {tab === 'company' ? (
                  <>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">类型</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">名称</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">等级</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">证书编号</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">有效期</th>
                  </>
                ) : (
                  <>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">姓名</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">类型</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">证书名称</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">证书编号</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">有效期</th>
                  </>
                )}
                {isAdmin && <th className="text-right px-4 py-2.5 font-medium text-gray-600">操作</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentData.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  {tab === 'company' ? (
                    <>
                      <td className="px-4 py-2.5">{item.qual_type}</td>
                      <td className="px-4 py-2.5">{item.qual_name}</td>
                      <td className="px-4 py-2.5">{item.qual_level || '-'}</td>
                      <td className="px-4 py-2.5 font-mono text-xs">{item.cert_number || '-'}</td>
                      <td className="px-4 py-2.5 text-xs">{item.expiry_date || '永久'}</td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2.5">{item.person_name}</td>
                      <td className="px-4 py-2.5">{item.qual_type}</td>
                      <td className="px-4 py-2.5">{item.qual_name}</td>
                      <td className="px-4 py-2.5 font-mono text-xs">{item.cert_number || '-'}</td>
                      <td className="px-4 py-2.5 text-xs">{item.expiry_date || '永久'}</td>
                    </>
                  )}
                  {isAdmin && (
                    <td className="px-4 py-2.5 text-right">
                      <button className="text-gray-400 hover:text-gray-600 mr-2"><Pencil size={14} /></button>
                      <button className="text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
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
