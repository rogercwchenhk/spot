require('dotenv').config();
const { runFullIngestion } = require('./services/ingestion');

async function main() {
  console.log('--- 手动执行标讯采集 ---');
  const count = await runFullIngestion();
  console.log(`完成，共新增 ${count} 条标讯`);
  process.exit(0);
}

main().catch(err => {
  console.error('采集失败:', err);
  process.exit(1);
});
