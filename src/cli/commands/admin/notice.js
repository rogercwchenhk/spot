/**
 * cr admin notice:* - 标讯处理
 */
const { apiRequest } = require('../../lib/auth');
const { output, success, error, info } = require('../../lib/output');

async function fetch(options = {}) {
  try {
    const keywords = options.keyword ? options.keyword.split(',') : ['运维', '小型机'];

    info(`开始采集: ${keywords.join(', ')}`);
    
    const result = await apiRequest('/api/admin/notices/fetch', {
      method: 'POST',
      body: JSON.stringify({ keywords }),
    });

    if (!result.success) {
      error(result.error || '采集失败');
      return;
    }

    if (options.json) {
      output(result.data, { json: true });
      return;
    }

    success(`采集完成: 取${result.data.fetched} 新增${result.data.inserted} 跳过${result.data.skipped}`);
  } catch (err) {
    error(`请求失败: ${err.message}`);
  }
}

async function processNotice(id, options = {}) {
  try {
    let result;
    
    if (options.batch || !id) {
      info('开始批量 AI 处理...');
      result = await apiRequest('/api/admin/notices/process-batch', {
        method: 'POST',
        body: JSON.stringify({ limit: 20 }),
      });
    } else {
      info(`处理标讯 #${id}...`);
      result = await apiRequest(`/api/admin/notices/${id}/process`, {
        method: 'POST',
      });
    }

    if (!result.success) {
      error(result.error || '处理失败');
      return;
    }

    if (options.json) {
      output(result.data, { json: true });
      return;
    }

    if (options.batch) {
      success(`AI 处理完成: ${result.data.processed} 成功, ${result.data.failed} 失败`);
    } else {
      success(`处理完成: ${result.data.status}`);
    }
  } catch (err) {
    error(`请求失败: ${err.message}`);
  }
}

async function match(id, options = {}) {
  try {
    let result;
    
    if (options.batch || !id) {
      info('开始批量匹配计算...');
      result = await apiRequest('/api/admin/match/batch', {
        method: 'POST',
        body: JSON.stringify({ limit: 50 }),
      });
    } else {
      info(`计算标讯 #${id} 匹配结果...`);
      result = await apiRequest(`/api/admin/match/${id}`, {
        method: 'POST',
      });
    }

    if (!result.success) {
      error(result.error || '匹配计算失败');
      return;
    }

    if (options.json) {
      output(result.data, { json: true });
      return;
    }

    if (options.batch) {
      success(`匹配完成: ${result.data.calculated} 成功, ${result.data.failed} 失败`);
    } else {
      success(`匹配完成: ${result.data.recommend_level} (扣分: ${result.data.total_deduction})`);
    }
  } catch (err) {
    error(`请求失败: ${err.message}`);
  }
}

module.exports = { fetch, process: processNotice, match };
