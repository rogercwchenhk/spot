/**
 * cr admin pipeline - 运行完整处理流程
 */
const { apiRequest } = require('../../lib/auth');
const { output, success, error, info } = require('../../lib/output');

async function execute() {
  try {
    info('开始运行完整处理流程...');
    info('采集 → AI Pipeline → 匹配引擎 → 企微推送');
    
    const result = await apiRequest('/api/admin/pipeline', {
      method: 'POST',
    });

    if (!result.success) {
      error(result.error || '流程执行失败');
      return;
    }

    console.log('\n=== 流程执行结果 ===');
    console.log(`采集: 新增 ${result.data.ingestion} 条`);
    console.log(`AI 处理: ${result.data.ai.processed} 成功, ${result.data.ai.failed} 失败`);
    console.log(`匹配计算: ${result.data.match.calculated} 成功, ${result.data.match.failed} 失败`);
    console.log(`企微推送: ${result.data.push.pushed} 推送, ${result.data.push.skipped} 跳过`);
    
    success('完整流程执行完成');
  } catch (err) {
    error(`请求失败: ${err.message}`);
  }
}

module.exports = { execute };
