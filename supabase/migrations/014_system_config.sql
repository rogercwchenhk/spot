-- ============================================================
-- 014_system_config.sql
-- 系统配置表：推送时间、Webhook 地址等可运行时调整
-- ============================================================

CREATE TABLE system_config (
  key         VARCHAR(100) PRIMARY KEY,
  value       JSONB        NOT NULL,
  description VARCHAR(500),
  updated_at  TIMESTAMPTZ  DEFAULT NOW()
);

COMMENT ON TABLE system_config IS '系统运行配置（推送计划、Webhook 等）';

-- 默认配置
INSERT INTO system_config (key, value, description) VALUES
  ('push.schedule', '"0 9,14 * * *"', '企微推送 cron 表达式（默认每天 9:00 和 14:00）'),
  ('push.webhook_url', '"https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=ba0a9b18-8835-49c5-9707-41ef1fcc2425"', '企微群机器人 Webhook 地址'),
  ('push.enabled', 'true', '是否启用推送'),
  ('push.daily_summary', 'true', '是否推送日报汇总（false 则逐条推送）'),
  ('fetch.schedule', '"0 12,23 * * *"', '标讯采集 cron 表达式（默认每天 12:00 和 23:00）')
ON CONFLICT (key) DO NOTHING;
