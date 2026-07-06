import { useEffect, useState } from 'react';
import { radarApi } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Save, RefreshCw, Pencil, X, Plus, Trash2, Target, Tag, TrendingUp, Settings2, Users, Clock, Key, Database, Mail } from 'lucide-react';

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
  return hours.filter(Boolean).map(h => `${String(h).padStart(2, '0')}:${minute.padStart(2, '0')}`).sort();
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
      { key: 'datasource.name', label: '数据源名称', type: 'text', default: '知了标讯' },
      { key: 'datasource.zlbx.api_key', label: 'API Key', type: 'password' },
      { key: 'datasource.zlbx.base_url', label: 'API URL', type: 'text', default: 'https://mcp-server.zhiliaobiaoxun.com/api_v2' },
    ],
  },
  {
    title: 'AI 模型 (LLM)',
    fields: [
      { key: 'llm.api_key', label: 'API Key', type: 'password' },
      { key: 'llm.model', label: '模型名称', type: 'text' },
      { key: 'llm.base_url', label: 'API URL', type: 'text' },
    ],
  },
  {
    title: '数据采集',
    fields: [
      { key: 'fetch.province', label: '目标省份/城市', type: 'provinces' },
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

const TABS = [
  { key: 'model', label: '模型与数据源', icon: Database },
  { key: 'keywords', label: '关键词', icon: Key },
  { key: 'schedule', label: '定时任务', icon: Clock },
  { key: 'email', label: '邮件服务', icon: Mail },
  { key: 'users', label: '用户', icon: Users },
];


// ── 省份标签输入组件 ────────────────────────────
function ProvincesInput({ value, onChange, onSave, onCancel, isModified, saving }) {
  const [inputValue, setInputValue] = useState('');

  // Parse value to array
  let provinces = [];
  if (Array.isArray(value)) {
    provinces = value;
  } else if (typeof value === 'string' && value) {
    provinces = value.split(/[,，]/).map(s => s.trim()).filter(Boolean);
  }

  const handleAdd = () => {
    const newProvince = inputValue.trim();
    if (newProvince && !provinces.includes(newProvince)) {
      onChange([...provinces, newProvince].join(','));
      setInputValue('');
    }
  };

  const handleRemove = (index) => {
    const next = provinces.filter((_, i) => i !== index);
    onChange(next.join(','));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {provinces.map((p, i) => (
          <span key={i} className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs px-2 py-1 rounded border border-indigo-200">
            {p}
            <button onClick={() => handleRemove(i)} className="text-indigo-400 hover:text-indigo-600">
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入省份或城市，回车添加"
          className="text-xs border-none bg-transparent focus:outline-none min-w-[120px]"
        />
      </div>
      {isModified && (
        <div className="flex gap-2 pt-2 border-t border-slate-100">
          <button onClick={onSave} disabled={saving}
            className="inline-flex items-center gap-1 text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 disabled:opacity-50">
            <Save size={12} /> {saving ? '保存中...' : '保存'}
          </button>
          <button onClick={onCancel} className="text-xs text-slate-500 hover:text-slate-700 px-2">
            取消
          </button>
        </div>
      )}
    </div>
  );
}

// ── 格式化字段值显示 ────────────────────────────
function formatFieldValue(type, val, defaultVal) {
  if (type === 'password' && val) {
    return val.length > 12 ? val.slice(0, 8) + '***' + val.slice(-4) : '••••••••';
  }
  if (type === 'keywords') {
    let parsed = val;
    if (typeof val === 'string') {
      try { parsed = JSON.parse(val); } catch { parsed = null; }
    }
    if (Array.isArray(parsed)) {
      return parsed.flatMap(g => (g.groups || []).flatMap(ig => ig.keywords || [])).join('，');
    }
  }
  if (typeof val === 'object') return JSON.stringify(val, null, 2);
  return String(val || defaultVal || '');
}

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
        <div className="bg-yellow-50 rounded-lg p-3 text-center">
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

// ── 用户管理组件 ──────────────────────────────────────────
function UserManagement() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('sales');
  const [saving, setSaving] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');

  const fetchUsers = () => {
    setLoading(true);
    radarApi.get('/admin/users')
      .then(res => setUsers(res.data || []))
      .catch(err => toast.error('加载用户失败: ' + err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleAdd = async () => {
    if (!newEmail || !newPassword) { toast.error('邮箱和密码不能为空'); return; }
    setSaving(true);
    try {
      await radarApi.post('/admin/users', { body: { email: newEmail, password: newPassword, role: newRole } });
      toast.success('用户已创建');
      setAddOpen(false); setNewEmail(''); setNewPassword(''); setNewRole('sales');
      fetchUsers();
    } catch (err) { toast.error('创建失败: ' + err.message); }
    finally { setSaving(false); }
  };

  const handleRoleChange = async (userId, role) => {
    try {
      await radarApi.put(`/admin/users/${userId}/role`, { body: { role } });
      toast.success('角色已更新');
      fetchUsers();
    } catch (err) { toast.error('更新失败: ' + err.message); }
  };

  const startEdit = (user) => {
    setEditingUser(user.id);
    setEditEmail(user.email);
    setEditPassword('');
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setEditEmail('');
    setEditPassword('');
  };

  const handleSaveEdit = async (userId) => {
    if (!editEmail) { toast.error('邮箱不能为空'); return; }
    setSaving(true);
    try {
      const body = { email: editEmail };
      if (editPassword) {
        if (editPassword.length < 6) { toast.error('密码至少6位'); setSaving(false); return; }
        body.password = editPassword;
      }
      await radarApi.put(`/admin/users/${userId}`, { body });
      toast.success('用户已更新');
      cancelEdit();
      fetchUsers();
    } catch (err) { toast.error('更新失败: ' + err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (userId, email) => {
    if (!confirm(`确定要删除用户 ${email} 吗？`)) return;
    try {
      await radarApi.delete(`/admin/users/${userId}`);
      toast.success('用户已删除');
      fetchUsers();
    } catch (err) { toast.error('删除失败: ' + err.message); }
  };

  const handleResetPassword = async (userId, email) => {
    const password = prompt(`请输入 ${email} 的新密码（至少6位）：`);
    if (!password) return;
    if (password.length < 6) { toast.error('密码至少6位'); return; }
    try {
      await radarApi.post(`/admin/users/${userId}/reset-password`, { body: { password } });
      toast.success('密码已重置');
    } catch (err) { toast.error('重置失败: ' + err.message); }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900">用户管理</h3>
        <button onClick={() => setAddOpen(!addOpen)}
          className="inline-flex items-center gap-1 text-xs border border-slate-200/80 text-slate-600 px-2 py-1 rounded hover:bg-slate-100">
          <Plus size={12} /> 新增用户
        </button>
      </div>

      {addOpen && (
        <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
              placeholder="邮箱" className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
              placeholder="密码" className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
            <select value={newRole} onChange={e => setNewRole(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400">
              <option value="sales">销售</option>
              <option value="presales">售前</option>
              <option value="hr">人事</option>
              <option value="admin">管理员</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={saving}
              className="inline-flex items-center gap-1 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              <Save size={12} /> {saving ? '创建中...' : '创建'}
            </button>
            <button onClick={() => setAddOpen(false)} className="text-xs text-slate-500 hover:text-slate-700 px-2">取消</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center text-slate-400 py-4 text-sm">加载中...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase">邮箱</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase">密码</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase">角色</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase">最后登录</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => (
                <tr key={u.id} className={`hover:bg-slate-50/50 ${editingUser === u.id ? 'bg-indigo-50/30' : ''}`}>
                  <td className="px-3 py-2.5">
                    {editingUser === u.id ? (
                      <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)}
                        className="w-full border border-indigo-400 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                    ) : (
                      <span className="text-slate-800">{u.email}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {editingUser === u.id ? (
                      <input type="password" value={editPassword} onChange={e => setEditPassword(e.target.value)}
                        placeholder="留空不修改" className="w-full border border-indigo-400 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                    ) : (
                      <span className="text-xs text-slate-400">••••••••</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <select value={u.role} onChange={e => handleRoleChange(u.id, e.target.value)}
                      className="text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                      <option value="sales">销售</option>
                      <option value="presales">售前</option>
                      <option value="hr">人事</option>
                      <option value="admin">管理员</option>
                    </select>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-400">
                    {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString('zh-CN') : '从未登录'}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {editingUser === u.id ? (
                        <>
                          <button onClick={() => handleSaveEdit(u.id)} disabled={saving}
                            className="inline-flex items-center gap-1 text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 disabled:opacity-50">
                            <Save size={12} /> {saving ? '...' : '保存'}
                          </button>
                          <button onClick={cancelEdit}
                            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded">
                            <X size={12} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(u)}
                            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 px-2 py-1 rounded hover:bg-indigo-50"
                            title="编辑">
                            <Pencil size={12} />
                          </button>
                          <button onClick={() => handleDelete(u.id, u.email)}
                            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50"
                            title="删除用户">
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function Settings() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [edited, setEdited] = useState({});
  const [editingKey, setEditingKey] = useState(null);

  const [fetchTimes, setFetchTimes] = useState([]);
  const [fetchEditing, setFetchEditing] = useState(false);
  const [pushTimes, setPushTimes] = useState([]);
  const [pushEditing, setPushEditing] = useState(false);

  const [activeTab, setActiveTab] = useState('model');

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
    setSaving(true);
    try {
      const val = rawValue !== undefined ? rawValue : parseValue(edited[key]);
      await radarApi.put(`/config/${encodeURIComponent(key)}`, { body: { value: val } });
      toast.success(`已保存: ${key}`);
      setEdited(prev => { const n = { ...prev }; delete n[key]; return n; });
      setEditingKey(null);
      fetchConfig();
    } catch (err) { toast.error(`保存失败: ${err.message}`); }
    finally { setSaving(false); }
  };

  const handleSaveAll = async (fields) => {
    setSaving(true);
    let ok = 0, fail = 0;
    for (const f of fields) {
      if (edited[f.key] === undefined) continue;
      try {
        await radarApi.put(`/config/${encodeURIComponent(f.key)}`, { body: { value: parseValue(edited[f.key]) } });
        ok++;
      } catch { fail++; }
    }
    toast.info(`保存完成: ${ok} 成功${fail ? `, ${fail} 失败` : ''}`);
    setEdited({}); setEditingKey(null); fetchConfig(); setSaving(false);
  };

  const saveFetchSchedule = async () => {
    setSaving(true);
    try {
      await radarApi.put('/config/fetch.schedules', { body: { value: timesToCronArr(fetchTimes) } });
      toast.success('已保存: 采集时间'); setFetchEditing(false); fetchConfig();
    } catch (err) { toast.error(`保存失败: ${err.message}`); }
    finally { setSaving(false); }
  };

  const savePushSchedule = async () => {
    setSaving(true);
    try {
      await radarApi.put('/config/push.schedule', { body: { value: timesToCronStr(pushTimes) } });
      toast.success('已保存: 推送时间'); setPushEditing(false); fetchConfig();
    } catch (err) { toast.error(`保存失败: ${err.message}`); }
    finally { setSaving(false); }
  };

  // ── 通用字段渲染 ────────────────────────────
  const renderField = (field) => {
    const { key, label, type, default: defaultVal } = field;
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
        ) : type === 'provinces' ? (
          <ProvincesInput
            value={val}
            onChange={(newVal) => {
              setEdited(prev => ({ ...prev, [key]: newVal }));
              setEditingKey(key);
            }}
            onSave={() => handleSave(key)}
            onCancel={() => cancelEdit(key)}
            isModified={isModified}
            saving={saving}
          />
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
            {type === 'keywords' ? (
              <div className="flex-1 border rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
                {formatFieldValue(type, val, defaultVal)}
              </div>
            ) : (
              <div className={`flex-1 border rounded-lg px-3 py-2 text-sm ${type === 'password' ? 'font-mono tracking-wider' : ''} bg-slate-50 text-slate-700 truncate`}>
                {formatFieldValue(type, val, defaultVal)}
              </div>
            )}
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
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">系统设置</h2>
        <button onClick={fetchConfig} className="text-slate-500 hover:text-slate-700" title="刷新">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Tab 栏 */}
      <div className="flex gap-1 border-b border-slate-200 mb-6">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.key
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}>
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="text-center text-slate-500 py-8">加载中...</div>
      ) : (
        <>
          {/* 模型与数据源 */}
          {activeTab === 'model' && (
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

          {/* 关键词 */}
          {activeTab === 'keywords' && (
            <div className="bg-white rounded-xl border border-slate-200/80 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Settings2 size={16} className="text-slate-700" />
                <h3 className="text-sm font-semibold text-slate-900">关键词策略</h3>
              </div>
              <KeywordStrategySection />
            </div>
          )}

          {/* 定时任务 */}
          {activeTab === 'schedule' && (
            <div className="space-y-6">
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
            </div>
          )}

          {/* 邮件服务 */}
          {activeTab === 'email' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200/80 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Mail size={16} className="text-slate-700" />
                  <h3 className="text-sm font-semibold text-slate-900">邮件服务 (SMTP)</h3>
                </div>
                <div className="space-y-4">
                  {renderField({ key: 'email.smtp_host', label: 'SMTP 服务器', type: 'text', default: 'smtp.yunyou.top' })}
                  {renderField({ key: 'email.smtp_port', label: '端口', type: 'text', default: '465' })}
                  {renderField({ key: 'email.smtp_user', label: '邮箱账号', type: 'text' })}
                  {renderField({ key: 'email.smtp_pass', label: '邮箱密码', type: 'password' })}
                  {renderField({ key: 'email.from_address', label: '发件人地址', type: 'text' })}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200/80 p-5">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">邮件功能说明</h3>
                <div className="space-y-2 text-sm text-slate-600">
                  <p>• <strong>欢迎邮件</strong> — 创建用户时自动发送登录信息</p>
                  <p>• <strong>密码重置通知</strong> — 重置密码后发送通知邮件</p>
                  <p>• <strong>邮箱变更确认</strong> — 修改邮箱后发送确认邮件</p>
                </div>
                <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500">
                    使用企业邮箱 SMTP 发送邮件。请确保邮箱账号已开启 SMTP 服务。
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 用户 */}
          {activeTab === 'users' && <UserManagement />}
        </>
      )}
    </div>
  );
}
