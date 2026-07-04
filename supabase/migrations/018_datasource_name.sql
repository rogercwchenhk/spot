-- ============================================================
-- 018_datasource_name.sql
-- 数据源名称配置
-- ============================================================

INSERT INTO system_config (key, value, description) VALUES
  ('datasource.name', '"知了标讯"', '数据源名称（显示用）')
ON CONFLICT (key) DO NOTHING;
