import { useEffect, useState } from 'react';
import { radarApi } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { Save, RefreshCw, Plus, Trash2, X } from 'lucide-react';

const SECTIONS = [
  {
    title: '数据源 — 知了标讯 API',
    prefix: 'datasource',
    fields: [
      { key: 'datasource.zlbx.api_key', label: 'API Key', type: 'password' },
      { key: 'datasource.zlbx.base_url', label: 'API 地址', type: 'text' },
    ],
  },
  {
    title: 'AI 模型 (LLM)',
    prefix: 'llm',
    fields: [
      { key: 'llm.api_key', label: 'API Key', type: 'password' },
      { key: 'llm.model', label: '模型名称', type: 'text' },
      { key: 'llm.base_url', label: 'API 地址', type: 'text' },
    ],
  },
  {
    title: '数据采集',
    prefix: 'fetch',
    fields: [
      { key: 'fetch.province', label: '目标省份', type: 'text' },
      { key: 'fetch.schedules', label: '采集时间（cron 数组）', type: 'json' },
      { key: 'fetch.keywords', label: '搜索关键词组', type: 'json' },
    ],
  },
  {
    title: '企微推送',
    prefix: 'push',
    fields: [
      { key: 'push.enabled', label: '推送开关', type: 'toggle' },
      { key: 'push.schedule', label: '推送时间', type: 'text' },
      { key: 'push.webhook_url', label: 'Webhook 地址', type: 'text' },
      { key: 'push.daily_summary', label: '日报汇总模式', type: 'toggle' },
    ],
  },
];

function parseValue(raw) {
  const trimmed = typeof raw === 'string' ? raw.trim() : raw;
  if (typeof trimmed === 'string' && (trimmed.startsWith('[') || trimmed.startsWith('{') || trimmed === 'true' || trimmed === 'false' || (trimmed !== '' && !isNaN(Number(trimmed))))) {
    try { return JSON.parse(trimmed); } catch { return trimmed; }
  }
  return trimmed;
}

export default function Settings() {
  const { isAdmin } = useAuth();
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [edited, setEdited] = useState({});
  const [msg, setMsg] = useState('');
  const [addModal, setAddModal] = useState(null);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const fetchConfig = () => {
    setLoading(true);
    radarApi.get('/config')
      .then(res => setConfig(res.data || {}))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchConfig(); }, []);

  if (!isAdmin) return <div className="text-center text-gray-500 py-8">需要管理员权限</div>;

  const getSectionKeys = (section) => {
    const predefined = section.fields.map(f => f.key);
    const dynamic = Object.keys(config).filter(k => k.startsWith(section.prefix + '.') && !predefined.includes(k));
    return [...predefined, ...dynamic];
  };

  const getValue = (key) => edited[key] !== undefined ? edited[key] : (config[key]?.value ?? '');
  const getDesc = (key) => config[key]?.description || '';

  const handleChange = (key, value) => setEdited(prev => ({ ...prev, [key]: value }));

  const handleSave = async (key) => {
    setSaving(true); setMsg('');
    try {
      await radarApi.put(`/config/${encodeURIComponent(key)}`, { body: { value: parseValue(edited[key]) } });
      setMsg(`已保存: ${key}`);
      setEdited(prev => { const n = { ...prev }; delete n[key]; return n; });
      fetchConfig();
    } catch (err) { setMsg(`保存失败: ${err.message}`); }
    finally { setSaving(false); }
  };

  const handleDelete = async (key) => {
    if (!confirm(`确认删除配置项 "${key}"？`)) return;
    setSaving(true); setMsg('');
    try {
      await radarApi.delete(`/config/${encodeURIComponent(key)}`);
      setMsg(`已删除: ${key}`);
      fetchConfig();
    } catch (err) { setMsg(`删除失败: ${err.message}`); }
    finally { setSaving(false); }
  };

  const handleCreate = async () => {
    if (!newKey.trim()) return;
    setSaving(true); setMsg('');
    try {
      await radarApi.post('/config', { body: { key: newKey, value: parseValue(newValue), description: newDesc } });
      setMsg(`已创建: ${newKey}`);
      setAddModal(null); setNewKey(''); setNewValue(''); setNewDesc('');
      fetchConfig();
    } catch (err) { setMsg(`创建失败: ${err.message}`); }
    finally { setSaving(false); }
  };

  const renderField = (key, fieldDef) => {
    const val = getValue(key);
    const isModified = edited[key] !== undefined;
    const type = fieldDef?.type || (typeof val === 'object' ? 'json' : 'text');
    const isDynamic = !fieldDef;

    return (
      <div key={key} className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <label className="text-xs text-gray-500">{fieldDef?.label || key}</label>
            {isDynamic && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">自定义</span>}
          </div>
          {type === 'toggle' ? (
            <button
              onClick={() => handleChange(key, val === true || val === 'true' ? 'false' : 'true')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                val === true || val === 'true' ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                val === true || val === 'true' ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          ) : type === 'json' ? (
            <textarea
              value={typeof val === 'string' ? val : JSON.stringify(val, null, 2)}
              onChange={e => handleChange(key, e.target.value)}
              rows={3}
              className={`w-full border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-y ${
                isModified ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'
              }`}
            />
          ) : (
            <input
              type={type}
              value={val ?? ''}
              onChange={e => handleChange(key, e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent ${
                isModified ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'
              }`}
            />
          )}
          <div className="text-xs text-gray-400 mt-0.5 truncate">{key}{getDesc(key) ? ` — ${getDesc(key)}` : ''}</div>
        </div>
        <div className="flex items-center gap-1 pt-5 shrink-0">
          {isModified && (
            <button onClick={() => handleSave(key)} disabled={saving} className="text-green-600 hover:text-green-700" title="保存">
              <Save size={14} />
            </button>
          )}
          <button onClick={() => handleDelete(key)} disabled={saving} className="text-gray-400 hover:text-red-600" title="删除">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">系统设置</h2>
        <button onClick={fetchConfig} className="text-gray-500 hover:text-gray-700" title="刷新">
          <RefreshCw size={16} />
        </button>
      </div>

      {msg && (
        <div className="mb-4 text-sm bg-green-50 text-green-700 rounded-lg px-3 py-2">{msg}</div>
      )}

      {/* 新增配置项弹窗 */}
      {addModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">新增配置项</h3>
              <button onClick={() => setAddModal(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Key</label>
                <input value={newKey} onChange={e => setNewKey(e.target.value)}
                  placeholder={addModal ? `${addModal}.` : ''}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Value</label>
                <textarea value={newValue} onChange={e => setNewValue(e.target.value)} rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900 resize-y" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">说明</label>
                <input value={newDesc} onChange={e => setNewDesc(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setAddModal(null)} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">取消</button>
              <button onClick={handleCreate} disabled={saving || !newKey.trim()}
                className="px-3 py-1.5 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50">创建</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-500 py-8">加载中...</div>
      ) : (
        <div className="space-y-6">
          {SECTIONS.map(section => {
            const allKeys = getSectionKeys(section);
            return (
              <div key={section.title} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">{section.title}</h3>
                  <button
                    onClick={() => { setAddModal(section.prefix); setNewKey(section.prefix + '.'); }}
                    className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
                  >
                    <Plus size={14} /> 新增
                  </button>
                </div>
                <div className="space-y-4">
                  {allKeys.map(key => {
                    const fieldDef = section.fields.find(f => f.key === key);
                    return renderField(key, fieldDef);
                  })}
                </div>
              </div>
            );
          })}

          {/* 不属于任何 section 的配置 */}
          {(() => {
            const allSectionKeys = SECTIONS.flatMap(s => getSectionKeys(s));
            const orphanKeys = Object.keys(config).filter(k => !allSectionKeys.includes(k));
            if (orphanKeys.length === 0) return null;
            return (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">其他配置</h3>
                <div className="space-y-4">
                  {orphanKeys.map(key => renderField(key, null))}
                </div>
              </div>
            );
          })()}

          {/* 系统信息 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">系统信息</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">版本：</span>1.0.0</div>
              <div><span className="text-gray-500">数据源：</span>知了标讯 API</div>
              <div><span className="text-gray-500">AI 模型：</span>{config['llm.model']?.value || 'mimo-v2.5-pro'}</div>
              <div><span className="text-gray-500">数据库：</span>Supabase (PostgreSQL)</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
