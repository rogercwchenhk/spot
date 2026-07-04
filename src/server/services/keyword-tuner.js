/**
 * 关键词自动调优服务
 * 基于匹配效果统计数据，动态调整采集参数
 * 
 * 调优策略：
 * 1. maxPages 动态调整：高效分组多拉，低效分组少拉
 * 2. 排除词扩展：从 no 级别标讯标题中提取高频无关词
 * 3. 新词发现：从 strong/yes 级别标题中提取潜在新关键词
 */
const { supabaseAdmin } = require('../db');
const { getConfig } = require('./config-reader');

// ============================================================
// 1. maxPages 动态调整
// ============================================================

/**
 * 计算每个分组的推荐 maxPages
 * @returns {Array<{name, current_pages, recommended_pages, reason}>}
 */
async function calculatePageAdjustments() {
  const { data: stats, error } = await supabaseAdmin
    .from('v_keyword_effectiveness')
    .select('*');

  if (error) {
    console.warn('[tuner] 统计视图不可用:', error.message);
    return [];
  }

  const adjustments = [];

  for (const s of stats || []) {
    const total = s.total_notices || 0;
    const matched = s.matched_count || 0;
    const rate = s.effective_rate;
    const name = s.keyword_source;

    // 数据不足，不做调整
    if (total < 10 || matched < 5 || rate === null) {
      adjustments.push({
        name,
        total,
        effective_rate: rate,
        recommended_pages: null,
        reason: '数据不足，保持默认',
      });
      continue;
    }

    let pages, reason;

    if (rate >= 30) {
      pages = 5;
      reason = `有效率 ${rate}% ≥ 30%，扩大采集`;
    } else if (rate >= 15) {
      pages = 3;
      reason = `有效率 ${rate}% 正常，保持默认`;
    } else if (rate >= 5) {
      pages = 1;
      reason = `有效率 ${rate}% < 10%，缩小采集`;
    } else {
      pages = 0;
      reason = `有效率 ${rate}% < 5%，暂停采集`;
    }

    adjustments.push({ name, total, effective_rate: rate, recommended_pages: pages, reason });
  }

  return adjustments;
}

/**
 * 将调优结果写入 system_config
 */
async function applyPageAdjustments(adjustments) {
  const tuned = {};
  for (const a of adjustments) {
    if (a.recommended_pages !== null) {
      tuned[a.name] = a.recommended_pages;
    }
  }

  if (Object.keys(tuned).length === 0) return { applied: 0 };

  const { error } = await supabaseAdmin
    .from('system_config')
    .upsert({
      key: 'fetch.tuned_max_pages',
      value: tuned,
      description: '关键词分组自动调优的 maxPages（由 keyword-tuner 生成）',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' });

  if (error) throw error;

  console.log('[tuner] maxPages 调优已写入:', tuned);
  return { applied: Object.keys(tuned).length, tuned };
}

// ============================================================
// 2. 排除词扩展
// ============================================================

/**
 * 从 no 级别标讯标题中提取候选排除词
 * 逻辑：no 级别标题中出现 >= 3 次的词，且不在 strong/yes 标题中出现
 */
async function suggestExcludeKeywords() {
  // 获取 no 级别标讯标题
  const { data: noNotices, error: noErr } = await supabaseAdmin
    .from('bidding_notice')
    .select('title, match_result!inner(recommend_level)')
    .eq('match_result.recommend_level', 'no')
    .limit(500);

  if (noErr) {
    console.warn('[tuner] 查询 no 级别标讯失败:', noErr.message);
    return [];
  }

  // 获取 strong/yes 级别标讯标题
  const { data: goodNotices, error: goodErr } = await supabaseAdmin
    .from('bidding_notice')
    .select('title, match_result!inner(recommend_level)')
    .in('match_result.recommend_level', ['strong', 'yes'])
    .limit(500);

  if (goodErr) {
    console.warn('[tuner] 查询 strong/yes 标讯失败:', goodErr.message);
    return [];
  }

  // 提取 good 标题中的词（白名单）
  const goodWords = new Set();
  for (const n of goodNotices || []) {
    const words = extractNouns(n.title);
    words.forEach(w => goodWords.add(w));
  }

  // 提取 no 标题中的词频
  const noWordCounts = {};
  for (const n of noNotices || []) {
    const words = extractNouns(n.title);
    for (const w of words) {
      if (!goodWords.has(w)) {
        noWordCounts[w] = (noWordCounts[w] || 0) + 1;
      }
    }
  }

  // 筛选出现 >= 3 次的候选词
  const candidates = Object.entries(noWordCounts)
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({ word, count, reason: `在 ${count} 条 no 级别标讯中出现，且不在 strong/yes 标讯中` }));

  return candidates;
}

// ============================================================
// 3. 新词发现
// ============================================================

/**
 * 从 strong/yes 级别标讯标题中发现潜在新关键词
 * 逻辑：出现 >= 3 次的词组，且不在现有关键词配置中
 */
async function suggestNewKeywords() {
  const { data: goodNotices, error } = await supabaseAdmin
    .from('bidding_notice')
    .select('title, sm_names, match_result!inner(recommend_level)')
    .in('match_result.recommend_level', ['strong', 'yes'])
    .limit(500);

  if (error) {
    console.warn('[tuner] 查询标讯失败:', error.message);
    return [];
  }

  // 提取词频
  const wordCounts = {};
  for (const n of goodNotices || []) {
    const text = [n.title, ...(n.sm_names || [])].join(' ');
    const words = extractNouns(text);
    for (const w of words) {
      if (w.length >= 2) { // 至少 2 个字
        wordCounts[w] = (wordCounts[w] || 0) + 1;
      }
    }
  }

  // 读取现有关键词配置，构建排除集
  const config = require('../config');
  const existingWords = new Set();
  for (const group of config.keywordGroups || []) {
    for (const g of group.groups || []) {
      for (const kw of g.keywords || []) {
        existingWords.add(kw);
      }
    }
  }

  // 筛选新词：出现 >= 3 次且不在现有配置中
  const suggestions = Object.entries(wordCounts)
    .filter(([word, count]) => count >= 3 && !existingWords.has(word))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({ word, count, reason: `在 ${count} 条高匹配标讯中出现，可考虑加入搜索关键词` }));

  return suggestions;
}

// ============================================================
// 辅助函数
// ============================================================

/**
 * 从标题中提取有意义的词（简单分词：2-4字的中文词组）
 */
function extractNouns(text) {
  if (!text) return [];
  
  // 去除标点和数字
  const cleaned = text.replace(/[0-9a-zA-Z\s\-—（）()\[\]【】「」《》<>.,，。、;；:：!！?？""'']/g, ' ');
  
  // 提取连续中文字符（2-6字）
  const matches = cleaned.match(/[\u4e00-\u9fa5]{2,6}/g) || [];
  
  // 过滤停用词
  const stopwords = new Set(['项目', '采购', '公告', '招标', '中标', '服务', '公司', '单位', '年度', '二次', '公开', '竞争', '磋商', '谈判', '询价', '单一', '来源', '更正', '补充', '延期', '废标', '终止', '变更', '结果', '候选人', '合同', '验收']);
  
  return matches.filter(w => !stopwords.has(w));
}

// ============================================================
// 主流程
// ============================================================

/**
 * 执行完整调优流程
 * @param {Object} opts
 * @param {boolean} opts.autoApply - 是否自动应用（默认 false，只生成建议）
 * @returns {Object} 调优结果
 */
async function runTuner(opts = { autoApply: false }) {
  console.log('=== 关键词自动调优开始 ===');
  const startTime = Date.now();

  // 1. maxPages 调整建议
  const pageAdjustments = await calculatePageAdjustments();
  console.log(`[tuner] maxPages 调整: ${pageAdjustments.filter(a => a.recommended_pages !== null).length} 组`);

  // 2. 排除词建议
  const excludeSuggestions = await suggestExcludeKeywords();
  console.log(`[tuner] 排除词建议: ${excludeSuggestions.length} 个`);

  // 3. 新词建议
  const newKeywordSuggestions = await suggestNewKeywords();
  console.log(`[tuner] 新词建议: ${newKeywordSuggestions.length} 个`);

  // 自动应用 maxPages（如果开启）
  let applied = null;
  if (opts.autoApply) {
    const result = await applyPageAdjustments(pageAdjustments);
    applied = result;
    console.log(`[tuner] maxPages 已自动应用: ${result.applied} 组`);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`=== 调优完成, 耗时 ${elapsed}s ===`);

  return {
    page_adjustments: pageAdjustments,
    exclude_suggestions: excludeSuggestions,
    new_keyword_suggestions: newKeywordSuggestions,
    auto_applied: applied,
    elapsed_seconds: elapsed,
  };
}

module.exports = {
  calculatePageAdjustments,
  applyPageAdjustments,
  suggestExcludeKeywords,
  suggestNewKeywords,
  runTuner,
};
