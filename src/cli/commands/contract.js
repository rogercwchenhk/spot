/**
 * cr contract - 查看合同列表
 */
const { apiRequest } = require('../lib/auth');
const { output, error } = require('../lib/output');

async function execute(options = {}) {
  try {
    const params = new URLSearchParams();
    if (options.industry) params.set('industry', options.industry);
    if (options.type) params.set('service_type', options.type);

    const result = await apiRequest(`/api/contracts?${params.toString()}`);
    
    if (!result.success) {
      error(result.error || '获取合同列表失败');
      process.exit(1);
    }

    if (options.json) {
      output(result.data, { json: true });
      return;
    }

    const contracts = result.data.map(c => ({
      ID: c.id,
      项目: c.project_name?.substring(0, 30) + (c.project_name?.length > 30 ? '...' : ''),
      甲方: c.client_name || '-',
      类型: c.service_type || '-',
      行业: c.industry || '-',
      金额: c.contract_amount ? `¥${(c.contract_amount / 10000).toFixed(0)}万` : '-',
      截止: c.end_date || '-',
    }));

    output(contracts, { total: result.total });
  } catch (err) {
    error(`请求失败: ${err.message}`);
    process.exit(1);
  }
}

module.exports = { execute };
