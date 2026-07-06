import { useEffect, useState, useCallback, useRef } from 'react';
import { radarApi } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { cn } from '../lib/utils';
import Modal, { ConfirmDialog } from '../components/Modal';
import { Plus, Pencil, Trash2, Save, Search as SearchIcon } from 'lucide-react';

const CONTRACT_FIELDS = [
  { key: 'project_name',  label: '项目名称', required: true },
  { key: 'client_name',   label: '甲方名称' },
  { key: 'service_type',  label: '服务类型', placeholder: '运维/驻场/集成/桌面/维保/咨询' },
  { key: 'industry',      label: '行业', placeholder: '银行/医院/政府/交通/电力' },
  { key: 'contract_amount', label: '合同金额(万)', type: 'number' },
  { key: 'region',        label: '地区' },
  { key: 'start_date',    label: '开始日期', type: 'date' },
  { key: 'end_date',      label: '结束日期', type: 'date' },
];

function emptyForm() {
  const o = {}; CONTRACT_FIELDS.forEach(f => o[f.key] = ''); return o;
}

function ContractFormModal({ open, onClose, onSave, initial }) {
  const [form, setForm] = useState(initial || emptyForm());
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(initial || emptyForm()); setErrors({}); }, [initial, open]);

  const set = (key, val) => {
    setForm(p => ({ ...p, [key]: val }));
    if (errors[key]) setErrors(p => { const n = { ...p }; delete n[key]; return n; });
  };

  const validate = () => {
    const e = {};
    for (const f of CONTRACT_FIELDS) if (f.required && !form[f.key]?.toString().trim()) e[f.key] = `${f.label}不能为空`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSaving(true);
    try { await onSave(form); onClose(); } catch (err) { setErrors({ _submit: err.message }); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? '编辑合同' : '新增合同'} wide>
      <div className="space-y-4">
        {errors._submit && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{errors._submit}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CONTRACT_FIELDS.map(f => (
            <div key={f.key} className={f.key === 'project_name' ? 'md:col-span-2' : ''}>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {f.label}{f.required && <span className="text-rose-400 ml-0.5">*</span>}
              </label>
              <input type={f.type || 'text'} value={form[f.key] || ''} onChange={e => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                className={cn('w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors',
                  errors[f.key] ? 'border-rose-300' : 'border-slate-200')} />
              {errors[f.key] && <p className="text-xs text-rose-500 mt-1">{errors[f.key]}</p>}
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">取消</button>
          <button onClick={submit} disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm shadow-indigo-600/20">
            <Save size={14} /> {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function Contracts() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [contracts, setContracts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const pageSize = 20;
  const debounceRef = useRef(null);
  const [debouncedKeyword, setDebouncedKeyword] = useState('');

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = { page, pageSize };
    if (debouncedKeyword) params.keyword = debouncedKeyword;
    radarApi.get('/contracts', { params })
      .then(res => { setContracts(res.data || []); setTotal(res.total || 0); })
      .catch(err => toast.error('加载失败: ' + err.message))
      .finally(() => setLoading(false));
  }, [page, debouncedKeyword]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async (form) => {
    if (editing) {
      await radarApi.put(`/contracts/${editing.id}`, { body: form });
      toast.success('更新成功');
    } else {
      await radarApi.post('/contracts', { body: form });
      toast.success('新增成功');
    }
    fetchData();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await radarApi.delete(`/contracts/${confirmDelete.id}`);
      toast.success('已删除');
      fetchData();
    } catch (err) { toast.error('删除失败: ' + err.message); }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">合同业绩库</h2>
          <p className="text-sm text-slate-400 mt-0.5">共 {total} 份合同</p>
        </div>
        {isAdmin && (
          <button onClick={() => { setEditing(null); setFormOpen(true); }}
            className="inline-flex items-center gap-1.5 bg-indigo-600 text-white px-3.5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-600/20">
            <Plus size={14} /> 新增合同
          </button>
        )}
      </div>

      {/* 搜索 */}
      <div className="mb-4">
        <div className="relative max-w-sm">
          <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={keyword} onChange={e => {
              const val = e.target.value;
              setKeyword(val);
              setPage(1);
              clearTimeout(debounceRef.current);
              debounceRef.current = setTimeout(() => setDebouncedKeyword(val), 300);
            }}
            placeholder="搜索项目名/甲方..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors" />
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-8">
          <div className="flex items-center justify-center gap-2 text-slate-400">
            <span className="w-4 h-4 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
            <span className="text-sm">加载中...</span>
          </div>
        </div>
      ) : contracts.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-12">
          <div className="text-center">
            <p className="text-sm text-slate-400 mb-3">暂无合同数据</p>
            {isAdmin && (
              <button onClick={() => { setEditing(null); setFormOpen(true); }}
                className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                <Plus size={14} /> 添加第一份合同
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-slate-200/80 overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">项目名称</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">甲方</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">服务类型</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">行业</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">金额(万)</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">地区</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">合同期</th>
                  {isAdmin && <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">操作</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contracts.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800 max-w-[240px] truncate">{c.project_name}</td>
                    <td className="px-4 py-3 text-slate-600">{c.client_name || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{c.service_type || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{c.industry || '-'}</td>
                    <td className="px-4 py-3 text-slate-600 tabular-nums">{c.contract_amount ? Number(c.contract_amount).toFixed(0) : '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{c.region || '-'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {c.start_date && c.end_date ? `${c.start_date} ~ ${c.end_date}` : c.start_date || c.end_date || '-'}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button onClick={() => { setEditing(c); setFormOpen(true); }}
                          className="text-slate-400 hover:text-indigo-600 mr-2 transition-colors" title="编辑">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setConfirmDelete(c)}
                          className="text-slate-400 hover:text-rose-500 transition-colors" title="删除">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="px-3.5 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-30 text-slate-600 hover:bg-slate-50 transition-colors">上一页</button>
              <span className="text-sm text-slate-400">{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                className="px-3.5 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-30 text-slate-600 hover:bg-slate-50 transition-colors">下一页</button>
            </div>
          )}
        </>
      )}

      <ContractFormModal open={formOpen} onClose={() => setFormOpen(false)} onSave={handleSave} initial={editing} />
      <ConfirmDialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={handleDelete}
        title="删除合同" message={`确定要删除「${confirmDelete?.project_name || ''}」吗？此操作不可恢复。`} confirmText="删除" danger />
    </div>
  );
}
