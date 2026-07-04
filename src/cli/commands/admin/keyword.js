/**
 * cr admin keyword:stats - 关键词效果统计
 */
const { apiRequest } = require('../../lib/auth');
const { output, error } = require('../../lib/output');

async function execute(options = {}) {
  try {
    const result = await apiRequest('/api/admin/keyword-stats');

    if (!result.success) {
      error(result.error || '获取关键词统计失败');
      return;
    }

    if (options.json) {
      output(result.data, { json: true });
      return;
    }

    const stats = result.data || [];

    if (stats.length === 0) {
      console.log('\n暂无关键词效果数据。请先运行采集（cr admin notice:fetch）并执行匹配。');
      return;
    }

    console.log('\n=== 关键词效果统计 ===\n');
    console.log(
      '分组'.padEnd(16) +
      '入库'.padStart(6) +
      'strong'.padStart(8) +
      'yes'.padStart(6) +
      'risky'.padStart(6) +
      'no'.padStart(6) +
      '未匹配'.padStart(8) +
      '有效率'.padStart(8)
    );
    console.log('-'.repeat(72));

    let totalNotices = 0;
    let totalEffective = 0;

    for (const row of stats) {
      const name = (row.keyword_source || '').substring(0, 14).padEnd(16);
      const total = row.total_notices || 0;
      const strong = row.strong_count || 0;
      const yes = row.yes_count || 0;
      const risky = row.risky_count || 0;
      const no = row.no_count || 0;
      const unmatched = row.unmatched_count || 0;
      const rate = row.effective_rate !== null ? `${row.effective_rate}%` : '-';

      totalNotices += total;
      totalEffective += strong + yes;

      console.log(
        name +
        String(total).padStart(6) +
        String(strong).padStart(8) +
        String(yes).padStart(6) +
        String(risky).padStart(6) +
        String(no).padStart(6) +
        String(unmatched).padStart(8) +
        rate.padStart(8)
      );
    }

    console.log('-'.repeat(72));
    const overallRate = totalNotices > 0
      ? ((totalEffective / totalNotices) * 100).toFixed(1) + '%'
      : '-';
    console.log(
      '合计'.padEnd(16) +
      String(totalNotices).padStart(6) +
      ''.padStart(8) +
      ''.padStart(6) +
      ''.padStart(6) +
      ''.padStart(6) +
      ''.padStart(8) +
      overallRate.padStart(8)
    );

    console.log('\n有效率 = (strong + yes) / 已匹配总数');
    console.log('建议: 有效率 > 30% 的分组可增加采集页数，< 10% 的考虑优化或暂停');
  } catch (err) {
    error(`请求失败: ${err.message}`);
  }
}

module.exports = { execute };
