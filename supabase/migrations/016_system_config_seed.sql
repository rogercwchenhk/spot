-- ============================================================
-- 016_system_config_seed.sql
-- 默认系统配置项
-- ============================================================

INSERT INTO system_config (key, value, description) VALUES
  ('push.schedule', '"0 9,14 * * *"', '企微推送 cron 表达式（默认每天 9:00 和 14:00）'),
  ('push.webhook_url', '""', '企微群机器人 Webhook 地址'),
  ('push.enabled', 'true', '推送总开关'),
  ('push.daily_summary', 'true', '日报汇总模式'),
  ('fetch.schedule', '"0 12,23 * * *"', '标讯采集 cron 表达式（默认每天 12:00 和 23:00）')
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE system_config IS '系统运行时配置，通过 /api/config 管理';
