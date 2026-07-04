/**
 * 知了标讯 API 客户端
 * 文档: https://ai.zhiliaobiaoxun.com/docs/api
 * 配置优先从 DB 读取，回退到 .env
 */
const config = require('../config');
const { getConfig } = require('./config-reader');

const DEFAULT_BASE_URL = config.zlbx.baseUrl;
const DEFAULT_API_KEY = config.zlbx.apiKey;

// 限流：5次/秒
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
 * 搜索招中标
 */
async function searchBids(keywords, opts = {}) {
  const body = {
    keywords,
    page: opts.page || 1,
    page_size: opts.pageSize || 20,
  };

  if (opts.province) body.province = opts.province;
  if (opts.bidType) body.bid_type = opts.bidType;

  const result = await rateLimitedFetch('search_bids', body);
  return {
    total: result.data?.total || 0,
    items: result.data?.items || [],
    costUnits: result.meta?.cost_units || 0,
  };
}

/**
 * 获取标讯详情
 */
async function getBidDetail(bidId) {
  const result = await rateLimitedFetch('bid_detail', { bid_id: bidId });
  return result.data;
}

module.exports = { searchBids, getBidDetail };
