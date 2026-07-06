import { useEffect, useState, useCallback } from 'react';
import { radarApi } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { cn } from '../lib/utils';
import Modal, { ConfirmDialog } from '../components/Modal';
import { Plus, Pencil, Trash2, Save } from 'lucide-react';

const PLATFORM_FIELDS = [
  { key: 'platform_name', label: '平台名称', placeholder: '千里马', required: true },
  { key: 'base_url',      label: '基础 URL', placeholder: 'https://www.qianlima.com', required: true },
  { key: 'list_url',      label: '列表 URL', placeholder: '（可选，默认同基础 URL）' },
  { key: 'platform_type', label: '平台类型', placeholder: 'government / enterprise / third_party', required: true },
  { key: 'anti_bot_level',label: '反爬等级', placeholder: 'none / low / medium / high' },
  { key: 'waf_provider',  label: 'WAF 供应商', placeholder: 'none / cloudflare / qiniu' },
];

function emptyForm() {
  return { platform_name: '', base_url: '', list_url: '', platform_type: '', anti_bot_level: 'none', waf_provider: 'none' };
}

function PlatformFormModal({ open, onClose, onSave, initial }) {
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
    for (const f of PLATFORM_FIELDS) if (f.required && !form[f.key]?.trim()) e[f.key] = `${f.label}不能为空`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSaving(true);
    try { await onSave(form); onClose(); } catch (err) { setErrors({ _submit: err.message }); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? '编辑平台' : '新增平台'}>
      <div className="space-y-4">
        {errors._submit && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{errors._submit}</div>}
        {PLATFORM_FIELDS.map(f => (
          <div key={f.key}>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {f.label}{f.required && <span className="text-rose-400 ml-0.5">*</span>}
            </label>
            <input type="text" value={form[f.key] || ''} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder}
              className={cn('w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors',
                errors[f.key] ? 'border-rose-300' : 'border-slate-200')} />
            {errors[f.key] && <p className="text-xs text-rose-500 mt-1">{errors[f.key]}</p>}
          </div>
        ))}
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

export default function Platforms() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetch = useCallback(() => {
    setLoading(true);
    radarApi.get('/platforms').then(res => setPlatforms(res.data || []))
      .catch(err => toast.error('加载失败: ' + err.message)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleSave = async (form) => {
    if (editing) {
      await radarApi.put(`/platforms/${editing.id}`, { body: form });
      toast.success('更新成功');
    } else {
      await radarApi.post('/platforms', { body: form });
      toast.success('新增成功');
    }
    fetch();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await radarApi.delete(`/platforms/${confirmDelete.id}`);
      toast.success('已删除');
      fetch();
    } catch (err) { toast.error('删除失败: ' + err.message); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">平台管理</h2>
          <p className="text-sm text-slate-400 mt-0.5">已接入的招标数据源平台</p>
        </div>
        {isAdmin && (
          <button onClick={() => { setEditing(null); setFormOpen(true); }}
            className="inline-flex items-center gap-1.5 bg-indigo-600 text-white px-3.5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-600/20">
            <Plus size={14} /> 新增平台
          </button>
        )}
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-8">
          <div className="flex items-center justify-center gap-2 text-slate-400">
            <span className="w-4 h-4 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
            <span className="text-sm">加载中...</span>
          </div>
        </div>
      ) : platforms.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-12">
          <div className="text-center">
            <p className="text-sm text-slate-400 mb-3">暂无平台数据</p>
            {isAdmin && (
              <button onClick={() => { setEditing(null); setFormOpen(true); }}
                className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                <Plus size={14} /> 添加第一个平台
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">平台名称</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">URL</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">类型</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">反爬等级</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">状态</th>
                {isAdmin && <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">操作</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {platforms.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{p.platform_name}</td>
                  <td className="px-4 py-3">
                    <a href={p.base_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 max-w-[200px] truncate transition-colors">
                      {p.base_url}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.platform_type}</td>
                  <td className="px-4 py-3 text-slate-600">{p.anti_bot_level || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs font-medium px-2.5 py-1 rounded-md', p.is_active ? 'badge-active' : 'badge-expired')}>
                      {p.is_active ? '已接入' : '未启用'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button onClick={() => { setEditing(p); setFormOpen(true); }}
                        className="text-slate-400 hover:text-indigo-600 mr-2 transition-colors" title="编辑">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setConfirmDelete(p)}
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
      )}

      <PlatformFormModal open={formOpen} onClose={() => setFormOpen(false)} onSave={handleSave} initial={editing} />
      <ConfirmDialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={handleDelete}
        title="删除平台" message={`确定要删除「${confirmDelete?.platform_name || ''}」吗？此操作不可恢复。`} confirmText="删除" danger />
    </div>
  );
}
