/**
 * Scrapling 爬虫客户端 — Node.js ↔ Python 桥接
 * 通过 child_process 调用 scrapling_engine.py，解析 JSON 输出
 */
const { execFile } = require('child_process');
const path = require('path');
const { supabaseAdmin } = require('../db');
const { getConfig } = require('./config-reader');

const ENGINE_PATH = path.join(__dirname, '../../../scripts/scrapling_engine.py');
const PYTHON = process.env.SCRAPLING_PYTHON || 'python3.13';

/**
 * 调用 Scrapling 引擎爬取列表页
 * @param {Object} platform - platform_source 行
 * @returns {Object} {items: [...], pages_crawled, errors}
 */
async function crawlListing(platform) {
  const timeout = await getConfig('datasource.scrapling.timeout_ms', 30000);

  const payload = JSON.stringify({ platform });

  return new Promise((resolve, reject) => {
    const child = execFile(PYTHON, [ENGINE_PATH, '--stdin'], {
      timeout: timeout + 10000,  // 引擎超时 + 10s buffer
      maxBuffer: 10 * 1024 * 1024,  // 10MB
      encoding: 'utf-8',
    }, (error, stdout, stderr) => {
      if (error) {
        console.error(`[scrapling-client] Engine error: ${error.message}`);
        if (stderr) console.error(`[scrapling-client] stderr: ${stderr.slice(0, 500)}`);
        return reject(new Error(`Scrapling engine failed: ${error.message}`));
      }

      try {
        const result = JSON.parse(stdout);
        if (stderr) console.log(`[scrapling-client] Engine log:\n${stderr}`);
        resolve(result);
      } catch (parseErr) {
        console.error(`[scrapling-client] JSON parse error. stdout: ${stdout.slice(0, 200)}`);
        reject(new Error(`Invalid JSON from Scrapling engine: ${parseErr.message}`));
      }
    });

    child.stdin.write(payload);
    child.stdin.end();
  });
}

/**
 * 调用 Scrapling 引擎爬取详情页
 * @param {string} url - 详情页 URL
 * @param {Object} selectors - detail_selectors
 * @param {string} strategy - spider_strategy
 * @returns {Object} {title, content, publish_date, budget_amount, attachment_urls}
 */
async function crawlDetail(url, selectors, strategy = 'requests_plain') {
  const timeout = await getConfig('datasource.scrapling.timeout_ms', 30000);

  const payload = JSON.stringify({ url, selectors, strategy });

  return new Promise((resolve, reject) => {
    const child = execFile(PYTHON, [ENGINE_PATH, '--stdin', '--detail'], {
      timeout: timeout + 10000,
      maxBuffer: 10 * 1024 * 1024,
      encoding: 'utf-8',
    }, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(`Scrapling detail failed: ${error.message}`));
      }
      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (parseErr) {
        reject(new Error(`Invalid JSON from detail engine: ${parseErr.message}`));
      }
    });

    child.stdin.write(payload);
    child.stdin.end();
  });
}

/**
 * 将 Scrapling 提取的 item 映射为 bidding_notice 行
 * (对齐 mapZlbxItemToNotice 的输出格式)
 */
function mapScraplingItemToNotice(item, platformId) {
  return {
    platform_id: platformId,
    source_unique_id: item.source_unique_id,
    title: item.title || '',
    notice_type: item.notice_type || 'tender',
    city: item.city || '广东省',
    region_scope: item.region_scope || '广东省',
    publish_date: item.publish_date || new Date().toISOString().slice(0, 10),
    end_date: item.end_date || null,
    budget_amount: item.budget_amount || 0,
    source_url: item.source_url || '',
    notice_content: item.content || '',
    data_source: 'scrapling',
    ai_status: 0,
  };
}

/**
 * 记录 crawl_run 开始
 */
async function startCrawlRun(platformId, dataSource, triggerType = 'manual', keywordGroup = null) {
  const { data, error } = await supabaseAdmin
    .from('crawl_run')
    .insert({
      platform_id: platformId,
      data_source: dataSource,
      status: 'running',
      trigger_type: triggerType,
      keyword_group: keywordGroup,
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create crawl_run: ${error.message}`);
  return data.id;
}

/**
 * 更新 crawl_run 结束状态
 */
async function finishCrawlRun(runId, stats) {
  const { error } = await supabaseAdmin
    .from('crawl_run')
    .update({
      status: stats.status || 'success',
      pages_crawled: stats.pages_crawled || 0,
      items_found: stats.items_found || 0,
      items_inserted: stats.items_inserted || 0,
      items_skipped: stats.items_skipped || 0,
      items_failed: stats.items_failed || 0,
      spider_strategy: stats.spider_strategy || null,
      error_message: stats.error_message || null,
      duration_ms: stats.duration_ms || 0,
      finished_at: new Date().toISOString(),
    })
    .eq('id', runId);

  if (error) console.error(`[scrapling-client] Failed to update crawl_run: ${error.message}`);
}

/**
 * 获取所有活跃平台（可选：按类型过滤）
 */
async function getActivePlatforms(filters = {}) {
  let query = supabaseAdmin
    .from('platform_source')
    .select('*')
    .eq('is_active', true)
    .not('extraction_selectors', 'is', null);  // 只选有选择器配置的平台

  if (filters.platform_type) {
    query = query.eq('platform_type', filters.platform_type);
  }
  if (filters.region_scope) {
    query = query.eq('region_scope', filters.region_scope);
  }
  if (filters.spider_strategy) {
    query = query.eq('spider_strategy', filters.spider_strategy);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load platforms: ${error.message}`);
  return data || [];
}

module.exports = {
  crawlListing,
  crawlDetail,
  mapScraplingItemToNotice,
  startCrawlRun,
  finishCrawlRun,
  getActivePlatforms,
};
