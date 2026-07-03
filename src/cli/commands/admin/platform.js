/**
 * cr admin platform:* - 平台管理
 */
const { apiRequest } = require('../../lib/auth');
const { output, success, error } = require('../../lib/output');

async function list(options = {}) {
  try {
    const params = new URLSearchParams();
    if (options.type) params.set('type', options.type);

    const result = await apiRequest(`/api/platforms?${params.toString()}`);
    
    if (!result.success) {
      error(result.error || '获取平台列表失败');
      return;
    }

    if (options.json) {
      output(result.data, { json: true });
      return;
    }

    const platforms = result.data.map(p => ({
      ID: p.id,
      名称: p.platform_name,
      URL: p.base_url?.substring(0, 30),
      类型: p.platform_type,
      反爬: p.anti_bot_level || '-',
      状态: p.is_active ? '✅' : '❌',
    }));

    output(platforms, { total: result.total });
  } catch (err) {
    error(`请求失败: ${err.message}`);
  }
}

async function add(options) {
  try {
    const result = await apiRequest('/api/platforms', {
      method: 'POST',
      body: JSON.stringify({
        platform_name: options.name,
        base_url: options.url,
        platform_type: options.type,
        anti_bot_level: options.antiBot,
      }),
    });

    if (!result.success) {
      error(result.error || '新增平台失败');
      return;
    }

    if (options.json) {
      output(result.data, { json: true });
      return;
    }

    success(`新增成功: ${result.data.platform_name} (ID: ${result.data.id})`);
  } catch (err) {
    error(`请求失败: ${err.message}`);
  }
}

async function update(id, options) {
  try {
    const updates = {};
    if (options.name) updates.platform_name = options.name;
    if (options.active !== undefined) updates.is_active = options.active === 'true';

    const result = await apiRequest(`/api/platforms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });

    if (!result.success) {
      error(result.error || '更新平台失败');
      return;
    }

    if (options.json) {
      output(result.data, { json: true });
      return;
    }

    success(`更新成功: ${result.data.platform_name}`);
  } catch (err) {
    error(`请求失败: ${err.message}`);
  }
}

async function remove(id) {
  try {
    const result = await apiRequest(`/api/platforms/${id}`, {
      method: 'DELETE',
    });

    if (!result.success) {
      error(result.error || '删除平台失败');
      return;
    }

    success('删除成功');
  } catch (err) {
    error(`请求失败: ${err.message}`);
  }
}

module.exports = { list, add, update, remove };
