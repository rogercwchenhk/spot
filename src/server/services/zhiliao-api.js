/**
 * 知了标讯 API 客户端
 * 文档: https://ai.zhiliaobiaoxun.com/docs/api
 * 配置优先从 DB 读取，回退到 .env
 */
const config = require('../config');
const { getConfig } = require('./config-reader');

const DEFAULT_BASE_URL = config.zlbx.baseUrl;
const DEFAULT_API_KEY = config.zlbx.apiKey;

// 限流：5次/秒，2000次/分钟
let lastCallTime = 0;
const MIN_INTERVAL_MS = 210;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function rateLimitedFetch(endpoint, body) {
  const baseUrl = await getConfig('datasource.zlbx.base_url', DEFAULT_BASE_URL);
  const apiKey = await getConfig('datasource.zlbx.api_key', DEFAULT_API_KEY);

  const now = Date.now();
  const elapsed = now - lastCallTime;
  if (elapsed < MIN_INTERVAL_MS) {
    await sleep(MIN_INTERVAL_MS - elapsed);
  }
  lastCallTime = Date.now();

  const url = `${baseUrl}/${endpoint}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    throw new Error(`ZLBX API error: ${resp.status} ${resp.statusText}`);
  }

  const data = await resp.json();

  if (!data.success) {
    throw new Error(`ZLBX API failure: ${data.error?.code} - ${data.error?.message}`);
  }

  return data;
}

/**
 * 搜索招中标（基础接口，1积分/次）
 */
async function searchBids(keywords, opts = {}) {
  const body = {
    keywords,
    page: opts.page || 1,
    page_size: opts.pageSize || 20,
  };

  if (opts.matchModes) body.match_modes = opts.matchModes;
  if (opts.provinces) body.provinces = Array.isArray(opts.provinces) ? opts.provinces : [opts.provinces];
  if (opts.cities) body.cities = Array.isArray(opts.cities) ? opts.cities : [opts.cities];
  if (opts.bidType) body.bid_type = opts.bidType;
  if (opts.bidProcess) body.bid_process = opts.bidProcess;
  if (opts.beginDate) body.begin_date = opts.beginDate;
  if (opts.endDate) body.end_date = opts.endDate;
  if (opts.minAmount) body.min_amount = opts.minAmount;
  if (opts.maxAmount) body.max_amount = opts.maxAmount;

  const result = await rateLimitedFetch('search_bids', body);
  return {
    total: result.data?.total || 0,
    items: result.data?.items || [],
    costUnits: result.meta?.cost_units || 0,
  };
}

/**
 * 标讯高级查询（2积分/次）
 * 支持 keyword_groups（组内AND/组间OR）、exclude_keywords、match_modes 等高级功能
 */
async function queryBidsAdvanced(opts = {}) {
  const body = {
    page: opts.page || 1,
    page_size: opts.pageSize || 20,
  };

  // keyword_groups: [{keywords: ['运维','小型机'], match_modes: ['sm','title']}, ...]
  if (opts.keywordGroups) body.keyword_groups = opts.keywordGroups;
  // 简单关键词 + 匹配模式
  if (opts.keywords) body.keywords = opts.keywords;
  if (opts.matchModes) body.match_modes = opts.matchModes;
  // 排除关键词
  if (opts.excludeKeywords) body.exclude_keywords = opts.excludeKeywords;
  // 地区筛选
  if (opts.provinces) body.provinces = Array.isArray(opts.provinces) ? opts.provinces : [opts.provinces];
  if (opts.cities) body.cities = Array.isArray(opts.cities) ? opts.cities : [opts.cities];
  // 公告类型筛选
  if (opts.bidType) body.bid_type = opts.bidType;
  if (opts.bidProcess) body.bid_process = opts.bidProcess;
  // 时间范围
  if (opts.beginDate) body.begin_date = opts.beginDate;
  if (opts.endDate) body.end_date = opts.endDate;
  // 金额范围（单位：元）
  if (opts.minMoney) body.min_money = opts.minMoney;
  if (opts.maxMoney) body.max_money = opts.maxMoney;
  // 排序
  if (opts.sortField) body.sort_field = opts.sortField;
  if (opts.sortOrder) body.sort_order = opts.sortOrder;

  const result = await rateLimitedFetch('query_bids_advanced', body);
  return {
    total: result.data?.total || 0,
    items: result.data?.items || [],
    costUnits: result.meta?.cost_units || 0,
  };
}

/**
 * 获取标讯详情
 */
async function getBidDetail(bidId, opts = {}) {
  const body = {};
  if (opts.bid_url) body.bid_url = opts.bid_url;
  else if (opts.uniq_key) body.uniq_key = opts.uniq_key;
  else body.bid_id = Number(bidId);

  const result = await rateLimitedFetch('get_bid_detail', body);
  return result.data;
}

module.exports = { searchBids, queryBidsAdvanced, getBidDetail };
