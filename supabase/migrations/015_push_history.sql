-- ============================================================
-- 015_push_history.sql
-- 推送历史表（替代 notice_tag 记录推送状态的临时方案）
-- ============================================================

CREATE TABLE push_history (
  id              BIGSERIAL PRIMARY KEY,
  notice_id       BIGINT NOT NULL REFERENCES bidding_notice(id) ON DELETE CASCADE,
  tenderee        VARCHAR(300),            -- 采购单位（用于 24h 去重）
  channel         VARCHAR(50) DEFAULT 'wecom',  -- 推送渠道
  pushed_at       TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE push_history IS '推送历史记录，用于去重和统计';

-- 索引：按采购单位查 24h 内推送记录
CREATE INDEX idx_push_history_tenderee_time ON push_history (tenderee, pushed_at);
-- 索引：按标讯查是否已推送
CREATE INDEX idx_push_history_notice ON push_history (notice_id);

-- RLS
ALTER TABLE push_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON push_history
  FOR ALL USING (auth.role() = 'service_role');
