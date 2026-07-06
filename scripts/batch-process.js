/**
 * 批量处理脚本：AI Pipeline + 匹配引擎 + 通知
 * 直接调用服务层，无需 HTTP 认证
 * 用法: node scripts/batch-process.js
 */
require('dotenv').config();
const { processPendingNotices } = require('../src/server/services/ai-pipeline');
const { calculatePendingMatches } = require('../src/server/services/match-engine');
const { notifyCrawlDone, notifyNewStrongMatches } = require('../src/server/services/notification');

async function main() {
  console.log('=== 批量处理开始 ===\n');

  // Step 1: AI Pipeline
  console.log('[1/2] AI Pipeline 处理未处理标讯...');
  const aiResult = await processPendingNotices(500);
  console.log(`[1/2] 完成: ${aiResult.processed} 成功, ${aiResult.failed} 失败\n`);

  // Step 2: 匹配引擎
  console.log('[2/2] 匹配引擎计算...');
  const matchResult = await calculatePendingMatches(500);
  console.log(`[2/2] 完成: ${matchResult.calculated} 成功, ${matchResult.failed} 失败\n`);

  // Step 3: 强推通知
  if (matchResult.calculated > 0) {
    console.log('[通知] 检查强推标讯...');
    const strongCount = await notifyNewStrongMatches(matchResult.matchedIds || []);
    console.log(`[通知] 新增 ${strongCount} 条强推通知`);
  }

  console.log('\n=== 批量处理完成 ===');
  process.exit(0);
}

main().catch(err => {
  console.error('处理失败:', err.message);
  process.exit(1);
});
