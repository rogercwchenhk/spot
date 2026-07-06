/**
 * 定时调度服务
 * 采集与推送分离，支持多时段采集，cron 表达式从数据库读取
 */
const cron = require('node-cron');
const { downloadBatch } = require('./doc-downloader');
const { runFullIngestion } = require('./ingestion');
const { processPendingNotices } = require('./ai-pipeline');
const { calculatePendingMatches } = require('./match-engine');
const { pushDailyReport, pushKeywordReport } = require('./wecom-notify');
const { getConfig } = require('./config-reader');
const { notifyCrawlDone, notifyNewStrongMatches } = require('./notification');

const DEFAULT_CRON_PUSH = '0 9,14 * * *';
const DEFAULT_FETCH_SCHEDULES = ['0 8 * * *', '0 12 * * *', '0 18 * * *', '0 23 * * *'];

/**
 * 采集 + 下载招标文件 + AI + 匹配（不推送）
 */
async function runFullPipeline() {
  console.log('=== 开始采集处理流程 ===');
  const startTime = Date.now();

  try {
    console.log('\n[1/4] 采集标讯...');
    const ingestionResult = await runFullIngestion();
    console.log(`[1/4] 采集完成: 新增 ${ingestionResult} 条`);
    await notifyCrawlDone(ingestionResult);

    console.log('\n[2/4] 下载招标文件...');
    const downloadResult = await downloadBatch(20);
    console.log(`[2/4] 下载完成: 成功${downloadResult.success} 失败${downloadResult.failed} 跳过${downloadResult.skipped}`);

    console.log('\n[3/4] AI Pipeline 处理...');
    const aiResult = await processPendingNotices(20);
    console.log(`[3/4] AI 处理完成: ${aiResult.processed} 成功, ${aiResult.failed} 失败`);

    console.log('\n[4/4] 匹配引擎计算...');
    const matchResult = await calculatePendingMatches(50);
    console.log(`[4/4] 匹配完成: ${matchResult.calculated} 成功, ${matchResult.failed} 失败`);

    // 发送强推通知
    if (matchResult.calculated > 0) {
      const strongCount = await notifyNewStrongMatches(matchResult.matchedIds || []);
      if (strongCount > 0) console.log(`[通知] 新增 ${strongCount} 条强推通知`);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n=== 采集处理完成, 耗时 ${elapsed}s ===`);

    return { ingestion: ingestionResult, download: downloadResult, ai: aiResult, match: matchResult };
  } catch (err) {
    console.error('=== 采集处理失败 ===', err.message);
    throw err;
  }
}

async function startScheduler() {
  // 推送任务
  const cronPush = await getConfig('push.schedule', DEFAULT_CRON_PUSH);
  console.log(`[scheduler] 推送任务: ${cronPush}`);
  cron.schedule(cronPush, async () => {
    console.log(`\n[scheduler] 开始推送日报 ${new Date().toISOString()}`);
    try {
      await pushDailyReport();
    } catch (err) {
      console.error('[scheduler] 推送失败:', err.message);
    }
  });

  // 关键词效果报告（每周一 10:00 推送）
  const keywordReportCron = await getConfig('push.keyword_report_cron', '0 10 * * 1');
  console.log(`[scheduler] 关键词报告: ${keywordReportCron}`);
  if (cron.validate(keywordReportCron)) {
    cron.schedule(keywordReportCron, async () => {
      console.log(`
[scheduler] 开始推送关键词效果报告 ${new Date().toISOString()}`);
      try {
        const { pushKeywordReport } = require('./wecom-notify');
        await pushKeywordReport(true);
      } catch (err) {
        console.error('[scheduler] 关键词报告推送失败:', err.message);
      }
    });
  }

  // 采集任务：支持多时段
  let schedules = await getConfig('fetch.schedules', null);
  // 兼容旧的单 cron 配置
  if (!schedules) {
    const single = await getConfig('fetch.schedule', null);
    schedules = single ? [single] : DEFAULT_FETCH_SCHEDULES;
  }
  if (!Array.isArray(schedules)) schedules = [schedules];

  console.log(`[scheduler] 采集任务: ${schedules.join(', ')}`);
  for (const expr of schedules) {
    if (!cron.validate(expr)) {
      console.warn(`[scheduler] 无效的 cron 表达式: ${expr}，跳过`);
      continue;
    }
    cron.schedule(expr, async () => {
      console.log(`\n[scheduler] 开始采集 ${new Date().toISOString()} (${expr})`);
      try {
        await runFullPipeline();
      } catch (err) {
        console.error('[scheduler] 采集失败:', err.message);
      }
    });
  }
}

module.exports = { startScheduler, runFullPipeline };
