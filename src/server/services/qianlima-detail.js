/**
 * 千里马详情页爬虫 — Node.js ↔ Python 桥接
 * 使用 StealthyFetcher (Playwright) 渲染Vue SPA
 */
const { execFile } = require('child_process');
const path = require('path');
const { supabaseAdmin } = require('../db');

const DETAIL_ENGINE = path.join(__dirname, '../../../scripts/qianlima-detail.py');
const PYTHON = process.env.SCRAPLING_PYTHON || 'python3.13';

/**
 * 爬取单个详情页
 * @param {string} url - 详情页URL
 * @returns {Object} {title, content, publish_date, budget_amount, end_date, tenderee, attachment_urls}
 */
async function crawlDetail(url) {
  return new Promise((resolve, reject) => {
    const child = execFile(PYTHON, [DETAIL_ENGINE, '--urls', url], {
      timeout: 180000,  // 3分钟超时
      maxBuffer: 10 * 1024 * 1024,
      encoding: 'utf-8',
    }, (error, stdout, stderr) => {
      if (error) {
        console.error(`[qianlima-detail] Engine error: ${error.message}`);
        return reject(new Error(`Detail crawl failed: ${error.message}`));
      }

      try {
        const results = JSON.parse(stdout);
        if (stderr) console.log(`[qianlima-detail] Log:\n${stderr}`);
        resolve(results[0] || { url, status: 'error', error: 'No result' });
      } catch (parseErr) {
        reject(new Error(`Invalid JSON from detail engine: ${parseErr.message}`));
      }
    });
  });
}

/**
 * 批量爬取详情页
 * @param {Array<string>} urls - URL列表
 * @param {number} delay - 请求间隔秒数
 * @returns {Array<Object>} 结果列表
 */
async function crawlDetailBatch(urls, delay = 30) {
  return new Promise((resolve, reject) => {
    const args = ['--delay', String(delay), '--urls', ...urls];

    const child = execFile(PYTHON, [DETAIL_ENGINE, ...args], {
      timeout: urls.length * (delay + 60) * 1000,  // 每个URL最多 delay+60 秒
      maxBuffer: 50 * 1024 * 1024,
      encoding: 'utf-8',
    }, (error, stdout, stderr) => {
      if (error) {
        console.error(`[qianlima-detail] Batch error: ${error.message}`);
        return reject(new Error(`Batch crawl failed: ${error.message}`));
      }

      try {
        const results = JSON.parse(stdout);
        if (stderr) console.log(`[qianlima-detail] Batch log:\n${stderr.slice(0, 500)}`);
        resolve(results);
      } catch (parseErr) {
        reject(new Error(`Invalid JSON from batch engine: ${parseErr.message}`));
      }
    });
  });
}

/**
 * 从数据库获取需要爬取详情的千里马标讯
 * @param {number} limit - 最大条数
 * @returns {Array<Object>} 标讯列表
 */
async function getQianlimaNoticesNeedingDetail(limit = 10) {
  const { data, error } = await supabaseAdmin
    .from('bidding_notice')
    .select('id, source_url, title')
    .eq('data_source', 'scrapling')
    .like('source_url', '%qianlima.com%')
    .eq('ai_status', 0)  // 未处理的
    .not('source_url', 'is', null)
    .limit(limit);

  if (error) throw new Error(`Failed to load notices: ${error.message}`);
  return data || [];
}

/**
 * 更新标讯的详情信息
 * @param {number} noticeId - 标讯ID
 * @param {Object} detail - 详情数据
 */
async function updateNoticeDetail(noticeId, detail) {
  const update = {};
  if (detail.content) update.notice_content = detail.content;
  if (detail.budget_amount) update.budget_amount = detail.budget_amount;
  if (detail.end_date) update.end_date = detail.end_date;
  if (detail.tenderee) update.tenderee = detail.tenderee;

  if (Object.keys(update).length === 0) return;

  const { error } = await supabaseAdmin
    .from('bidding_notice')
    .update(update)
    .eq('id', noticeId);

  if (error) console.error(`[qianlima-detail] Failed to update notice ${noticeId}: ${error.message}`);
}

module.exports = {
  crawlDetail,
  crawlDetailBatch,
  getQianlimaNoticesNeedingDetail,
  updateNoticeDetail,
};
