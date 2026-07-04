/**
 * 定时调度服务
 * 采集与推送分离，cron 表达式从数据库读取
 */
const cron = require('node-cron');
const { runFullIngestion } = require('./ingestion');
const { processPendingNotices } = require('./ai-pipeline');
const { calculatePendingMatches } = require('./match-engine');
const { pushDailyReport } = require('./wecom-notify');
const { getConfig } = require('./config-reader');

const DEFAULT_CRON_FETCH = '0 12,23 * * *';
const DEFAULT_CRON_PUSH  = '0 9,14 * * *';

/**
 * 采集 + AI + 匹配（不推送）
 */
async function runFullPipeline() {
  console.log('=== 开始采集处理流程 ===');
  const startTime = Date.now();

  try {
    console.log('\n[1/3] 采集标讯...');
    const ingestionResult = await runFullIngestion();
    console.log(`[1/3] 采集完成: 新增 ${ingestionResult} 条`);

    console.log('\n[2/3] AI Pipeline 处理...');
    const aiResult = await processPendingNotices(20);
    console.log(`[2/3] AI 处理完成: ${aiResult.processed} 成功, ${aiResult.failed} 失败`);

    console.log('\n[3/3] 匹配引擎计算...');
    const matchResult = await calculatePendingMatches(50);
    console.log(`[3/3] 匹配完成: ${matchResult.calculated} 成功, ${matchResult.failed} 失败`);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n=== 采集处理完成, 耗时 ${elapsed}s ===`);

    return { ingestion: ingestionResult, ai: aiResult, match: matchResult };
  } catch (err) {
    console.error('=== 采集处理失败 ===', err.message);
    throw err;
  }
}

async function startScheduler() {
  // 从数据库读取 cron 配置
  const cronFetch = await getConfig('fetch.schedule', DEFAULT_CRON_FETCH);
  const cronPush = await getConfig('push.schedule', DEFAULT_CRON_PUSH);

  console.log(`[scheduler] 采集任务: ${cronFetch}`);
  console.log(`[scheduler] 推送任务: ${cronPush}`);

  cron.schedule(cronFetch, async () => {
    console.log(`\n[scheduler] 开始采集 ${new Date().toISOString()}`);
    try {
      await runFullPipeline();
    } catch (err) {
      console.error('[scheduler] 采集失败:', err.message);
    }
  });

  cron.schedule(cronPush, async () => {
    console.log(`\n[scheduler] 开始推送日报 ${new Date().toISOString()}`);
    try {
      await pushDailyReport();
    } catch (err) {
      console.error('[scheduler] 推送失败:', err.message);
    }
  });
}

module.exports = { startScheduler, runFullPipeline };
