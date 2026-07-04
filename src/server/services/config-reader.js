/**
 * 系统配置读取器
 * 优先从数据库读取，回退到 .env 默认值
 */
const { supabaseAdmin } = require('../db');

// 内存缓存，避免每次请求都查库
let cache = {};
let cacheTime = 0;
const CACHE_TTL = 60 * 1000; // 1 分钟

/**
 * 从数据库加载全部配置
 */
async function loadConfig() {
  const now = Date.now();
  if (now - cacheTime < CACHE_TTL && Object.keys(cache).length > 0) {
    return cache;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('system_config')
      .select('key, value');

    if (error) throw error;

    cache = {};
    for (const row of data || []) {
      cache[row.key] = row.value;
    }
    cacheTime = now;
  } catch (err) {
    console.warn('[config] Failed to load from DB, using cache:', err.message);
  }

  return cache;
}

/**
 * 获取配置值
 * @param {string} key - 配置键
 * @param {*} fallback - 默认值
 */
async function getConfig(key, fallback = null) {
  const cfg = await loadConfig();
  return cfg[key] !== undefined ? cfg[key] : fallback;
}

/**
 * 清除缓存（配置更新后调用）
 */
function clearCache() {
  cache = {};
  cacheTime = 0;
}

module.exports = { getConfig, loadConfig, clearCache };
