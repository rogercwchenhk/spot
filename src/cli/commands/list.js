/**
 * cr list - 查看标讯列表
 */
const { apiRequest } = require('../lib/auth');
const { output, colorizeLevel, error } = require('../lib/output');

function getMatchLevel(mr) {
  const m = Array.isArray(mr) ? mr[0] : mr;
  return m ? colorizeLevel(m.recommend_level) : '-';
}

async function execute(options = {}) {
  try {
    const params = new URLSearchParams();
    if (options.level) params.set('recommend_level', options.level);
    if (options.city) params.set('region_scope', options.city);
    if (options.access) params.set('doc_access_type', options.access);
    if (options.page) params.set('page', options.page);
    
    // 日期筛选
    if (options.days) {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(options.days));
      params.set('start_date', daysAgo.toISOString().slice(0, 10));
    }

    const result = await apiRequest(`/api/notices?${params.toString()}`);
    
    if (!result.success) {
      error(result.error || '获取标讯列表失败');
      process.exit(1);
    }

    if (options.json) {
      output(result.data, { json: true });
      return;
    }

    // 格式化输出
    const notices = result.data.map(n => ({
      ID: n.id,
      标题: n.title?.substring(0, 40) + (n.title?.length > 40 ? '...' : ''),
      预算: n.budget_amount ? `¥${(n.budget_amount / 10000).toFixed(0)}万` : '-',
      城市: n.city || '-',
      截止: n.end_date ? new Date(n.end_date).toLocaleDateString('zh-CN') : '-',
      等级: getMatchLevel(n.match_result),
    }));

    output(notices, { total: result.total });
  } catch (err) {
    error(`请求失败: ${err.message}`);
    process.exit(1);
  }
}

module.exports = { execute };
