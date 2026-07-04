/**
 * 关键词效果报告服务
 * 生成按分组统计的 Markdown 报告，供企微推送和 CLI 使用
 */
const { supabaseAdmin } = require('../db');

/**
 * 获取关键词效果统计数据
 * @returns {Array} 每个分组的统计数据
 */
async function getKeywordStats() {
  const { data, error } = await supabaseAdmin
    .from('v_keyword_effectiveness')
    .select('*');

  if (error) {
    console.warn('[keyword-report] 视图查询失败，回退到手动统计:', error.message);
    return await getKeywordStatsManual();
  }

  return data || [];
}

/**
 * 手动统计（视图不存在时的回退方案）
 */
async function getKeywordStatsManual() {
  const { data: notices, error } = await supabaseAdmin
    .from('bidding_notice')
    .select('id, keyword_source, match_result(recommend_level)')
    .not('keyword_source', 'is', null);

  if (error) throw error;

  const groups = {};
  for (const n of notices || []) {
    const src = n.keyword_source;
    if (!groups[src]) {
      groups[src] = { keyword_source: src, total_notices: 0, strong_count: 0, yes_count: 0, risky_count: 0, no_count: 0, unmatched_count: 0 };
    }
    groups[src].total_notices++;
    const mr = Array.isArray(n.match_result) ? n.match_result[0] : n.match_result;
    if (!mr) {
      groups[src].unmatched_count++;
    } else if (mr.recommend_level === 'strong') {
      groups[src].strong_count++;
    } else if (mr.recommend_level === 'yes') {
      groups[src].yes_count++;
    } else if (mr.recommend_level === 'risky') {
      groups[src].risky_count++;
    } else if (mr.recommend_level === 'no') {
      groups[src].no_count++;
    }
  }

  return Object.values(groups).map(g => ({
    ...g,
    matched_count: g.total_notices - g.unmatched_count,
    effective_rate: g.matched_count > 0
      ? Math.round((g.strong_count + g.yes_count) / g.matched_count * 1000) / 10
      : null,
  }));
}

/**
 * 生成关键词效果 Markdown 报告
 * @param {Object} opts
 * @param {boolean} opts.weekly - 是否为周报（默认 true）
 * @returns {{ markdown: string, stats: Array }}
 */
async function generateKeywordReport(opts = { weekly: true }) {
  const stats = await getKeywordStats();

  if (stats.length === 0) {
    return {
      markdown: '## 📈 关键词效果报告\n\n> 暂无数据，请先运行采集和匹配。',
      stats: [],
    };
  }

  // 按有效率排序（null 放最后）
  stats.sort((a, b) => {
    if (a.effective_rate === null && b.effective_rate === null) return 0;
    if (a.effective_rate === null) return 1;
    if (b.effective_rate === null) return -1;
    return b.effective_rate - a.effective_rate;
  });

  const dateStr = new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });
  const period = opts.weekly ? '本周' : '汇总';

  let md = `## 📈 关键词效果报告 (${period} ${dateStr})\n\n`;

  // 总览
  let totalNotices = 0;
  let totalStrong = 0;
  let totalYes = 0;
  let totalMatched = 0;
  for (const s of stats) {
    totalNotices += s.total_notices || 0;
    totalStrong += s.strong_count || 0;
    totalYes += s.yes_count || 0;
    totalMatched += s.matched_count || 0;
  }
  const overallRate = totalMatched > 0
    ? Math.round((totalStrong + totalYes) / totalMatched * 100) / 10
    : 0;

  md += `> 入库 **${totalNotices}** 条 | 强推 **${totalStrong}** | 可投 **${totalYes}** | 总有效率 **${overallRate}%**\n\n`;

  // 各分组详情
  md += `| 分组 | 入库 | strong | yes | risky | no | 有效率 |\n`;
  md += `|---|---|---|---|---|---|---|\n`;

  for (const s of stats) {
    const rate = s.effective_rate !== null ? `${s.effective_rate}%` : '-';
    md += `| ${s.keyword_source} | ${s.total_notices || 0} | ${s.strong_count || 0} | ${s.yes_count || 0} | ${s.risky_count || 0} | ${s.no_count || 0} | ${rate} |\n`;
  }

  // 建议
  md += '\n### 💡 建议\n\n';

  const highPerf = stats.filter(s => s.effective_rate !== null && s.effective_rate >= 30);
  const lowPerf = stats.filter(s => s.effective_rate !== null && s.effective_rate < 10 && s.matched_count >= 5);
  const noData = stats.filter(s => s.total_notices === 0 || s.effective_rate === null);

  if (highPerf.length > 0) {
    md += `> **高效分组**（有效率 ≥ 30%）：${highPerf.map(s => s.keyword_source).join('、')}，建议增加采集页数\n`;
  }
  if (lowPerf.length > 0) {
    md += `> **低效分组**（有效率 < 10%）：${lowPerf.map(s => s.keyword_source).join('、')}，建议优化关键词或减少页数\n`;
  }
  if (noData.length > 0) {
    md += `> **无数据分组**：${noData.map(s => s.keyword_source).join('、')}，可能是关键词过于冷门\n`;
  }

  if (highPerf.length === 0 && lowPerf.length === 0 && noData.length === 0) {
    md += '> 各分组表现正常，暂无调整建议\n';
  }

  return { markdown: md, stats };
}

module.exports = { getKeywordStats, generateKeywordReport };
