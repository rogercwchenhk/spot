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
  // ============================================================
  // 搜索关键词策略 v2（可被 DB fetch.keyword_groups 覆盖）
  // 使用 query_bids_advanced 的 keyword_groups 实现组内AND/组间OR
  // match_modes: sm=标的物 title=标题 fulltext=全文 caller=采购方 winner=中标方
  // ============================================================
  keywordGroups: [
    // --- 第一组：核心运维+设备 ---
    {
      name: '核心设备运维',
      groups: [
        { keywords: ['运维', '小型机'], match_modes: ['sm', 'title'] },
        { keywords: ['维保', '小型机'], match_modes: ['sm', 'title'] },
        { keywords: ['运维', '存储'], match_modes: ['sm', 'title'] },
        { keywords: ['维保', '存储'], match_modes: ['sm', 'title'] },
        { keywords: ['运维', '数据库'], match_modes: ['sm', 'title'] },
        { keywords: ['维保', '数据库'], match_modes: ['sm', 'title'] },
        { keywords: ['运维', '服务器'], match_modes: ['sm', 'title'] },
        { keywords: ['维保', '服务器'], match_modes: ['sm', 'title'] },
        { keywords: ['运维', '网络'], match_modes: ['sm', 'title'] },
        { keywords: ['维保', '网络'], match_modes: ['sm', 'title'] },
      ],
    },
    // --- 第二组：驻场服务 ---
    {
      name: '驻场服务',
      groups: [
        { keywords: ['驻场', '运维'], match_modes: ['sm', 'title'] },
        { keywords: ['驻场', '桌面'], match_modes: ['sm', 'title'] },
        { keywords: ['驻场', 'IT'], match_modes: ['sm', 'title'] },
        { keywords: ['桌面运维'], match_modes: ['sm', 'title'] },
      ],
    },
    // --- 第三组：通用IT运维/服务（fulltext 模式，覆盖正文中的匹配） ---
    {
      name: '通用IT运维',
      groups: [
        { keywords: ['IT运维'], match_modes: ['sm', 'title', 'fulltext'] },
        { keywords: ['IT服务'], match_modes: ['sm', 'title', 'fulltext'] },
        { keywords: ['信息技术服务'], match_modes: ['sm', 'title', 'fulltext'] },
        { keywords: ['信息化运维'], match_modes: ['sm', 'title', 'fulltext'] },
        { keywords: ['信息系统运维'], match_modes: ['sm', 'title', 'fulltext'] },
        { keywords: ['运维服务'], match_modes: ['sm', 'title', 'fulltext'] },
        { keywords: ['技术支持服务'], match_modes: ['sm', 'title', 'fulltext'] },
      ],
    },
    // --- 第四组：机房/数据中心 ---
    {
      name: '机房数据中心',
      groups: [
        { keywords: ['机房运维'], match_modes: ['sm', 'title'] },
        { keywords: ['数据中心运维'], match_modes: ['sm', 'title'] },
        { keywords: ['机房', '维护'], match_modes: ['sm', 'title'] },
      ],
    },
    // --- 第五组：行业特有（交警/公安） ---
    {
      name: '行业特有',
      groups: [
        { keywords: ['交警', '运维'], match_modes: ['sm', 'title', 'fulltext'] },
        { keywords: ['公安', '运维'], match_modes: ['sm', 'title', 'fulltext'] },
        { keywords: ['公安', '信息化'], match_modes: ['sm', 'title', 'fulltext'] },
      ],
    },
    // --- 第六组：品牌/产品特有（单独查询，避免被宽泛词淹没） ---
    {
      name: '品牌产品',
      groups: [
        { keywords: ['IBM', '维保'], match_modes: ['sm', 'title', 'fulltext'] },
        { keywords: ['IBM', '运维'], match_modes: ['sm', 'title', 'fulltext'] },
        { keywords: ['Oracle', '维保'], match_modes: ['sm', 'title', 'fulltext'] },
        { keywords: ['Oracle', '运维'], match_modes: ['sm', 'title', 'fulltext'] },
        { keywords: ['Power', '小型机'], match_modes: ['sm', 'title', 'fulltext'] },
      ],
    },
  ],
  // 排除词：过滤掉不相关的公告
  excludeKeywords: ['建筑', '施工', '监理', '装修', '幕墙', '消防工程', '医疗设备', '药品', '食材', '物业保洁', '绿化', '园林'],
  // 兼容旧配置（已废弃，保留以防回退）
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
