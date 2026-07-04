-- ============================================================
-- 017_extend_system_config.sql
-- 扩展系统配置：数据源、LLM、多时段采集
-- ============================================================

-- 数据源配置
INSERT INTO system_config (key, value, description) VALUES
  ('datasource.zlbx.api_key', '""', '知了标讯 API Key'),
  ('datasource.zlbx.base_url', '"https://mcp-server.zhiliaobiaoxun.com/api_v2"', '知了标讯 API 地址')
ON CONFLICT (key) DO NOTHING;

-- LLM 配置
INSERT INTO system_config (key, value, description) VALUES
  ('llm.api_key', '""', 'LLM API Key（小米 mimo）'),
  ('llm.model', '"mimo-v2.5-pro"', 'LLM 模型名称'),
  ('llm.base_url', '"https://token-plan-cn.xiaomimimo.com/v1"', 'LLM API 地址')
ON CONFLICT (key) DO NOTHING;

-- 多时段采集（JSON 数组，支持多个 cron 表达式）
INSERT INTO system_config (key, value, description) VALUES
  ('fetch.schedules', '["0 8 * * *", "0 12 * * *", "0 18 * * *", "0 23 * * *"]', '标讯采集时间（cron 数组，支持多个时段）')
ON CONFLICT (key) DO NOTHING;

-- 搜索关键词配置
INSERT INTO system_config (key, value, description) VALUES
  ('fetch.keywords', '[["运维","小型机"],["运维","存储"],["运维","数据库"],["运维","网络设备"],["驻场","运维"],["驻场","桌面"],["信息化","运维服务"],["服务器","维保"]]', '搜索关键词组（二维数组，每组一次 API 调用）'),
  ('fetch.province', '"广东"', '目标省份')
ON CONFLICT (key) DO NOTHING;
