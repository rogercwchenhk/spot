/**
 * cr search <keyword> - 搜索标讯
 */
const { apiRequest } = require('../lib/auth');
const { output, colorizeLevel, error } = require('../lib/output');

function getMatchLevel(mr) {
  const m = Array.isArray(mr) ? mr[0] : mr;
  return m ? colorizeLevel(m.recommend_level) : '-';
}

async function execute(keyword, options = {}) {
  try {
    const params = new URLSearchParams();
    params.set('keyword', keyword);
    if (options.page) params.set('page', options.page);

    const result = await apiRequest(`/api/notices?${params.toString()}`);

    if (!result.success) {
      error(result.error || '搜索失败');
      process.exit(1);
    }

    if (options.json) {
      output(result.data, { json: true });
      return;
    }

    const notices = result.data.map(n => ({
      ID: n.id,
      标题: n.title?.substring(0, 40) + (n.title?.length > 40 ? '...' : ''),
      预算: n.budget_amount ? `¥${(n.budget_amount / 10000).toFixed(0)}万` : '-',
      城市: n.city || '-',
      等级: getMatchLevel(n.match_result),
    }));

    console.log(`\n搜索 "${keyword}" 的结果:`);
    output(notices, { total: result.total });
  } catch (err) {
    error(`请求失败: ${err.message}`);
    process.exit(1);
  }
}

module.exports = { execute };
