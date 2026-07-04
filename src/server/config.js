require('dotenv').config();

/**
 * 静态配置（来自 .env，供服务启动时使用）
 * 运行时可被 DB 中的 system_config 覆盖
 */
const config = {
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    anonKey: process.env.SUPABASE_ANON_KEY,
  },
  zlbx: {
    apiKey: process.env.ZLBX_API_KEY,
    baseUrl: 'https://mcp-server.zhiliaobiaoxun.com/api_v2',
  },
  mimo: {
    apiKey: process.env.MIMO_API_KEY,
    model: process.env.MIMO_MODEL || 'mimo-v2.5-pro',
    baseUrl: process.env.MIMO_BASE_URL || 'https://token-plan-cn.xiaomimimo.com/v1',
  },
  wecom: {
    webhookUrl: process.env.WECOM_WEBHOOK_URL,
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
