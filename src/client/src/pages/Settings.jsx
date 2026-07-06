import { useEffect, useState } from 'react';
import { radarApi } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { Save, RefreshCw, Pencil, X, Plus, Trash2, Target, Tag, TrendingUp, Settings2 } from 'lucide-react';

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


// ── 关键词策略展示组件 ────────────────────────────
function KeywordStrategySection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    radarApi.get('/admin/keyword-strategy')
      .then(res => setData(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center text-slate-500 py-4">加载中...</div>;
  if (error) return <div className="text-red-500 text-sm py-4">加载失败: {error}</div>;
  if (!data) return null;

  const { keyword_groups, exclude_keywords, stats, tuned_max_pages, adjustments } = data;

  // 计算总览数据
  let totalNotices = 0, totalStrong = 0, totalYes = 0, totalMatched = 0;
  for (const s of stats || []) {
    totalNotices += s.total_notices || 0;
    totalStrong += s.strong_count || 0;
    totalYes += s.yes_count || 0;
    totalMatched += s.matched_count || 0;
  }
  const overallRate = totalMatched > 0 ? Math.round((totalStrong + totalYes) / totalMatched * 100) : 0;

  // 构建统计 map
  const statsMap = {};
  for (const s of stats || []) {
    statsMap[s.keyword_source] = s;
  }

  return (
    <div className="space-y-4">
      {/* 总览卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-slate-900">{totalNotices}</div>
          <div className="text-xs text-slate-500">总入库</div>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-700">{totalStrong}</div>
          <div className="text-xs text-green-600">强推</div>
        </div>
        <div className="bg-indigo-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-yellow-700">{totalYes}</div>
          <div className="text-xs text-yellow-600">可投</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-700">{overallRate}%</div>
          <div className="text-xs text-blue-600">总有效率</div>
        </div>
      </div>

      {/* 关键词分组 */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-slate-700 flex items-center gap-1">
          <Target size={14} /> 关键词分组 ({keyword_groups.length} 组)
        </h4>
        {keyword_groups.map((group, i) => {
          const st = statsMap[group.name] || {};
          const tunedPages = tuned_max_pages?.[group.name];
          const adj = adjustments?.find(a => a.name === group.name);
          const effectiveRate = st.effective_rate !== null && st.effective_rate !== undefined
            ? st.effective_rate : null;

          return (
            <div key={i} className="border border-slate-200/80 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-slate-900">{group.name}</span>
                  <span className="text-xs text-slate-400">{group.groups?.length || 0} 个组合</span>
                </div>
                <div className="flex items-center gap-2">
                  {effectiveRate !== null && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      effectiveRate >= 30 ? 'bg-green-100 text-green-700' :
                      effectiveRate >= 15 ? 'bg-yellow-100 text-yellow-700' :
                      effectiveRate >= 5 ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      有效率 {effectiveRate}%
                    </span>
                  )}
                  {tunedPages !== undefined && tunedPages !== null && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      maxPages: {tunedPages}
                    </span>
                  )}
                </div>
              </div>

              {/* 统计行 */}
              {st.total_notices > 0 && (
                <div className="flex gap-3 text-xs text-slate-500 mb-2">
                  <span>入库 {st.total_notices}</span>
                  <span className="text-green-600">strong {st.strong_count || 0}</span>
                  <span className="text-yellow-600">yes {st.yes_count || 0}</span>
                  <span className="text-orange-500">risky {st.risky_count || 0}</span>
                  <span className="text-red-500">no {st.no_count || 0}</span>
                </div>
              )}

              {/* 调优建议 */}
              {adj?.reason && (
                <div className="text-xs text-blue-600 mb-2">💡 {adj.reason}</div>
              )}

              {/* 关键词列表 */}
              <div className="flex flex-wrap gap-1">
                {group.groups?.map((g, j) => (
                  <span key={j} className="inline-flex items-center bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded">
                    {g.keywords?.join(' + ')}
                    <span className="ml-1 text-slate-400">[{g.match_modes?.join(',')}]</span>
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* 排除词 */}
      <div>
        <h4 className="text-xs font-semibold text-slate-700 flex items-center gap-1 mb-2">
          <Tag size={14} /> 排除词 ({exclude_keywords.length} 个)
        </h4>
        <div className="flex flex-wrap gap-1">
          {exclude_keywords.map((word, i) => (
            <span key={i} className="inline-flex items-center bg-red-50 text-red-600 text-xs px-2 py-0.5 rounded border border-red-200">
              {word}
            </span>
          ))}
        </div>
      </div>

      {/* 演进历史提示 */}
      <div className="bg-slate-50 rounded-lg p-3">
        <h4 className="text-xs font-semibold text-slate-700 flex items-center gap-1 mb-1">
          <TrendingUp size={14} /> 演进历史
        </h4>
        <p className="text-xs text-slate-500">
          关键词策略 v2 (2026-07-04): 从 8 组基础关键词升级为 6 大分组 39 个组合，使用高级查询 + match_modes 精准匹配。
          自进化系统已启用：每周一自动推送效果报告，可执行 cr admin keyword:tune 查看调优建议。
        </p>
        {data.tuned_at && (
          <p className="text-xs text-blue-500 mt-1">
            上次调优: {new Date(data.tuned_at).toLocaleString('zh-CN')}
          </p>
        )}
      </div>
    </div>
  );
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

  if (!isAdmin) return <div className="text-center text-slate-500 py-8">需要管理员权限</div>;

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
        <label className="block text-xs text-slate-500 mb-1">{label}</label>
        {type === 'toggle' ? (
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const next = val === true || val === 'true' ? 'false' : 'true';
                setEdited(prev => ({ ...prev, [key]: next })); setEditingKey(key);
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                val === true || val === 'true' ? 'bg-green-500' : 'bg-slate-300'
              }`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                val === true || val === 'true' ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
            <span className="text-xs text-slate-500">{val === true || val === 'true' ? '开启' : '关闭'}</span>
            {isModified && (
              <>
                <button onClick={() => handleSave(key)} disabled={saving}
                  className="inline-flex items-center gap-1 text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700">
                  <Save size={12} /> 保存
                </button>
                <button onClick={() => cancelEdit(key)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
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
                className="flex-1 border border-indigo-400 bg-indigo-50 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-y"
              />
            ) : (
              <input type={type} value={edited[key] ?? ''}
                onChange={e => setEdited(prev => ({ ...prev, [key]: e.target.value }))}
                autoFocus
                className="flex-1 border border-indigo-400 bg-indigo-50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
            )}
            <button onClick={() => handleSave(key)} disabled={saving}
              className="self-end inline-flex items-center gap-1 text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 shrink-0">
              <Save size={12} /> 保存
            </button>
            <button onClick={() => cancelEdit(key)} className="self-end text-slate-400 hover:text-slate-600 shrink-0"><X size={14} /></button>
          </div>
        ) : (
          <div className="flex gap-2">
            <div className={`flex-1 border rounded-lg px-3 py-2 text-sm ${type === 'password' ? 'font-mono tracking-wider' : ''} bg-slate-50 text-slate-700 truncate`}>
              {type === 'password' && val ? '••••••••' : (typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val || ''))}
            </div>
            <button onClick={() => startEdit(key)}
              className="self-end inline-flex items-center gap-1 text-xs border border-slate-200/80 text-slate-600 px-2 py-1 rounded hover:bg-slate-100 shrink-0">
              <Pencil size={12} /> 编辑
            </button>
          </div>
        )}
      </div>
    );
  };

  // ── 时间选择器组件 ────────────────────────────
  const renderTimePicker = ({ title, desc, times, setTimes, editing, setEditing, onSave }) => (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {!editing && (
          <button onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1 text-xs border border-slate-200/80 text-slate-600 px-2 py-1 rounded hover:bg-slate-100">
            <Pencil size={12} /> 编辑
          </button>
        )}
      </div>
      <p className="text-xs text-slate-400 mb-3">{desc}</p>

      {editing ? (
        <>
          <div className="flex flex-wrap gap-2 mb-3">
            {times.map((t, i) => (
              <div key={i} className="inline-flex items-center gap-1 bg-indigo-50 border border-yellow-300 rounded-lg px-2 py-1">
                <input type="time" value={t}
                  onChange={e => { const next = [...times]; next[i] = e.target.value; setTimes(next); }}
                  className="text-sm border-none bg-transparent focus:outline-none"
                />
                <button onClick={() => setTimes(times.filter((_, j) => j !== i))}
                  className="text-slate-400 hover:text-red-500"><Trash2 size={12} /></button>
              </div>
            ))}
            <button onClick={() => setTimes([...times, '12:00'])}
              className="inline-flex items-center gap-1 text-xs text-slate-600 border border-dashed border-slate-200 px-2 py-1 rounded hover:bg-slate-50">
              <Plus size={12} /> 添加
            </button>
          </div>
          <div className="flex gap-2 pt-3 border-t border-slate-100">
            <button onClick={onSave} disabled={saving}
              className="inline-flex items-center gap-1 text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50">
              <Save size={14} /> 保存
            </button>
            <button onClick={() => { setEditing(false); fetchConfig(); }}
              className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 px-4 py-2">
              <X size={14} /> 取消
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap gap-2">
          {times.map((t, i) => (
            <span key={i} className="inline-flex items-center bg-slate-100 text-slate-700 text-sm px-3 py-1 rounded-full">{t}</span>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">系统设置</h2>
        <button onClick={fetchConfig} className="text-slate-500 hover:text-slate-700" title="刷新">
          <RefreshCw size={16} />
        </button>
      </div>

      {msg && <div className="mb-4 text-sm bg-green-50 text-green-700 rounded-lg px-3 py-2">{msg}</div>}

      {loading ? (
        <div className="text-center text-slate-500 py-8">加载中...</div>
      ) : (
        <div className="space-y-6">
          {SECTIONS.map(section => (
            <div key={section.title} className="bg-white rounded-xl border border-slate-200/80 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-900">{section.title}</h3>
                <button
                  onClick={() => handleSaveAll(section.fields)}
                  disabled={saving || !section.fields.some(f => edited[f.key] !== undefined)}
                  className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg ${
                    section.fields.some(f => edited[f.key] !== undefined)
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
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

          {/* 关键词策略 */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Settings2 size={16} className="text-slate-700" />
              <h3 className="text-sm font-semibold text-slate-900">关键词策略</h3>
            </div>
            <KeywordStrategySection />
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">系统信息</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-slate-500">版本：</span>1.0.0</div>
              <div><span className="text-slate-500">数据源：</span>{config['datasource.name']?.value || '知了标讯'}</div>
              <div><span className="text-slate-500">AI 模型：</span>{config['llm.model']?.value || 'mimo-v2.5-pro'}</div>
              <div><span className="text-slate-500">数据库：</span>Supabase (PostgreSQL)</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
