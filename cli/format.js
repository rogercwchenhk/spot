/**
 * 输出格式化 — 支持 JSON 和人类可读两种模式
 */

const LEVEL_COLORS = {
  strong: '\x1b[32m',  // green
  yes:    '\x1b[33m',  // yellow
  risky:  '\x1b[31m',  // red
  no:     '\x1b[90m',  // gray
};
const RESET = '\x1b[0m';

function output(data, jsonMode) {
  if (jsonMode) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    return data;
  }
}

function success(data, jsonMode) {
  if (jsonMode) {
    console.log(JSON.stringify({ success: true, data }, null, 2));
  }
  return data;
}

function error(msg, jsonMode) {
  if (jsonMode) {
    console.log(JSON.stringify({ success: false, error: msg }, null, 2));
  } else {
    console.error(`\x1b[31mError:\x1b[0m ${msg}`);
  }
  process.exit(1);
}

function table(rows, columns, jsonMode) {
  if (jsonMode) {
    console.log(JSON.stringify({ success: true, data: rows, meta: { total: rows.length } }, null, 2));
    return;
  }

  if (!rows || rows.length === 0) {
    console.log('  (empty)');
    return;
  }

  // 计算列宽
  const widths = {};
  for (const col of columns) {
    widths[col.key] = col.label.length;
    for (const row of rows) {
      const val = String(row[col.key] || '');
      widths[col.key] = Math.max(widths[col.key], val.length);
    }
    widths[col.key] = Math.min(widths[col.key], col.maxWidth || 60);
  }

  // 打印表头
  const header = columns.map(col => col.label.padEnd(widths[col.key])).join('  ');
  console.log(header);
  console.log(columns.map(col => '─'.repeat(widths[col.key])).join('──'));

  // 打印行
  for (const row of rows) {
    const line = columns.map(col => {
      let val = String(row[col.key] || '');
      if (val.length > (col.maxWidth || 60)) {
        val = val.slice(0, (col.maxWidth || 60) - 1) + '…';
      }
      // 着色
      if (col.colorKey && LEVEL_COLORS[row[col.colorKey]]) {
        val = LEVEL_COLORS[row[col.colorKey]] + val + RESET;
      }
      return val.padEnd(widths[col.key]);
    }).join('  ');
    console.log(line);
  }
  console.log(`\n  Total: ${rows.length}`);
}

function noticeRow(n) {
  return {
    id: n.id,
    level: n.match_result?.recommend_level || '-',
    title: (n.title || '').slice(0, 50),
    budget: n.budget_amount ? `${n.budget_amount}万` : '-',
    region: n.region_scope || n.city || '-',
    date: (n.publish_date || '').slice(0, 10),
    source: n.data_source || '-',
  };
}

function formatDate(d) {
  if (!d) return '-';
  return String(d).slice(0, 10);
}

module.exports = { output, success, error, table, noticeRow, formatDate, LEVEL_COLORS, RESET };
