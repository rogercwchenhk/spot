/**
 * cr admin user:* - 用户管理
 */
const { apiRequest } = require('../../lib/auth');
const { output, success, error } = require('../../lib/output');

async function list(options = {}) {
  try {
    const result = await apiRequest('/api/admin/users');
    
    if (!result.success) {
      error(result.error || '获取用户列表失败');
      return;
    }

    if (options.json) {
      output(result.data, { json: true });
      return;
    }

    const users = result.data.map(u => ({
      ID: u.id?.substring(0, 8) + '...',
      邮箱: u.email,
      角色: u.role,
      创建: u.created_at ? new Date(u.created_at).toLocaleDateString('zh-CN') : '-',
      最后登录: u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('zh-CN') : '-',
    }));

    output(users);
  } catch (err) {
    error(`请求失败: ${err.message}`);
  }
}

async function add(options) {
  try {
    const result = await apiRequest('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        email: options.email,
        password: options.password,
        role: options.role,
      }),
    });

    if (!result.success) {
      error(result.error || '新增用户失败');
      return;
    }

    if (options.json) {
      output(result.data, { json: true });
      return;
    }

    success(`新增成功: ${result.data.email} (${result.data.role})`);
  } catch (err) {
    error(`请求失败: ${err.message}`);
  }
}

async function role(id, options) {
  try {
    const result = await apiRequest(`/api/admin/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role: options.role }),
    });

    if (!result.success) {
      error(result.error || '修改角色失败');
      return;
    }

    if (options.json) {
      output(result.data, { json: true });
      return;
    }

    success(`角色已更新: ${result.data.email} → ${result.data.role}`);
  } catch (err) {
    error(`请求失败: ${err.message}`);
  }
}

module.exports = { list, add, role };
