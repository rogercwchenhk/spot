/**
 * cr admin config:* - 系统配置管理
 * 推送时间、Webhook 地址等
 */
const { apiRequest } = require('../../lib/auth');
const { output, success, error, info } = require('../../lib/output');

const CONFIG_LABELS = {
  'push.schedule': '推送 cron 计划',
  'push.webhook_url': '企微 Webhook 地址',
  'push.enabled': '推送开关',
  'push.daily_summary': '日报汇总模式',
  'fetch.schedule': '采集 cron 计划',
};

/**
 * 列出全部配置
 */
async function list(options = {}) {
  try {
    const result = await apiRequest('/api/config');

    if (!result.success) {
      error(result.error || '获取配置失败');
      return;
    }

    if (options.json) {
      output(result.data, { json: true });
      return;
    }

    const rows = Object.entries(result.data).map(([key, cfg]) => ({
      配置项: key,
      值: formatValue(cfg.value),
      说明: cfg.description || CONFIG_LABELS[key] || '-',
      更新: cfg.updated_at ? new Date(cfg.updated_at).toLocaleString('zh-CN') : '-',
    }));

    output(rows);
  } catch (err) {
    error(`请求失败: ${err.message}`);
  }
}

/**
 * 获取单个配置
 */
async function get(key, options = {}) {
  try {
    const result = await apiRequest(`/api/config/${encodeURIComponent(key)}`);

    if (!result.success) {
      error(result.error || '获取配置失败');
      return;
    }

    if (options.json) {
      output(result.data, { json: true });
      return;
    }

    info(`${key}: ${formatValue(result.data.value)}`);
    if (result.data.description) info(`说明: ${result.data.description}`);
  } catch (err) {
    error(`请求失败: ${err.message}`);
  }
}

/**
 * 更新配置
 */
async function set(key, value, options = {}) {
  try {
    // 尝试解析 JSON 值
    let parsedValue;
    if (value === 'true') parsedValue = true;
    else if (value === 'false') parsedValue = false;
    else if (/^\d+$/.test(value)) parsedValue = parseInt(value, 10);
    else if (value.startsWith('"') || value.startsWith('{') || value.startsWith('[')) {
      try { parsedValue = JSON.parse(value); } catch (e) { parsedValue = value; }
    }
    else parsedValue = value;

    const body = { value: parsedValue };
    if (options.description) body.description = options.description;

    const result = await apiRequest(`/api/config/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });

    if (!result.success) {
      error(result.error || '更新配置失败');
      return;
    }

    if (options.json) {
      output(result.data, { json: true });
      return;
    }

    success(`${key} 已更新: ${formatValue(result.data.value)}`);
  } catch (err) {
    error(`请求失败: ${err.message}`);
  }
}

/**
 * 快捷命令：设置推送时间
 */
async function setPushSchedule(cron, options = {}) {
  return set('push.schedule', `"${cron}"`, { ...options, description: '企微推送 cron 表达式' });
}

/**
 * 快捷命令：设置 Webhook
 */
async function setWebhook(url, options = {}) {
  return set('push.webhook_url', `"${url}"`, { ...options, description: '企微群机器人 Webhook 地址' });
}

/**
 * 快捷命令：开关推送
 */
async function togglePush(enabled, options = {}) {
  return set('push.enabled', enabled, { ...options, description: '是否启用推送' });
}

function formatValue(val) {
  if (val === null || val === undefined) return '-';
  if (typeof val === 'boolean') return val ? '✅ 开启' : '❌ 关闭';
  if (typeof val === 'string') return val;
  return JSON.stringify(val);
}

module.exports = { list, get, set, setPushSchedule, setWebhook, togglePush };
