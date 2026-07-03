require('dotenv').config();
const { searchBids } = require('./services/zhiliao-api');
const { supabaseAdmin } = require('./db');

async function testApi() {
  console.log('=== 测试知了标讯 API ===');
  try {
    const result = await searchBids(['运维', '小型机'], { pageSize: 3, province: '广东' });
    console.log(`搜索结果: 总计 ${result.total} 条, 本页 ${result.items.length} 条`);
    console.log('前3条:');
    result.items.forEach((item, i) => {
      console.log(`  ${i+1}. [${item.bid_type}] ${item.title}`);
      console.log(`     ${item.province} ${item.city} | ${item.pub_time} | ${item.caller_name}`);
    });
  } catch (err) {
    console.error('API 测试失败:', err.message);
  }

  console.log('\n=== 测试 Supabase 连接 ===');
  try {
    const { count, error } = await supabaseAdmin
      .from('bidding_notice')
      .select('*', { count: 'exact', head: true });
    if (error) throw error;
    console.log(`bidding_notice 表记录数: ${count}`);
  } catch (err) {
    console.error('Supabase 测试失败:', err.message);
  }

  console.log('\n=== 测试完成 ===');
}

testApi();
