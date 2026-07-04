import { useEffect, useState } from 'react';
import { radarApi } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { Save, RefreshCw, Pencil, X, Plus, Trash2 } from 'lucide-react';

// ── cron ↔ 时间列表互转 ──────────────────────────────────

function cronArrToTimes(cronArr) {
  if (!Array.isArray(cronArr)) return ['08:00', '12:00', '18:00', '23:00'];
  return cronArr.map(c => {
    const parts = c.split(' ');
    return `${String(parts[1] || '0').padStart(2, '0')}:${String(parts[0] || '0').padStart(2, '0')}`;
  }).sort();
}

function timesToCronArr(times) {
  return times.sort().map(t => {
    const [h, m] = t.split(':');
    return `${Number(m)} ${Number(h)} * * *`;
  });
}

function cronStrToTimes(cronStr) {
  if (!cronStr || typeof cronStr !== 'string') return ['09:00', '14:00'];
  const parts = cronStr.split(' ');
  const minute = parts[0] || '0';
  const hours = (parts[1] || '').split(',');
  return hours.filter(Boolean).map(h => `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`).sort();
}

function timesToCronStr(times) {
  if (times.length === 0) return '0 9 * * *';
  const minute = Number(times[0].split(':')[1]);
  const hours = times.map(t => Number(t.split(':')[0])).sort((a, b) => a - b).join(',');
  return `${minute} ${hours} * * *`;
}

const SECTIONS = [
  {
    title: '数据源',
    fields: [
      { key: 'datasource.name', label: '数据源名称', type: 'text' },
      { key: 'datasource.zlbx.api_key', label: 'API Key', type: 'password' },
      { key: 'datasource.zlbx.base_url', label: 'API 地址', type: 'text' },
    ],
  },
  {
    title: 'AI 模型 (LLM)',
    fields: [
      { key: 'llm.api_key', label: 'API Key', type: 'password' },
      { key: 'llm.model', label: '模型名称', type: 'text' },
      { key: 'llm.base_url', label: 'API 地址', type: 'text' },
    ],
  },
  {
    title: '数据采集',
    fields: [
      { key: 'fetch.province', label: '目标省份', type: 'text' },
      { key: 'fetch.keywords', label: '搜索关键词组', type: 'json' },
    ],
  },
  {
    title: '企微推送',
    fields: [
      { key: 'push.enabled', label: '推送开关', type: 'toggle' },
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
  const [editingKey, setEditingKey] = useState(null);
  const [msg, setMsg] = useState('');
  const [fetchTimes, setFetchTimes] = useState([]);
  const [fetchEditing, setFetchEditing] = useState(false);
  const [pushTimes, setPushTimes] = useState([]);
  const [pushEditing, setPushEditing] = useState(false);

  const fetchConfig = () => {
    setLoading(true);
    radarApi.get('/config')
      .then(res => {
        const d = res.data || {};
        setConfig(d);
        const fetchRaw = d['fetch.schedules']?.value;
        setFetchTimes(cronArrToTimes(typeof fetchRaw === 'string' ? JSON.parse(fetchRaw) : fetchRaw));
        const pushRaw = d['push.schedule']?.value;
        setPushTimes(cronStrToTimes(typeof pushRaw === 'string' ? pushRaw.replace(/^"|"$/g, '') : pushRaw));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchConfig(); }, []);

  if (!isAdmin) return <div className="text-center text-gray-500 py-8">需要管理员权限</div>;

  const getValue = (key) => edited[key] !== undefined ? edited[key] : (config[key]?.value ?? '');

  const startEdit = (key) => {
    setEditingKey(key);
    if (edited[key] === undefined) setEdited(prev => ({ ...prev, [key]: getValue(key) }));
  };

  const cancelEdit = (key) => {
    setEditingKey(null);
    setEdited(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const handleSave = async (key, rawValue) => {
    setSaving(true); setMsg('');
    try {
      const val = rawValue !== undefined ? rawValue : parseValue(edited[key]);
      await radarApi.put(`/config/${encodeURIComponent(key)}`, { body: { value: val } });
      setMsg(`已保存: ${key}`);
      setEdited(prev => { const n = { ...prev }; delete n[key]; return n; });
      setEditingKey(null);
      fetchConfig();
    } catch (err) { setMsg(`保存失败: ${err.message}`); }
    finally { setSaving(false); }
  };

  const handleSaveAll = async (fields) => {
    setSaving(true); setMsg('');
    let ok = 0, fail = 0;
    for (const f of fields) {
      if (edited[f.key] === undefined) continue;
      try {
        await radarApi.put(`/config/${encodeURIComponent(f.key)}`, { body: { value: parseValue(edited[f.key]) } });
        ok++;
      } catch { fail++; }
    }
    setMsg(`保存完成: ${ok} 成功${fail ? `, ${fail} 失败` : ''}`);
    setEdited({}); setEditingKey(null); fetchConfig(); setSaving(false);
  };

  const saveFetchSchedule = async () => {
    setSaving(true); setMsg('');
    try {
      await radarApi.put('/config/fetch.schedules', { body: { value: timesToCronArr(fetchTimes) } });
      setMsg('已保存: 采集时间'); setFetchEditing(false); fetchConfig();
    } catch (err) { setMsg(`保存失败: ${err.message}`); }
    finally { setSaving(false); }
  };

  const savePushSchedule = async () => {
    setSaving(true); setMsg('');
    try {
      await radarApi.put('/config/push.schedule', { body: { value: timesToCronStr(pushTimes) } });
      setMsg('已保存: 推送时间'); setPushEditing(false); fetchConfig();
    } catch (err) { setMsg(`保存失败: ${err.message}`); }
    finally { setSaving(false); }
  };

  // ── 通用字段渲染 ────────────────────────────
  const renderField = (field) => {
    const { key, label, type } = field;
    const val = getValue(key);
    const isEditing = editingKey === key;
    const isModified = edited[key] !== undefined;

    return (
      <div key={key}>
        <label className="block text-xs text-gray-500 mb-1">{label}</label>
        {type === 'toggle' ? (
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const next = val === true || val === 'true' ? 'false' : 'true';
                setEdited(prev => ({ ...prev, [key]: next })); setEditingKey(key);
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                val === true || val === 'true' ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                val === true || val === 'true' ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
            <span className="text-xs text-gray-500">{val === true || val === 'true' ? '开启' : '关闭'}</span>
            {isModified && (
              <>
                <button onClick={() => handleSave(key)} disabled={saving}
                  className="inline-flex items-center gap-1 text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700">
                  <Save size={12} /> 保存
                </button>
                <button onClick={() => cancelEdit(key)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
              </>
            )}
          </div>
        ) : isEditing ? (
          <div className="flex gap-2">
            {type === 'json' ? (
              <textarea
                value={typeof edited[key] === 'string' ? edited[key] : JSON.stringify(edited[key], null, 2)}
                onChange={e => setEdited(prev => ({ ...prev, [key]: e.target.value }))}
                rows={4} autoFocus
                className="flex-1 border border-yellow-400 bg-yellow-50 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-gray-900 resize-y"
              />
            ) : (
              <input type={type} value={edited[key] ?? ''}
                onChange={e => setEdited(prev => ({ ...prev, [key]: e.target.value }))}
                autoFocus
                className="flex-1 border border-yellow-400 bg-yellow-50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            )}
            <button onClick={() => handleSave(key)} disabled={saving}
              className="self-end inline-flex items-center gap-1 text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 shrink-0">
              <Save size={12} /> 保存
            </button>
            <button onClick={() => cancelEdit(key)} className="self-end text-gray-400 hover:text-gray-600 shrink-0"><X size={14} /></button>
          </div>
        ) : (
          <div className="flex gap-2">
            <div className={`flex-1 border rounded-lg px-3 py-2 text-sm ${type === 'password' ? 'font-mono tracking-wider' : ''} bg-gray-50 text-gray-700 truncate`}>
              {type === 'password' && val ? '••••••••' : (typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val || ''))}
            </div>
            <button onClick={() => startEdit(key)}
              className="self-end inline-flex items-center gap-1 text-xs border border-gray-200 text-gray-600 px-2 py-1 rounded hover:bg-gray-100 shrink-0">
              <Pencil size={12} /> 编辑
            </button>
          </div>
        )}
      </div>
    );
  };

  // ── 时间选择器组件 ────────────────────────────
  const renderTimePicker = ({ title, desc, times, setTimes, editing, setEditing, onSave }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {!editing && (
          <button onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1 text-xs border border-gray-200 text-gray-600 px-2 py-1 rounded hover:bg-gray-100">
            <Pencil size={12} /> 编辑
          </button>
        )}
      </div>
      <p className="text-xs text-gray-400 mb-3">{desc}</p>

      {editing ? (
        <>
          <div className="flex flex-wrap gap-2 mb-3">
            {times.map((t, i) => (
              <div key={i} className="inline-flex items-center gap-1 bg-yellow-50 border border-yellow-300 rounded-lg px-2 py-1">
                <input type="time" value={t}
                  onChange={e => { const next = [...times]; next[i] = e.target.value; setTimes(next); }}
                  className="text-sm border-none bg-transparent focus:outline-none"
                />
                <button onClick={() => setTimes(times.filter((_, j) => j !== i))}
                  className="text-gray-400 hover:text-red-500"><Trash2 size={12} /></button>
              </div>
            ))}
            <button onClick={() => setTimes([...times, '12:00'])}
              className="inline-flex items-center gap-1 text-xs text-gray-600 border border-dashed border-gray-300 px-2 py-1 rounded hover:bg-gray-50">
              <Plus size={12} /> 添加
            </button>
          </div>
          <div className="flex gap-2 pt-3 border-t border-gray-100">
            <button onClick={onSave} disabled={saving}
              className="inline-flex items-center gap-1 text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50">
              <Save size={14} /> 保存
            </button>
            <button onClick={() => { setEditing(false); fetchConfig(); }}
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 px-4 py-2">
              <X size={14} /> 取消
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap gap-2">
          {times.map((t, i) => (
            <span key={i} className="inline-flex items-center bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full">{t}</span>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">系统设置</h2>
        <button onClick={fetchConfig} className="text-gray-500 hover:text-gray-700" title="刷新">
          <RefreshCw size={16} />
        </button>
      </div>

      {msg && <div className="mb-4 text-sm bg-green-50 text-green-700 rounded-lg px-3 py-2">{msg}</div>}

      {loading ? (
        <div className="text-center text-gray-500 py-8">加载中...</div>
      ) : (
        <div className="space-y-6">
          {SECTIONS.map(section => (
            <div key={section.title} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">{section.title}</h3>
                <button
                  onClick={() => handleSaveAll(section.fields)}
                  disabled={saving || !section.fields.some(f => edited[f.key] !== undefined)}
                  className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg ${
                    section.fields.some(f => edited[f.key] !== undefined)
                      ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}>
                  <Save size={12} /> 保存全部
                </button>
              </div>
              <div className="space-y-4">{section.fields.map(renderField)}</div>
            </div>
          ))}

          {renderTimePicker({
            title: '采集时间', desc: '每天在以下时间自动采集标讯数据',
            times: fetchTimes, setTimes: setFetchTimes,
            editing: fetchEditing, setEditing: setFetchEditing, onSave: saveFetchSchedule,
          })}

          {renderTimePicker({
            title: '推送时间', desc: '每天在以下时间推送日报到企微群',
            times: pushTimes, setTimes: setPushTimes,
            editing: pushEditing, setEditing: setPushEditing, onSave: savePushSchedule,
          })}

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">系统信息</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">版本：</span>1.0.0</div>
              <div><span className="text-gray-500">数据源：</span>{config['datasource.name']?.value || '知了标讯'}</div>
              <div><span className="text-gray-500">AI 模型：</span>{config['llm.model']?.value || 'mimo-v2.5-pro'}</div>
              <div><span className="text-gray-500">数据库：</span>Supabase (PostgreSQL)</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
