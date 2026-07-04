require('dotenv').config();

/**
 * 静态配置（来自 .env，不可在运行时修改）
 */
const config = {
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    anonKey: process.env.SUPABASE_ANON_KEY,
  },
  // 搜索关键词默认值（可被 DB fetch.keywords 覆盖）
  searchKeywords: [
    ['运维', '小型机'],
    ['运维', '存储'],
    ['运维', '数据库'],
    ['运维', '网络设备'],
    ['驻场', '运维'],
    ['驻场', '桌面'],
    ['信息化', '运维服务'],
    ['服务器', '维保'],
  ],
  targetProvince: '广东',
};

module.exports = config;
