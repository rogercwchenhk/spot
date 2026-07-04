/**
 * 知了标讯数据入库服务 v2
 * 使用 query_bids_advanced 高级查询，支持 keyword_groups + match_modes + exclude_keywords
 * 关键词自进化：入库时记录 keyword_source，用于效果统计
 */
const { supabaseAdmin } = require('../db');
const { searchBids, queryBidsAdvanced } = require('./zhiliao-api');
const config = require('../config');
const { getConfig } = require('./config-reader');

/**
 * 将知了 API 的标讯映射为 bidding_notice 行
 * @param {Object} item - API 返回的标讯
 * @param {string} keywordSource - 命中的关键词分组名称
 */
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

/**
 * 批量去重插入
 * @param {Array} items - API 返回的标讯列表
 * @param {string} keywordSource - 关键词分组名称
 */
async function dedupAndInsert(items, keywordSource) {
  if (items.length === 0) return { inserted: 0, skipped: 0 };

  const sourceIds = items.map(item => String(item.bid_id));
  const { data: existing } = await supabaseAdmin
    .from('bidding_notice')
    .select('source_unique_id')
    .in('source_unique_id', sourceIds)
    .eq('platform_id', 1);

  const existingIds = new Set((existing || []).map(r => r.source_unique_id));
  const newItems = items.filter(item => !existingIds.has(String(item.bid_id)));

  if (newItems.length === 0) return { inserted: 0, skipped: items.length };

  const notices = newItems.map(item => mapZlbxItemToNotice(item, keywordSource));
  const { data: inserted, error } = await supabaseAdmin
    .from('bidding_notice')
    .insert(notices)
    .select('id');

  if (error) {
    console.error(`[ingestion] 批量插入失败，逐条重试:`, error.message);
    let count = 0;
    for (const notice of notices) {
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

/**
 * 基础搜索入库（兼容旧模式，1积分/次）
 */
async function fetchAndStore(keywords, opts = {}) {
  const pageSize = opts.pageSize || 20;
  const maxPages = opts.maxPages || 5;
  let totalFetched = 0;
  let totalInserted = 0;
  let totalSkipped = 0;

  for (let page = 1; page <= maxPages; page++) {
    console.log(`[ingestion] 搜索: ${keywords.join('+')} page=${page}`);

    const { items, total, costUnits } = await searchBids(keywords, {
      page,
      pageSize,
      matchModes: opts.matchModes || ['sm', 'title'],
      provinces: opts.province ? [opts.province] : ['广东'],
      bidProcess: opts.bidProcess,
      beginDate: opts.beginDate,
      endDate: opts.endDate,
    });

    console.log(`[ingestion] 返回 ${items.length} 条 (总计 ${total}, 消耗 ${costUnits} 积分)`);
    if (items.length === 0) break;
    totalFetched += items.length;

    const { inserted, skipped } = await dedupAndInsert(items, opts.keywordSource || 'legacy');
    totalInserted += inserted;
    totalSkipped += skipped;
    console.log(`[ingestion] 本页新增 ${inserted} 条, 跳过 ${skipped} 条`);

    if (items.length < pageSize) break;
  }

  return { fetched: totalFetched, inserted: totalInserted, skipped: totalSkipped };
}

/**
 * 高级查询入库（2积分/次，支持 keyword_groups）
 * @param {Object} keywordGroup - { name: string, groups: [{keywords, match_modes}] }
 * @param {Object} opts - 附加选项
 */
async function fetchAndStoreAdvanced(keywordGroup, opts = {}) {
  const pageSize = opts.pageSize || 20;
  const maxPages = opts.maxPages || 3;
  let totalFetched = 0;
  let totalInserted = 0;
  let totalSkipped = 0;

  for (let page = 1; page <= maxPages; page++) {
    console.log(`[ingestion] 高级查询: ${keywordGroup.name} page=${page}`);

    const { items, total, costUnits } = await queryBidsAdvanced({
      keywordGroups: keywordGroup.groups,
      matchModes: ['sm', 'title'],
      excludeKeywords: opts.excludeKeywords,
      provinces: opts.province ? [opts.province] : ['广东'],
      bidProcess: opts.bidProcess || [4],
      beginDate: opts.beginDate,
      endDate: opts.endDate,
      page,
      pageSize,
    });

    console.log(`[ingestion] 返回 ${items.length} 条 (总计 ${total}, 消耗 ${costUnits} 积分)`);
    if (items.length === 0) break;
    totalFetched += items.length;

    const { inserted, skipped } = await dedupAndInsert(items, keywordGroup.name);
    totalInserted += inserted;
    totalSkipped += skipped;
    console.log(`[ingestion] 本页新增 ${inserted} 条, 跳过 ${skipped} 条`);

    if (items.length < pageSize) break;
  }

  return { fetched: totalFetched, inserted: totalInserted, skipped: totalSkipped };
}

/**
 * 完整采集流程 v2：使用高级查询 + keyword_groups
 */
async function runFullIngestion() {
  console.log('=== 开始全量采集 (v2 高级查询模式) ===');
  const startTime = Date.now();
  let totalInserted = 0;

  let groups = await getConfig('fetch.keyword_groups', null);
  if (!groups || !Array.isArray(groups)) {
    groups = config.keywordGroups;
  }
  const province = await getConfig('fetch.province', config.targetProvince);
  const excludeKeywords = await getConfig('fetch.exclude_keywords', config.excludeKeywords);
  const beginDate = await getConfig('fetch.begin_date', null);
  const endDate = await getConfig('fetch.end_date', null);

  for (const group of groups) {
    try {
      const result = await fetchAndStoreAdvanced(group, {
        province,
        excludeKeywords,
        beginDate,
        endDate,
        pageSize: 20,
        maxPages: 3,
        bidProcess: [4],
      });
      console.log(`[ingestion] [${group.name}] 取${result.fetched} 新增${result.inserted} 跳过${result.skipped}`);
      totalInserted += result.inserted;
    } catch (err) {
      console.error(`[ingestion] [${group.name}] 失败:`, err.message);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`=== 采集完成: 新增 ${totalInserted} 条, 耗时 ${elapsed}s ===`);
  return totalInserted;
}

module.exports = { fetchAndStore, fetchAndStoreAdvanced, runFullIngestion, dedupAndInsert, mapZlbxItemToNotice };
