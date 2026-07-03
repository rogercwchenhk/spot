/**
 * cr admin stats - 系统统计
 */
const { apiRequest } = require('../../lib/auth');
const { output, error, info } = require('../../lib/output');

async function execute(options = {}) {
  try {
    const result = await apiRequest('/api/admin/stats');
    
    if (!result.success) {
      error(result.error || '获取统计失败');
      return;
    }

    if (options.json) {
      output(result.data, { json: true });
      return;
    }

    const { counts, ai_status, match_levels } = result.data;

    console.log('\n=== 系统统计 ===');
    console.log('\n📊 数据量:');
    console.log(`  标讯: ${counts.notices}`);
    console.log(`  公司资质: ${counts.company_qualifications}`);
    console.log(`  人员资质: ${counts.personnel_qualifications}`);
    console.log(`  合同: ${counts.contracts}`);
    console.log(`  匹配结果: ${counts.matches}`);

    if (Object.keys(ai_status).length > 0) {
      console.log('\n🤖 AI 处理状态:');
      for (const [status, count] of Object.entries(ai_status)) {
        const labels = { '0': '待处理', '1': '已清洗', '2': '已摘要', '3': '已打标', '4': '已完成', '-1': '噪声', '-2': '失败' };
        console.log(`  ${labels[status] || status}: ${count}`);
      }
    }

    if (Object.keys(match_levels).length > 0) {
      console.log('\n🎯 匹配等级:');
      for (const [level, count] of Object.entries(match_levels)) {
        console.log(`  ${level}: ${count}`);
      }
    }
  } catch (err) {
    error(`请求失败: ${err.message}`);
  }
}

module.exports = { execute };
