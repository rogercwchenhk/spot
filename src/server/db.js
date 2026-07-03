const { createClient } = require('@supabase/supabase-js');
const config = require('./config');

// service_role client: 后端使用，绕过 RLS
const supabaseAdmin = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey
);

// anon client: 前端查询使用，受 RLS 约束
const supabasePublic = createClient(
  config.supabase.url,
  config.supabase.anonKey
);

module.exports = { supabaseAdmin, supabasePublic };
