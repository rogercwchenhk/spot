/**
 * 定时调度服务
 * 串联：采集 → AI Pipeline → 匹配引擎 → 企微推送
 */
const cron = require('node-cron');
const { runFullIngestion } = require('./ingestion');
const { processPendingNotices } = require('./ai-pipeline');
const { calculatePendingMatches } = require('./match-engine');
const { pushNewMatches } = require('./wecom-notify');

const CRON_SCHEDULE = '0 */2 * * *'; // 每2小时

/**
 * 完整处理流程
 */
async function runFullPipeline() {
  console.log('=== 开始完整处理流程 ===');
  const startTime = Date.now();

  try {
    // 1. 采集标讯
    console.log('\n[1/4] 采集标讯...');
    const ingestionResult = await runFullIngestion();
    console.log(`[1/4] 采集完成: 新增 ${ingestionResult} 条`);

    // 2. AI Pipeline 处理
    console.log('\n[2/4] AI Pipeline 处理...');
    const aiResult = await processPendingNotices(20);
    console.log(`[2/4] AI 处理完成: ${aiResult.processed} 成功, ${aiResult.failed} 失败`);

    // 3. 匹配引擎计算
    console.log('\n[3/4] 匹配引擎计算...');
    const matchResult = await calculatePendingMatches(50);
    console.log(`[3/4] 匹配完成: ${matchResult.calculated} 成功, ${matchResult.failed} 失败`);

    // 4. 企微推送
    console.log('\n[4/4] 企微推送...');
    const pushResult = await pushNewMatches(20);
    console.log(`[4/4] 推送完成: ${pushResult.pushed} 推送, ${pushResult.skipped} 跳过`);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n=== 完整流程完成, 耗时 ${elapsed}s ===`);

    return {
      ingestion: ingestionResult,
      ai: aiResult,
      match: matchResult,
      push: pushResult,
    };
  } catch (err) {
    console.error('=== 流程执行失败 ===', err.message);
    throw err;
  }
}

function startScheduler() {
  console.log(`[scheduler] 定时任务已启动: ${CRON_SCHEDULE}`);

  cron.schedule(CRON_SCHEDULE, async () => {
    console.log(`\n[scheduler] 开始定时处理 ${new Date().toISOString()}`);
    try {
      await runFullPipeline();
    } catch (err) {
      console.error('[scheduler] 处理失败:', err.message);
    }
  });
}

module.exports = { startScheduler, runFullPipeline };
