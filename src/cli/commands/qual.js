/**
 * cr qual - 查看公司资质
 */
const { apiRequest } = require('../lib/auth');
const { output, error } = require('../lib/output');

async function execute(options = {}) {
  try {
    const params = new URLSearchParams();
    if (options.type) params.set('type', options.type);

    const result = await apiRequest(`/api/qualifications/company?${params.toString()}`);
    
    if (!result.success) {
      error(result.error || '获取资质列表失败');
      process.exit(1);
    }

    if (options.json) {
      output(result.data, { json: true });
      return;
    }

    const quals = result.data.map(q => ({
      ID: q.id,
      类型: q.qual_type,
      名称: q.qual_name,
      等级: q.qual_level || '-',
      编号: q.cert_number || '-',
      到期: q.expiry_date || '-',
      状态: q.is_active ? '✅ 有效' : '❌ 无效',
    }));

    output(quals, { total: result.total });
  } catch (err) {
    error(`请求失败: ${err.message}`);
    process.exit(1);
  }
}

module.exports = { execute };
