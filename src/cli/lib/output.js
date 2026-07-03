/**
 * 输出格式化工具
 * 支持表格、JSON、普通文本输出
 */
const Table = require('cli-table3');
const chalk = require('chalk');

/**
 * 格式化输出
 */
function output(data, options = {}) {
  if (options.json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (Array.isArray(data)) {
    outputTable(data, options);
  } else if (typeof data === 'object') {
    outputObject(data, options);
  } else {
    console.log(data);
  }
}

/**
 * 表格输出
 */
function outputTable(data, options = {}) {
  if (data.length === 0) {
    console.log(chalk.gray('暂无数据'));
    return;
  }

  const table = new Table({
    head: Object.keys(data[0]).map(k => chalk.cyan(k)),
    style: { head: [], border: [] },
  });

  for (const row of data) {
    table.push(Object.values(row).map(v => formatValue(v)));
  }

  console.log(table.toString());
  
  if (options.total !== undefined) {
    console.log(chalk.gray(`\n共 ${options.total} 条`));
  }
}

/**
 * 对象输出
 */
function outputObject(data, options = {}) {
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'object' && value !== null) {
      console.log(chalk.cyan(`${key}:`));
      if (Array.isArray(value)) {
        value.forEach((item, i) => {
          console.log(`  ${i + 1}. ${formatValue(item)}`);
        });
      } else {
        for (const [k, v] of Object.entries(value)) {
          console.log(`  ${chalk.gray(k)}: ${formatValue(v)}`);
        }
      }
    } else {
      console.log(`${chalk.cyan(key)}: ${formatValue(value)}`);
    }
  }
}

/**
 * 格式化值
 */
function formatValue(value) {
  if (value === null || value === undefined) return chalk.gray('-');
  if (typeof value === 'boolean') return value ? chalk.green('✓') : chalk.red('✗');
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * 推荐等级着色
 */
function colorizeLevel(level) {
  const colors = {
    strong: chalk.green,
    yes: chalk.blue,
    risky: chalk.yellow,
    no: chalk.red,
  };
  
  const labels = {
    strong: '🟢 强推',
    yes: '🟡 可以投',
    risky: '🟠 风险',
    no: '🔴 不建议',
  };
  
  const colorFn = colors[level] || chalk.white;
  return colorFn(labels[level] || level);
}

/**
 * 成功消息
 */
function success(msg) {
  console.log(chalk.green('✓') + ' ' + msg);
}

/**
 * 错误消息
 */
function error(msg) {
  console.error(chalk.red('✗') + ' ' + msg);
}

/**
 * 警告消息
 */
function warn(msg) {
  console.log(chalk.yellow('⚠') + ' ' + msg);
}

/**
 * 信息消息
 */
function info(msg) {
  console.log(chalk.blue('ℹ') + ' ' + msg);
}

module.exports = {
  output,
  outputTable,
  outputObject,
  colorizeLevel,
  success,
  error,
  warn,
  info,
};
