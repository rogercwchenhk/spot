/**
 * cr person - 查看人员资质
 */
const { apiRequest } = require('../lib/auth');
const { output, error } = require('../lib/output');

async function execute(options = {}) {
  try {
    const params = new URLSearchParams();
    if (options.type) params.set('type', options.type);

    const result = await apiRequest(`/api/qualifications/personnel?${params.toString()}`);
    
    if (!result.success) {
      error(result.error || '获取人员资质失败');
      process.exit(1);
    }

    if (options.json) {
      output(result.data, { json: true });
      return;
    }

    const quals = result.data.map(q => ({
      ID: q.id,
      姓名: q.person_name,
      类型: q.qual_type,
      证书: q.qual_name,
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
