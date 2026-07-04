import { useEffect, useState } from 'react';
import { radarApi } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { Save, RefreshCw } from 'lucide-react';

const SECTIONS = [
  {
    title: '数据源 — 知了标讯 API',
    fields: [
      { key: 'datasource.zlbx.api_key', label: 'API Key', type: 'password' },
      { key: 'datasource.zlbx.base_url', label: 'API 地址', type: 'text' },
      { key: 'fetch.province', label: '目标省份', type: 'text' },
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
      { key: 'fetch.schedules', label: '采集时间（cron 数组）', type: 'json', isArray: true },
      { key: 'fetch.keywords', label: '搜索关键词组', type: 'json', isArray: true },
    ],
  },
  {
    title: '企微推送',
    fields: [
      { key: 'push.enabled', label: '推送开关', type: 'toggle' },
      { key: 'push.schedule', label: '推送时间', type: 'text' },
      { key: 'push.webhook_url', label: 'Webhook 地址', type: 'text' },
      { key: 'push.daily_summary', label: '日报汇总模式', type: 'toggle' },
    ],
  },
];

export default function Settings() {
  const { isAdmin } = useAuth();
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [edited, setEdited] = useState({});
  const [msg, setMsg] = useState('');

  const fetchConfig = () => {
    setLoading(true);
    radarApi.get('/config')
      .then(res => setConfig(res.data || {}))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchConfig(); }, []);

  if (!isAdmin) return <div className="text-center text-gray-500 py-8">需要管理员权限</div>;

  const getValue = (key) => {
    if (edited[key] !== undefined) return edited[key];
    return config[key]?.value ?? '';
  };

  const handleChange = (key, value) => {
    setEdited(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async (key) => {
    setSaving(true);
    setMsg('');
    try {
      const value = edited[key];
      const raw = typeof value === 'string' ? value.trim() : value;
      let parsed;
      // 尝试解析 JSON（数组/对象/布尔/数字）
      if (typeof raw === 'string' && (raw.startsWith('[') || raw.startsWith('{') || raw === 'true' || raw === 'false' || !isNaN(Number(raw)))) {
        try { parsed = JSON.parse(raw); } catch { parsed = raw; }
      } else {
        parsed = raw;
      }
      await radarApi.put(`/config/${encodeURIComponent(key)}`, { body: { value: parsed } });
      setMsg(`已保存: ${key}`);
      setEdited(prev => { const next = { ...prev }; delete next[key]; return next; });
      fetchConfig();
    } catch (err) {
      setMsg(`保存失败: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async (fields) => {
    setSaving(true);
    setMsg('');
    let ok = 0, fail = 0;
    for (const f of fields) {
      if (edited[f.key] === undefined) continue;
      try {
        const raw = typeof edited[f.key] === 'string' ? edited[f.key].trim() : edited[f.key];
        let parsed;
        if (typeof raw === 'string' && (raw.startsWith('[') || raw.startsWith('{') || raw === 'true' || raw === 'false' || !isNaN(Number(raw)))) {
          try { parsed = JSON.parse(raw); } catch { parsed = raw; }
        } else {
          parsed = raw;
        }
        await radarApi.put(`/config/${encodeURIComponent(f.key)}`, { body: { value: parsed } });
        ok++;
      } catch { fail++; }
    }
    setMsg(`保存完成: ${ok} 成功${fail ? `, ${fail} 失败` : ''}`);
    setEdited({});
    fetchConfig();
    setSaving(false);
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

      {loading ? (
        <div className="text-center text-gray-500 py-8">加载中...</div>
      ) : (
        <div className="space-y-6">
          {SECTIONS.map(section => (
            <div key={section.title} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">{section.title}</h3>
                {section.fields.some(f => edited[f.key] !== undefined) && (
                  <button
                    onClick={() => handleSaveAll(section.fields)}
                    disabled={saving}
                    className="inline-flex items-center gap-1 text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 disabled:opacity-50"
                  >
                    <Save size={12} /> 保存全部
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {section.fields.map(field => {
                  const val = getValue(field.key);
                  const isModified = edited[field.key] !== undefined;

                  return (
                    <div key={field.key}>
                      <label className="block text-xs text-gray-500 mb-1">{field.label}</label>
                      {field.type === 'toggle' ? (
                        <button
                          onClick={() => handleChange(field.key, val === true || val === 'true' ? 'false' : 'true')}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            val === true || val === 'true' ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                        >
                          <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                            val === true || val === 'true' ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                        </button>
                      ) : field.isArray || field.type === 'json' ? (
                        <div className="flex gap-2">
                          <textarea
                            value={typeof val === 'string' ? val : JSON.stringify(val, null, 2)}
                            onChange={e => handleChange(field.key, e.target.value)}
                            rows={3}
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-y"
                          />
                          {isModified && (
                            <button onClick={() => handleSave(field.key)} disabled={saving} className="self-end text-gray-500 hover:text-green-600">
                              <Save size={14} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <input
                            type={field.type}
                            value={val ?? ''}
                            onChange={e => handleChange(field.key, e.target.value)}
                            className={`flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent ${
                              isModified ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'
                            }`}
                          />
                          {isModified && (
                            <button onClick={() => handleSave(field.key)} disabled={saving} className="self-end text-gray-500 hover:text-green-600">
                              <Save size={14} />
                            </button>
                          )}
                        </div>
                      )}
                      <div className="text-xs text-gray-400 mt-0.5">key: {field.key}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

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
