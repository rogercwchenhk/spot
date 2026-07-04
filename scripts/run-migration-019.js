const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const fs = require('fs');
const sql = fs.readFileSync('supabase/migrations/019_bid_document.sql', 'utf8');

async function runMigration() {
  console.log('执行迁移: 019_bid_document.sql');
  
  // 尝试直接执行完整的 SQL
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  
  if (error) {
    console.log('exec_sql 不可用，尝试逐条执行...');
    
    // 分割 SQL 语句并逐个执行
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const stmt of statements) {
      if (!stmt) continue;
      console.log(`执行: ${stmt.substring(0, 60)}...`);
      
      const { error: stmtError } = await supabase.rpc('exec_sql', {
        query: stmt + ';'
      });
      
      if (stmtError) {
        console.error(`错误: ${stmtError.message}`);
      } else {
        console.log('成功');
      }
    }
  } else {
    console.log('成功');
  }
  
  console.log('迁移完成');
}

runMigration().catch(console.error);
