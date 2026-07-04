/**
 * 测试新关键词策略 v2 (第二轮)
 * 验证修正后的 keyword_groups 效果
 * 
 * 用法: node scripts/test-keyword-strategy.js
 * 预计消耗: ~12 积分
 */
require('dotenv').config();
const { queryBidsAdvanced } = require('../src/server/services/zhiliao-api');
const config = require('../src/server/config');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function testGroup(name, groups, opts = {}) {
  console.log(`\n--- ${name} ---`);
  try {
    const result = await queryBidsAdvanced({
      keywordGroups: groups,
      excludeKeywords: opts.excludeKeywords,
      provinces: ['广东'],
      bidProcess: [4],
      beginDate: opts.beginDate,
      page: 1,
      pageSize: 10,
    });
    console.log(`  命中: ${result.total} 条 | 返回: ${result.items.length} 条 | 积分: ${result.costUnits}`);
    result.items.slice(0, 5).forEach((item, i) => {
      const budget = item.money_wan ? `${item.money_wan}万` : '未公开';
      console.log(`  ${i + 1}. [${item.province}${item.city}] ${item.title.substring(0, 50)}`);
      console.log(`     采购方: ${item.caller_name} | 预算: ${budget}`);
    });
    return result;
  } catch (err) {
    console.error(`  失败: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log('=== 关键词策略 v2 测试 (修正版) ===\n');

  const d = new Date();
  d.setDate(d.getDate() - 30);
  const beginDate = d.toISOString().slice(0, 10);
  console.log(`时间范围: ${beginDate} 至今, 地区: 广东\n`);

  const excludeKeywords = config.excludeKeywords;
  let totalCost = 0;

  // 测试所有分组
  for (const group of config.keywordGroups) {
    const r = await testGroup(group.name, group.groups, { excludeKeywords, beginDate });
    if (r) totalCost += r.costUnits;
    await sleep(500);
  }

  console.log(`\n=== 总消耗: ${totalCost} 积分 ===`);
  console.log(`=== 如果全量采集（每组3页），预计消耗: ${config.keywordGroups.length * 3 * 2} 积分 ===`);
}

main().catch(err => {
  console.error('测试失败:', err);
  process.exit(1);
});
