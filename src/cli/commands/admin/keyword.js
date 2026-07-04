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



/**
 * cr admin keyword:tune - 查看/执行关键词调优
 */
async function tune(options = {}) {
  try {
    if (options.apply) {
      // 执行调优并应用
      const result = await apiRequest('/api/admin/keyword-tuner/apply', 'POST');
      if (!result.success) {
        error(result.error || '调优失败');
        return;
      }
      const { adjustments, applied } = result.data;
      console.log('\n=== 关键词调优已应用 ===\n');
      for (const a of adjustments) {
        if (a.recommended_pages !== null) {
          console.log(`  ${a.name}: maxPages → ${a.recommended_pages} (${a.reason})`);
        }
      }
      console.log(`\n已更新 ${applied.applied} 个分组的 maxPages`);
      return;
    }

    // 只查看建议
    const result = await apiRequest('/api/admin/keyword-tuner');
    if (!result.success) {
      error(result.error || '获取调优建议失败');
      return;
    }

    if (options.json) {
      output(result.data, { json: true });
      return;
    }

    const { page_adjustments, exclude_suggestions, new_keyword_suggestions } = result.data;

    // maxPages 调整建议
      console.log('\n=== maxPages 调整建议 ===\n');
    for (const a of page_adjustments) {
      const pages = a.recommended_pages !== null ? `→ ${a.recommended_pages}页` : '(保持默认)';
      console.log(`  ${a.name}: ${pages} | ${a.reason}`);
    }

    // 排除词建议
    if (exclude_suggestions.length > 0) {
      console.log('\n=== 排除词建议 ===\n');
      for (const s of exclude_suggestions) {
        console.log(`  + "${s.word}" (${s.count}次) — ${s.reason}`);
      }
    }

    // 新词建议
    if (new_keyword_suggestions.length > 0) {
      console.log('\n=== 新关键词建议 ===\n');
      for (const s of new_keyword_suggestions) {
        console.log(`  + "${s.word}" (${s.count}次) — ${s.reason}`);
      }
    }

    if (exclude_suggestions.length === 0 && new_keyword_suggestions.length === 0) {
      console.log('\n暂无排除词或新关键词建议');
    }

    console.log('\n提示: 执行 cr admin keyword:tune --apply 自动应用 maxPages 调整');
  } catch (err) {
    error('请求失败: ' + err.message);
  }
}

/**
 * cr admin keyword:report - 生成并推送关键词效果报告
 */
async function report(options = {}) {
  try {
    const result = await apiRequest('/api/admin/keyword-report', 'POST', { weekly: !options.monthly });

    if (!result.success) {
      error(result.error || '生成报告失败');
      return;
    }

    if (options.json) {
      output(result.data, { json: true });
      return;
    }

    console.log('\n=== 关键词效果报告已生成 ===');
    if (result.data?.pushed) {
      console.log('已推送到企微群');
    } else {
      console.log('报告内容:');
      console.log(result.data?.markdown || '(无内容)');
    }
  } catch (err) {
    error('请求失败: ' + err.message);
  }
}

module.exports = { execute, report };

