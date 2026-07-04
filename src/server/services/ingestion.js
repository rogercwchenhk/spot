/**
 * 知了标讯数据入库服务
 * 将 API 返回的标讯数据映射并写入 bidding_notice 表
 */
const { supabaseAdmin } = require('../db');
const { searchBids } = require('./zhiliao-api');
const config = require('../config');
const { getConfig } = require('./config-reader');

/**
 * 将知了 API 的标讯映射为 bidding_notice 行
 */
function mapZlbxItemToNotice(item) {
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
 * 批量入库：搜索 → 去重 → 插入
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
      provinces: opts.province ? [opts.province] : ['广东'],
    });

    console.log(`[ingestion] 返回 ${items.length} 条 (总计 ${total}, 消耗 ${costUnits} 积分)`);

    if (items.length === 0) break;
    totalFetched += items.length;

    const sourceIds = items.map(item => String(item.bid_id));
    const { data: existing } = await supabaseAdmin
      .from('bidding_notice')
      .select('source_unique_id')
      .in('source_unique_id', sourceIds)
      .eq('platform_id', 1);

    const existingIds = new Set((existing || []).map(r => r.source_unique_id));
    const newItems = items.filter(item => !existingIds.has(String(item.bid_id)));
    totalSkipped += items.length - newItems.length;

    if (newItems.length === 0) {
      console.log(`[ingestion] 本页全部已存在，跳过`);
      if (items.length < pageSize) break;
      continue;
    }

    const notices = newItems.map(mapZlbxItemToNotice);
    const { data: inserted, error } = await supabaseAdmin
      .from('bidding_notice')
      .insert(notices)
      .select('id');

    if (error) {
      console.error(`[ingestion] 批量插入失败，逐条重试:`, error.message);
      for (const notice of notices) {
        const { error: singleError } = await supabaseAdmin
          .from('bidding_notice')
          .insert(notice);
        if (!singleError) totalInserted++;
        else console.error(`[ingestion] 单条失败: ${notice.source_unique_id}`, singleError.message);
      }
    } else {
      totalInserted += (inserted || []).length;
    }

    console.log(`[ingestion] 本页新增 ${newItems.length} 条`);
    if (items.length < pageSize) break;
  }

  return { fetched: totalFetched, inserted: totalInserted, skipped: totalSkipped };
}

/**
 * 完整采集流程：从 DB 读取关键词和省份配置
 */
async function runFullIngestion() {
  console.log('=== 开始全量采集 ===');
  const startTime = Date.now();
  let totalInserted = 0;

  // 从 DB 读取关键词，回退到 .env 静态配置
  let keywordsList = await getConfig('fetch.keywords', null);
  if (!keywordsList || !Array.isArray(keywordsList)) {
    keywordsList = config.searchKeywords;
  }
  const province = await getConfig('fetch.province', config.targetProvince);

  for (const kw of keywordsList) {
    try {
      const result = await fetchAndStore(kw, {
        province,
        pageSize: 20,
        maxPages: 3,
      });
      console.log(`[ingestion] ${kw.join('+')}: 取${result.fetched} 新增${result.inserted} 跳过${result.skipped}`);
      totalInserted += result.inserted;
    } catch (err) {
      console.error(`[ingestion] ${kw.join('+')} 失败:`, err.message);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`=== 采集完成: 新增 ${totalInserted} 条, 耗时 ${elapsed}s ===`);
  return totalInserted;
}

module.exports = { fetchAndStore, runFullIngestion, mapZlbxItemToNotice };
