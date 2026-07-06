import { useEffect, useState, useCallback } from 'react';
import { radarApi } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { cn } from '../lib/utils';
import Modal, { ConfirmDialog } from '../components/Modal';
import { Plus, Pencil, Trash2, Save, Image as ImageIcon, HelpCircle } from 'lucide-react';
import QualImageManager from '../components/QualImageManager';

// ── 到期预警工具函数 ──────────────────────────────────────
function getExpiryStatus(expiryDate) {
  if (!expiryDate) return { color: 'text-slate-500', bg: '', label: '永久', days: Infinity };
  const now = new Date();
  const expiry = new Date(expiryDate);
  const days = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  if (days < 0) return { color: 'text-rose-600', bg: 'bg-rose-50', label: '已过期', days };
  if (days <= 30) return { color: 'text-rose-600', bg: 'bg-rose-50', label: `${days}天`, days };
  if (days <= 90) return { color: 'text-amber-600', bg: 'bg-amber-50', label: `${days}天`, days };
  return { color: 'text-emerald-600', bg: 'bg-emerald-50', label: `${days}天`, days };
}

// ── 字段定义 ──────────────────────────────────────────
const COMPANY_FIELDS = [
  { key: 'qual_type',   label: '资质类型', placeholder: 'ISO9001 / ITSS / CS', required: true },
  { key: 'qual_name',   label: '资质名称', placeholder: '全称', required: true },
  { key: 'qual_level',  label: '等级',     placeholder: '一级 / 甲级' },
  { key: 'cert_number', label: '证书编号', placeholder: '证书编号' },
  { key: 'issue_date',  label: '发证日期', type: 'date' },
  { key: 'expiry_date', label: '到期日期', type: 'date' },
  { key: 'issuing_body',label: '发证机关' },
  { key: 'scope',       label: '覆盖范围', type: 'textarea' },
];

const PERSONNEL_FIELDS = [
  { key: 'person_name', label: '姓名',     placeholder: '张三', required: true },
  { key: 'qual_type',   label: '证书类型', placeholder: 'PMP / OCP / RHCE', required: true },
  { key: 'qual_name',   label: '证书名称', placeholder: '全称', required: true },
  { key: 'cert_number', label: '证书编号', placeholder: '证书编号' },
  { key: 'issue_date',  label: '发证日期', type: 'date' },
  { key: 'expiry_date', label: '到期日期', type: 'date' },
];

function emptyForm(fields) {
  const obj = {};
  for (const f of fields) obj[f.key] = '';
  return obj;
}

// ── 表单弹窗 ──────────────────────────────────────────
function QualFormModal({ open, onClose, onSave, fields, initial, title }) {
  const [form, setForm] = useState(initial || emptyForm(fields));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(initial || emptyForm(fields));
    setErrors({});
  }, [initial, open]);

  const set = (key, val) => {
    setForm(prev => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const validate = () => {
    const errs = {};
    for (const f of fields) {
      if (f.required && !form[f.key]?.trim()) errs[f.key] = `${f.label}不能为空`;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setErrors({ _submit: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        {errors._submit && (
          <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            {errors._submit}
          </div>
        )}
        {fields.map(f => (
          <div key={f.key}>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {f.label}
              {f.required && <span className="text-rose-400 ml-0.5">*</span>}
            </label>
            {f.type === 'textarea' ? (
              <textarea
                value={form[f.key] || ''}
                onChange={e => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                rows={3}
                className={cn(
                  'w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors resize-y',
                  errors[f.key] ? 'border-rose-300' : 'border-slate-200',
                )}
              />
            ) : (
              <input
                type={f.type || 'text'}
                value={form[f.key] || ''}
                onChange={e => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                className={cn(
                  'w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors',
                  errors[f.key] ? 'border-rose-300' : 'border-slate-200',
                )}
              />
            )}
            {errors[f.key] && <p className="text-xs text-rose-500 mt-1">{errors[f.key]}</p>}
          </div>
        ))}
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            取消
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm shadow-indigo-600/20">
            <Save size={14} /> {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── 操作指引条 ──────────────────────────────────────────
function GuideBar() {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5">
      <div className="flex items-center gap-4 flex-wrap text-xs">
        <span className="font-medium text-slate-700 flex items-center gap-1">
          <HelpCircle size={12} className="text-slate-400" />
          操作流程
        </span>
        {[
          { step: '1', label: '新增记录', hint: '填写基本信息后保存' },
          { step: '2', label: '上传图片', hint: 'PNG / JPEG / PDF，最大 20MB' },
          { step: '3', label: 'AI 识别', hint: '点击图片上的 🔍 自动提取字段' },
          { step: '4', label: '设为主图', hint: '星标图片作为标书默认使用' },
        ].map((s, i) => (
          <div key={s.step} className="flex items-center gap-2">
            <span className="w-4 h-4 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">
              {s.step}
            </span>
            <span className="text-slate-700 font-medium">{s.label}</span>
            <span className="text-slate-400 text-[11px] hidden sm:inline">— {s.hint}</span>
            {i < 3 && <span className="text-slate-300 ml-2 hidden md:inline">›</span>}
          </div>
        ))}
      </div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-indigo-500 hover:text-indigo-700 mt-2 transition-colors"
      >
        {expanded ? '收起' : '查看图片格式要求'}
      </button>
      {expanded && (
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          扫描件推荐 PNG 格式，分辨率 300 DPI（打印质量）；手机拍摄请确保光线充足、文字清晰；
          多页证书可上传 PDF 或分多张图片；设为主图的图片将作为标书默认使用。
        </p>
      )}
    </div>
  );
}

// ── 主组件 ──────────────────────────────────────────
export default function Qualifications() {
  const { canManageQualifications } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('company');
  const [companyQuals, setCompanyQuals] = useState([]);
  const [personnelQuals, setPersonnelQuals] = useState([]);
  const [loading, setLoading] = useState(true);

  // modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = create, object = edit
  const [confirmDelete, setConfirmDelete] = useState(null); // item to delete
  const [selectedForImages, setSelectedForImages] = useState(null); // 选中查看图片的记录

  const fetchQuals = useCallback(() => {
    setLoading(true);
    Promise.all([
      radarApi.get('/qualifications/company'),
      radarApi.get('/qualifications/personnel'),
    ]).then(([comp, pers]) => {
      setCompanyQuals(comp.data || []);
      setPersonnelQuals(pers.data || []);
    }).catch(err => toast.error('加载失败: ' + err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchQuals(); }, [fetchQuals]);

  const fields = tab === 'company' ? COMPANY_FIELDS : PERSONNEL_FIELDS;
  const currentData = tab === 'company' ? companyQuals : personnelQuals;
  const entity = tab === 'company' ? 'company' : 'personnel';

  const handleCreate = () => { setEditing(null); setFormOpen(true); };
  const handleEdit = (item) => { setEditing(item); setFormOpen(true); };

  const handleSave = async (form) => {
    if (editing) {
      await radarApi.put(`/qualifications/${entity}/${editing.id}`, { body: form });
      toast.success('更新成功');
    } else {
      await radarApi.post(`/qualifications/${entity}`, { body: form });
      toast.success('新增成功');
    }
    fetchQuals();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await radarApi.delete(`/qualifications/${entity}/${confirmDelete.id}`);
      toast.success('已删除');
      fetchQuals();
    } catch (err) {
      toast.error('删除失败: ' + err.message);
    }
  };

  return (
    <div>
      {/* 标题 */}
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-800">资质管理</h2>
        <p className="text-sm text-slate-400 mt-0.5">公司与人员资质证书管理，支持证书图片上传和 AI 智能识别</p>
      </div>

      {/* Tab 栏 + 新增按钮 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1.5">
          {[{ value: 'company', label: '公司资质', count: companyQuals.length },
            { value: 'personnel', label: '人员资质', count: personnelQuals.length },
          ].map(t => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all',
                tab === t.value ? 'bg-slate-800 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-700'
              )}
            >
              {t.label}
              <span className="ml-1.5 text-xs opacity-60">({t.count})</span>
            </button>
          ))}
        </div>
        {canManageQualifications && (
          <button onClick={handleCreate}
            className="inline-flex items-center gap-1.5 bg-indigo-600 text-white px-3.5 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-600/20 whitespace-nowrap">
            <Plus size={14} /> 新增
          </button>
        )}
      </div>

      {/* 操作指引 */}
      <div className="mb-5">
        <GuideBar />
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-8">
          <div className="flex items-center justify-center gap-2 text-slate-400">
            <span className="w-4 h-4 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
            <span className="text-sm">加载中...</span>
          </div>
        </div>
      ) : currentData.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-12">
          <div className="text-center">
            <p className="text-sm text-slate-400 mb-3">暂无{tab === 'company' ? '公司' : '人员'}资质数据</p>
            {canManageQualifications && (
              <button onClick={handleCreate}
                className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                <Plus size={14} /> 添加第一条
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* 桌面端：表格视图 */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200/80 overflow-hidden">
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
                  {canManageQualifications && <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">操作</th>}
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
                        <td className="px-4 py-3">{(() => { const s = getExpiryStatus(item.expiry_date); return <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md", s.bg, s.color)}>{item.expiry_date ? new Date(item.expiry_date).toLocaleDateString('zh-CN') : '永久'}{item.expiry_date && s.label !== '永久' && <span className="text-[10px] opacity-75">({s.label})</span>}</span>; })()}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-medium text-slate-800">{item.person_name}</td>
                        <td className="px-4 py-3 text-slate-600">{item.qual_type}</td>
                        <td className="px-4 py-3 text-slate-600">{item.qual_name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{item.cert_number || '-'}</td>
                        <td className="px-4 py-3">{(() => { const s = getExpiryStatus(item.expiry_date); return <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md", s.bg, s.color)}>{item.expiry_date ? new Date(item.expiry_date).toLocaleDateString('zh-CN') : '永久'}{item.expiry_date && s.label !== '永久' && <span className="text-[10px] opacity-75">({s.label})</span>}</span>; })()}</td>
                      </>
                    )}
                    {canManageQualifications && (
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button onClick={() => handleEdit(item)}
                          className="text-slate-400 hover:text-indigo-600 mr-2 transition-colors" title="编辑">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setConfirmDelete(item)}
                          className="text-slate-400 hover:text-rose-500 mr-2 transition-colors" title="删除">
                          <Trash2 size={14} />
                        </button>
                        <button onClick={() => setSelectedForImages(item)}
                          className={cn("transition-colors", selectedForImages?.id === item.id ? "text-indigo-600" : "text-slate-400 hover:text-indigo-600")} title="查看图片">
                          <ImageIcon size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 移动端：卡片视图 */}
          <div className="md:hidden space-y-3">
            {currentData.map(item => (
              <div key={item.id} className="bg-white rounded-xl border border-slate-200/80 p-4">
                <h3 className="font-medium text-slate-800 text-sm">
                  {tab === 'company' ? item.qual_name : item.person_name}
                </h3>
                <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                  {tab === 'company' ? (
                    <>
                      <div><span className="text-slate-500">类型:</span> <span className="text-slate-700">{item.qual_type}</span></div>
                      <div><span className="text-slate-500">等级:</span> <span className="text-slate-700">{item.qual_level || '-'}</span></div>
                      <div><span className="text-slate-500">编号:</span> <span className="text-slate-700 font-mono">{item.cert_number || '-'}</span></div>
                      <div><span className="text-slate-500">有效期:</span> {(() => { const s = getExpiryStatus(item.expiry_date); return <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded", s.bg, s.color)}>{item.expiry_date ? new Date(item.expiry_date).toLocaleDateString('zh-CN') : '永久'}{item.expiry_date && s.label !== '永久' && <span className="text-[10px] opacity-75">({s.label})</span>}</span>; })()}</div>
                    </>
                  ) : (
                    <>
                      <div><span className="text-slate-500">类型:</span> <span className="text-slate-700">{item.qual_type}</span></div>
                      <div><span className="text-slate-500">证书:</span> <span className="text-slate-700">{item.qual_name}</span></div>
                      <div><span className="text-slate-500">编号:</span> <span className="text-slate-700 font-mono">{item.cert_number || '-'}</span></div>
                      <div><span className="text-slate-500">有效期:</span> {(() => { const s = getExpiryStatus(item.expiry_date); return <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded", s.bg, s.color)}>{item.expiry_date ? new Date(item.expiry_date).toLocaleDateString('zh-CN') : '永久'}{item.expiry_date && s.label !== '永久' && <span className="text-[10px] opacity-75">({s.label})</span>}</span>; })()}</div>
                    </>
                  )}
                </div>
                {canManageQualifications && (
                  <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-slate-100">
                    <button onClick={() => handleEdit(item)}
                      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 px-2 py-1 rounded hover:bg-indigo-50 transition-colors">
                      <Pencil size={12} /> 编辑
                    </button>
                    <button onClick={() => setConfirmDelete(item)}
                      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-rose-500 px-2 py-1 rounded hover:bg-rose-50 transition-colors">
                      <Trash2 size={12} /> 删除
                    </button>
                    <button onClick={() => setSelectedForImages(item)}
                      className={cn("inline-flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors", selectedForImages?.id === item.id ? "text-indigo-600 bg-indigo-50" : "text-slate-500 hover:text-indigo-600 hover:bg-indigo-50")}>
                      <ImageIcon size={12} /> 图片
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* 资质图片管理 */}
      {canManageQualifications && (
        <div className="mt-6 bg-white rounded-xl border border-slate-200/80 p-5">
          <QualImageManager
            qualType={tab}
            qualId={selectedForImages?.id}
            qualName={selectedForImages?.qual_name || selectedForImages?.person_name || ''}
          />
        </div>
      )}

      {/* 新增/编辑弹窗 */}
      <QualFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        fields={fields}
        initial={editing}
        title={editing ? `编辑${tab === 'company' ? '公司' : '人员'}资质` : `新增${tab === 'company' ? '公司' : '人员'}资质`}
      />

      {/* 删除确认弹窗 */}
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="删除资质"
        message={`确定要删除「${confirmDelete?.qual_name || confirmDelete?.person_name || ''}」吗？此操作不可恢复。`}
        confirmText="删除"
        danger
      />
    </div>
  );
}
