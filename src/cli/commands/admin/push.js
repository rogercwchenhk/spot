/**
 * cr admin push:* - 推送管理
 */
const { apiRequest } = require('../../lib/auth');
const { output, success, error, info } = require('../../lib/output');

async function test() {
  try {
    info('测试企微推送...');
    
    const result = await apiRequest('/api/admin/push/test', {
      method: 'POST',
    });

    if (!result.success) {
      error(result.error || '推送测试失败');
      return;
    }

    success('推送测试成功');
  } catch (err) {
    error(`请求失败: ${err.message}`);
  }
}

async function send(id) {
  try {
    info(`推送标讯 #${id}...`);
    
    const result = await apiRequest(`/api/admin/push/${id}`, {
      method: 'POST',
    });

    if (!result.success) {
      error(result.error || '推送失败');
      return;
    }

    success('推送成功');
  } catch (err) {
    error(`请求失败: ${err.message}`);
  }
}

async function batch() {
  try {
    info('批量推送新匹配...');
    
    const result = await apiRequest('/api/admin/push/batch', {
      method: 'POST',
    });

    if (!result.success) {
      error(result.error || '批量推送失败');
      return;
    }

    success(`推送完成: ${result.data.pushed} 推送, ${result.data.skipped} 跳过`);
  } catch (err) {
    error(`请求失败: ${err.message}`);
  }
}

module.exports = { test, send, batch };
