-- ============================================================
-- Migration 026: B5 销售标注 + B6 资质到期预警
-- ============================================================

-- B5: 销售标注功能
-- bidding_notice 表新增 notice_status 字段
ALTER TABLE bidding_notice 
  ADD COLUMN IF NOT EXISTS notice_status VARCHAR(20) DEFAULT 'new'
  CHECK (notice_status IN ('new', 'following', 'ignored', 'bidding', 'won', 'lost'));

-- 索引：按状态筛选
CREATE INDEX IF NOT EXISTS idx_notice_status ON bidding_notice(notice_status);

-- 更新现有记录的默认值（可选，确保数据一致性）
UPDATE bidding_notice SET notice_status = 'new' WHERE notice_status IS NULL;

COMMENT ON COLUMN bidding_notice.notice_status IS '销售标注状态: new(新标讯)/following(已跟进)/ignored(忽略)/bidding(已投标)/won(已中标)/lost(未中标)';

-- B6: 资质到期预警配置
INSERT INTO system_config (key, value, description) VALUES
  ('qual.warning_days', '30', '资质到期预警天数'),
  ('qual.warning_enabled', '"true"', '是否启用资质到期预警'),
  ('qual.warning_cron', '"0 9 * * *"', '资质预警检查 cron 表达式')
ON CONFLICT (key) DO NOTHING;

-- 预警历史表（记录已推送的预警，避免重复推送）
CREATE TABLE IF NOT EXISTS qual_warning_history (
  id BIGSERIAL PRIMARY KEY,
  qual_type VARCHAR(20) NOT NULL CHECK (qual_type IN ('company', 'personnel')),
  qual_id INTEGER NOT NULL,
  qual_name VARCHAR(200) NOT NULL,
  expiry_date DATE NOT NULL,
  days_remaining INTEGER NOT NULL,
  pushed_at TIMESTAMPTZ DEFAULT NOW(),
  pushed_date DATE DEFAULT CURRENT_DATE,
  UNIQUE (qual_type, qual_id, pushed_date)
);

CREATE INDEX IF NOT EXISTS idx_qual_warning_date ON qual_warning_history(pushed_date);

COMMENT ON TABLE qual_warning_history IS '资质到期预警推送历史，避免同一天重复推送';
