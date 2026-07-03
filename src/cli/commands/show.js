/**
 * cr show <id> - 查看标讯详情
 */
const { apiRequest } = require('../lib/auth');
const { output, colorizeLevel, error } = require('../lib/output');

async function execute(id, options = {}) {
  try {
    const result = await apiRequest(`/api/notices/${id}`);
    
    if (!result.success) {
      error(result.error || '获取标讯详情失败');
      process.exit(1);
    }

    if (options.json) {
      output(result.data, { json: true });
      return;
    }

    const n = result.data;
    const match = n.match_result?.[0];
    
    console.log('\n' + '='.repeat(60));
    console.log(`📋 标讯详情 #${n.id}`);
    console.log('='.repeat(60));
    console.log(`标题: ${n.title}`);
    console.log(`预算: ${n.budget_amount ? '¥' + (n.budget_amount / 10000).toFixed(0) + '万' : '未公开'}`);
    console.log(`城市: ${n.city || '-'}`);
    console.log(`发布: ${n.publish_date || '-'}`);
    console.log(`截止: ${n.end_date || '-'}`);
    console.log(`采购单位: ${n.tenderee || '-'}`);
    console.log(`代理机构: ${n.tender_agent || '-'}`);
    
    if (match) {
      console.log('\n--- 匹配结果 ---');
      console.log(`推荐等级: ${colorizeLevel(match.recommend_level)}`);
      console.log(`总扣分: ${match.total_deduction} 分`);
      
      if (match.match_details) {
        console.log('\n逐项匹配:');
        match.match_details.forEach(d => {
          const icon = d.matched ? '✅' : '❌';
          console.log(`  ${icon} ${d.requirement} ${d.deduction > 0 ? '(扣' + d.deduction + '分)' : ''}`);
        });
      }
    }

    if (n.notice_summary) {
      console.log('\n--- AI 摘要 ---');
      console.log(n.notice_summary);
    }

    if (n.source_url) {
      console.log(`\n🔗 查看原文: ${n.source_url}`);
    }
  } catch (err) {
    error(`请求失败: ${err.message}`);
    process.exit(1);
  }
}

module.exports = { execute };
