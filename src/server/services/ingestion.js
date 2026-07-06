/**
 * 数据采集服务 v3 — 双数据源架构
 * 支持 Zhiliao (external) / Scrapling (internal) / Hybrid 模式
 * 
 * v2 逻辑完全保留，新增 Scrapling 通道
 */
const { supabaseAdmin } = require('../db');
const { searchBids, queryBidsAdvanced } = require('./zhiliao-api');
const scrapling = require('./scrapling-client');
const config = require('../config');
const { getConfig } = require('./config-reader');

// ============================================================
// 通用工具函数（v2 保留）
// ============================================================

function mapZlbxItemToNotice(item, keywordSource) {
  return {
    platform_id: 1,
    source_unique_id: String(item.bid_id),
    title: item.title || '',
    notice_type: mapBidType(item.bid_type, item.bid_process),
    city: item.city || item.province || '广东省',
    region_scope: item.province || '广东省',
    publish_date: item.pub_time || new Date().toISOString().slice(0, 10),
    end_date: item.signup_time || item.tender_time || null,
    budget_amount: item.money_wan || 0,
    source_url: item.url || '',
    notice_content: '',
    industry_type: inferIndustry(item.sm_names),
    tenderee: item.caller_name || '',
    tender_agent: item.agency_name || '',
    data_source: 'zhiliao_api',
    ai_status: 0,
    keyword_source: keywordSource || null,
  };
}

function mapBidType(bidType, bidProcess) {
  if (bidType === '中标' || bidProcess?.includes('中标')) return 'result';
  if (bidType === '变更' || bidProcess?.includes('变更')) return 'change';
  if (bidProcess?.includes('候选')) return 'candidate';
  return 'tender';
}

function inferIndustry(smNames) {
  if (!smNames || smNames.length === 0) return 'other';
  const text = smNames.join(' ');
  if (/运维|维保|IT|信息化|服务器|存储|小型机|数据库|网络/.test(text)) return 'IT信息化';
  if (/建筑|工程|施工|监理/.test(text)) return '建筑工程';
  if (/医疗|药品|器械/.test(text)) return '医疗器械';
  if (/设备|机械/.test(text)) return '设备采购';
  return 'other';
}

async function dedupAndInsert(items, keywordSource) {
  if (items.length === 0) return { inserted: 0, skipped: 0 };

  const sourceIds = items.map(item => String(item.source_unique_id));
  const platformIds = [...new Set(items.map(item => item.platform_id).filter(Boolean))];
  let query = supabaseAdmin
    .from('bidding_notice')
    .select('source_unique_id')
    .in('source_unique_id', sourceIds);
  if (platformIds.length > 0) {
    query = query.in('platform_id', platformIds);
  }
  const { data: existing } = await query;

  const existingIds = new Set((existing || []).map(r => r.source_unique_id));
  const newItems = items.filter(item => !existingIds.has(String(item.source_unique_id)));

  if (newItems.length === 0) return { inserted: 0, skipped: items.length };

  const { data: inserted, error } = await supabaseAdmin
    .from('bidding_notice')
    .insert(newItems)
    .select('id');

  if (error) {
    console.error(`[ingestion] 批量插入失败，逐条重试:`, error.message);
    let count = 0;
    for (const notice of newItems) {
      const { error: singleError } = await supabaseAdmin
        .from('bidding_notice')
        .insert(notice);
      if (!singleError) count++;
      else console.error(`[ingestion] 单条失败: ${notice.source_unique_id}`, singleError.message);
    }
    return { inserted: count, skipped: items.length - newItems.length + (newItems.length - count) };
  }

  return { inserted: (inserted || []).length, skipped: items.length - newItems.length };
}


// ============================================================
// Zhiliao 通道（v2 完全保留）
// ============================================================

async function fetchAndStore(keywords, opts = {}) {
  const pageSize = opts.pageSize || 20;
  const maxPages = opts.maxPages || 5;
  let totalFetched = 0, totalInserted = 0, totalSkipped = 0;

  for (let page = 1; page <= maxPages; page++) {
    console.log(`[ingestion:zhiliao] 搜索: ${keywords.join('+')} page=${page}`);
    const { items, total, costUnits } = await searchBids(keywords, {
      page, pageSize,
      matchModes: opts.matchModes || ['sm', 'title'],
      provinces: opts.province ? [opts.province] : ['广东'],
      bidProcess: opts.bidProcess, beginDate: opts.beginDate, endDate: opts.endDate,
    });
    console.log(`[ingestion:zhiliao] 返回 ${items.length} 条 (总计 ${total}, 消耗 ${costUnits} 积分)`);
    if (items.length === 0) break;
    totalFetched += items.length;
    const notices = items.map(item => mapZlbxItemToNotice(item, opts.keywordSource || 'legacy'));
    const { inserted, skipped } = await dedupAndInsert(notices, opts.keywordSource || 'legacy');
    totalInserted += inserted;
    totalSkipped += skipped;
    if (items.length < pageSize) break;
  }
  return { fetched: totalFetched, inserted: totalInserted, skipped: totalSkipped };
}

async function fetchAndStoreAdvanced(keywordGroup, opts = {}) {
  const pageSize = opts.pageSize || 20;
  const maxPages = opts.maxPages || 3;
  let totalFetched = 0, totalInserted = 0, totalSkipped = 0;

  for (let page = 1; page <= maxPages; page++) {
    console.log(`[ingestion:zhiliao] 高级查询: ${keywordGroup.name} page=${page}`);
    const { items, total, costUnits } = await queryBidsAdvanced({
      keywordGroups: keywordGroup.groups,
      matchModes: ['sm', 'title'],
      excludeKeywords: opts.excludeKeywords,
      provinces: opts.province ? [opts.province] : ['广东'],
      bidProcess: opts.bidProcess || [4],
      beginDate: opts.beginDate, endDate: opts.endDate,
      page, pageSize,
    });
    console.log(`[ingestion:zhiliao] 返回 ${items.length} 条 (总计 ${total}, 消耗 ${costUnits} 积分)`);
    if (items.length === 0) break;
    totalFetched += items.length;
    const notices = items.map(item => mapZlbxItemToNotice(item, keywordGroup.name));
    const { inserted, skipped } = await dedupAndInsert(notices, keywordGroup.name);
    totalInserted += inserted;
    totalSkipped += skipped;
    if (items.length < pageSize) break;
  }
  return { fetched: totalFetched, inserted: totalInserted, skipped: totalSkipped };
}


// ============================================================
// 关键词过滤（Scrapling 后处理）
// ============================================================

/**
 * 对 Scrapling 结果进行关键词+省份过滤
 * 返回与 keywordGroups 匹配的标讯，排除 excludeKeywords 命中的标讯
 */
function filterByKeywords(notices, keywordGroups, excludeKeywords, targetProvince) {
  if (!notices || notices.length === 0) return [];

  // 构建关键词模式：每组内 AND（所有词必须出现），组间 OR（任意组匹配）
  const groupPatterns = (keywordGroups || []).map(group => {
    const subGroups = (group.groups || []).filter(g => g.keywords && g.keywords.length > 0);
    if (subGroups.length === 0) return null;
    return subGroups.map(sg => {
      return sg.keywords.map(k => {
        const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(escaped, 'i');
      });
    });
  }).filter(Boolean);

  // 排除词正则
  const excludePattern = (excludeKeywords && excludeKeywords.length > 0)
    ? new RegExp(excludeKeywords.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i')
    : null;

  return notices.filter(notice => {
    const text = [notice.title, notice.tenderee, notice.tender_agent].filter(Boolean).join(' ');

    // 排除词过滤
    if (excludePattern && excludePattern.test(text)) return false;

    // 省份过滤：如果指定了目标省份，只保留匹配的
    if (targetProvince) {
      const region = (notice.city || notice.region_scope || '').toLowerCase();
      const province = targetProvince.toLowerCase();
      // 包含目标省份 或 标记为"全国"的保留
      if (!region.includes(province) && region !== '全国' && region !== '') return false;
    }

    // 关键词过滤：至少匹配一组的至少一个子组（子组内 AND，组间 OR）
    if (groupPatterns.length > 0) {
      return groupPatterns.some(subGroups =>
        subGroups.some(ands => ands.every(re => re.test(text)))
      );
    }

    // 没有关键词配置时全部保留
    return true;
  });
}


// ============================================================
// Scrapling 通道（新增）
// ============================================================

/**
 * 通过 Scrapling 爬取单个平台
 * @param {Object} platform - platform_source 行
 * @param {Object} opts - { triggerType, keywordGroup }
 * @returns {Object} { fetched, inserted, skipped, runId }
 */
async function fetchViaScrapling(platform, opts = {}) {
  const delayMs = await getConfig('datasource.scrapling.delay_ms', 2000);
  let runId;

  try {
    // 记录 crawl_run
    runId = await scrapling.startCrawlRun(
      platform.id,
      'scrapling',
      opts.triggerType || 'manual',
      opts.keywordGroup || null
    );

    const startTime = Date.now();
    console.log(`[ingestion:scrapling] 开始爬取: ${platform.platform_name} (${platform.spider_strategy})`);

    // 调用 Scrapling 引擎
    const result = await scrapling.crawlListing(platform);

    if (result.errors && result.errors.length > 0) {
      console.warn(`[ingestion:scrapling] ${platform.platform_name} 有 ${result.errors.length} 个错误`);
    }

    // 映射为 bidding_notice 格式
    let notices = result.items.map(item =>
      scrapling.mapScraplingItemToNotice(item, platform.id)
    );

    // 关键词+省份过滤
    const targetProvince = opts.province || await getConfig('fetch.province', '广东');
    const kwGroups = opts.keywordGroups || config.keywordGroups;
    const exclKw = opts.excludeKeywords || config.excludeKeywords;
    const beforeFilter = notices.length;
    notices = filterByKeywords(notices, kwGroups, exclKw, targetProvince);
    const filtered = beforeFilter - notices.length;
    if (filtered > 0) {
      console.log(`[ingestion:scrapling] ${platform.platform_name}: 关键词过滤 ${beforeFilter} -> ${notices.length} (剔除 ${filtered})`);
    }

    // 去重入库
    const { inserted, skipped } = await dedupAndInsert(notices);
    const duration = Date.now() - startTime;

    const stats = {
      status: result.errors.length > 0 ? 'partial' : 'success',
      pages_crawled: result.pages_crawled,
      items_found: result.items.length,
      items_inserted: inserted,
      items_skipped: skipped,
      items_failed: result.errors.length,
      spider_strategy: platform.spider_strategy,
      duration_ms: duration,
    };

    await scrapling.finishCrawlRun(runId, stats);

    console.log(`[ingestion:scrapling] ${platform.platform_name}: ` +
      `爬${result.pages_crawled}页 取${result.items.length}条 新增${inserted} 跳过${skipped} ${duration}ms`);

    return { fetched: result.items.length, inserted, skipped, runId };
  } catch (err) {
    console.error(`[ingestion:scrapling] ${platform.platform_name} 失败: ${err.message}`);
    if (runId) {
      await scrapling.finishCrawlRun(runId, {
        status: 'failed',
        error_message: err.message,
      });
    }
    throw err;
  }
}

/**
 * 批量爬取所有活跃的 Scrapling 平台
 * @param {Object} opts - { triggerType, platformType, regionScope }
 */
async function fetchAllScrapling(opts = {}) {
  const concurrency = await getConfig('datasource.scrapling.concurrency', 5);
  const dailyLimit = await getConfig('datasource.scrapling.daily_limit', 500);
  const delayMs = await getConfig('datasource.scrapling.delay_ms', 2000);

  // 检查今日已爬取页数
  const today = new Date().toISOString().slice(0, 10);
  const { data: todayRuns } = await supabaseAdmin
    .from('crawl_run')
    .select('pages_crawled')
    .eq('data_source', 'scrapling')
    .gte('started_at', today);

  const todayPages = (todayRuns || []).reduce((sum, r) => sum + (r.pages_crawled || 0), 0);
  if (todayPages >= dailyLimit) {
    console.log(`[ingestion:scrapling] 今日已爬取 ${todayPages} 页，达到上限 ${dailyLimit}`);
    return { total: 0, inserted: 0, reason: 'daily_limit' };
  }

  // 加载有选择器配置的活跃平台
  const platforms = await scrapling.getActivePlatforms({
    platform_type: opts.platformType,
    region_scope: opts.regionScope,
  });

  console.log(`[ingestion:scrapling] 找到 ${platforms.length} 个可爬取平台`);

  let totalInserted = 0;
  let totalFetched = 0;

  for (const platform of platforms) {
    try {
      const result = await fetchViaScrapling(platform, {
        triggerType: opts.triggerType || 'scheduled',
      });
      totalInserted += result.inserted;
      totalFetched += result.fetched;

      // 平台间限速
      await new Promise(r => setTimeout(r, delayMs));
    } catch (err) {
      console.error(`[ingestion:scrapling] ${platform.platform_name} 跳过: ${err.message}`);
    }
  }

  return { total: totalFetched, inserted: totalInserted };
}


// ============================================================
// 数据源路由（核心）
// ============================================================

/**
 * 获取当前数据源模式
 */
async function getDataSourceMode() {
  return await getConfig('datasource.mode', 'external');
}

/**
 * 统一采集入口 v3 — 根据 datasource.mode 自动路由
 * 完全向后兼容：默认 mode=external 行为与 v2 完全一致
 */
async function runFullIngestion() {
  const mode = await getDataSourceMode();
  console.log(`=== 开始全量采集 (v3, mode=${mode}) ===`);
  const startTime = Date.now();
  let totalInserted = 0;

  // --- External (Zhiliao) 通道 ---
  const zhiliaoEnabled = await getConfig('datasource.zhiliao.enabled', true);

  if ((mode === 'external' || mode === 'hybrid') && zhiliaoEnabled) {
    console.log('\n--- Zhiliao 通道 ---');
    try {
      let groups = await getConfig('fetch.keyword_groups', null);
      if (!groups || !Array.isArray(groups)) {
        groups = config.keywordGroups;
      }
      const province = await getConfig('fetch.province', config.targetProvince);
      const excludeKeywords = await getConfig('fetch.exclude_keywords', config.excludeKeywords);
      const beginDate = await getConfig('fetch.begin_date', null);
      const endDate = await getConfig('fetch.end_date', null);
      const tunedMaxPages = await getConfig('fetch.tuned_max_pages', {});

      for (const group of groups) {
        try {
          const result = await fetchAndStoreAdvanced(group, {
            province, excludeKeywords, beginDate, endDate,
            pageSize: 20,
            maxPages: tunedMaxPages[group.name] || 3,
            bidProcess: [4],
          });
          console.log(`[ingestion:zhiliao] [${group.name}] 取${result.fetched} 新增${result.inserted} 跳过${result.skipped}`);
          totalInserted += result.inserted;
        } catch (err) {
          console.error(`[ingestion:zhiliao] [${group.name}] 失败:`, err.message);
          if (mode === 'external') continue;  // external 模式继续下一组
          // hybrid 模式：该组 Zhiliao 失败，尝试 Scrapling 补充
        }
      }
    } catch (err) {
      console.error(`[ingestion:zhiliao] 通道异常:`, err.message);
      if (mode === 'external') {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`=== 采集完成(Zhiliao异常): 新增 ${totalInserted} 条, 耗时 ${elapsed}s ===`);
        return totalInserted;
      }
    }
  }

  // --- Internal (Scrapling) 通道 ---
  const scraplingEnabled = await getConfig('datasource.scrapling.enabled', false);

  if ((mode === 'internal' || mode === 'hybrid') && scraplingEnabled) {
    console.log('\n--- Scrapling 通道 ---');
    try {
      const result = await fetchAllScrapling({ triggerType: 'scheduled' });
      totalInserted += result.inserted;
      console.log(`[ingestion:scrapling] 总计: 取${result.total} 新增${result.inserted}`);
    } catch (err) {
      console.error(`[ingestion:scrapling] 通道异常:`, err.message);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`=== 采集完成 (mode=${mode}): 新增 ${totalInserted} 条, 耗时 ${elapsed}s ===`);
  return totalInserted;
}


module.exports = {
  // v2 exports (保留)
  fetchAndStore,
  fetchAndStoreAdvanced,
  dedupAndInsert,
  mapZlbxItemToNotice,
  runFullIngestion,
  // v3 new exports
  fetchViaScrapling,
  fetchAllScrapling,
  getDataSourceMode,
};
