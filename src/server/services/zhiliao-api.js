/**
 * 知了标讯 API 客户端
 * 文档: https://ai.zhiliaobiaoxun.com/docs/api
 */
const config = require('../config');

const BASE_URL = config.zlbx.baseUrl;
const API_KEY = config.zlbx.apiKey;

// 限流：5次/秒
let lastCallTime = 0;
const MIN_INTERVAL_MS = 210;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function rateLimitedFetch(endpoint, body) {
  const now = Date.now();
  const elapsed = now - lastCallTime;
  if (elapsed < MIN_INTERVAL_MS) {
    await sleep(MIN_INTERVAL_MS - elapsed);
  }
  lastCallTime = Date.now();

  const url = `${BASE_URL}/${endpoint}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
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
 * @param {string[]} keywords - 关键词数组
 * @param {object} opts
 * @param {number} opts.page - 页码 (默认1)
 * @param {number} opts.pageSize - 每页数量 (默认20)
 * @param {string} opts.province - 省份筛选
 * @param {string} opts.bidType - 招标/中标
 * @returns {Promise<{total: number, items: Array}>}
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
 * @param {number} bidId
 * @returns {Promise<object>}
 */
async function getBidDetail(bidId) {
  const result = await rateLimitedFetch('bid_detail', { bid_id: bidId });
  return result.data;
}

module.exports = { searchBids, getBidDetail };
