/**
 * cr status - 查看系统状态
 */
const { apiRequest } = require('../lib/auth');
const { output, error, info } = require('../lib/output');

async function execute(options = {}) {
  try {
    // 健康检查
    const health = await apiRequest('/api/health');
    
    if (options.json) {
      output({ health }, { json: true });
      return;
    }

    console.log('\n=== 系统状态 ===');
    info(`服务状态: ${health.status}`);
    info(`服务器时间: ${health.time}`);
    info(`API 地址: ${process.env.CR_API_URL || 'http://localhost:3200'}`);
  } catch (err) {
    error(`请求失败: ${err.message}`);
    process.exit(1);
  }
}

module.exports = { execute };
