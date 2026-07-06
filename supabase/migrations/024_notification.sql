-- ============================================================
-- 024_notification.sql
-- 系统通知表 — 采集结果/匹配通知/系统消息
-- ============================================================

CREATE TABLE notification (
  id              BIGSERIAL PRIMARY KEY,
  type            VARCHAR(50) NOT NULL,    -- notice_new / match_strong / crawl_done / system
  title           VARCHAR(200) NOT NULL,
  body            TEXT,
  link            VARCHAR(300),            -- 前端跳转路径，如 /notices/123
  is_read         BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE notification IS '系统通知：采集结果、匹配通知、系统消息';
COMMENT ON COLUMN notification.type IS '通知类型：notice_new(新标讯)/match_strong(强推)/crawl_done(采集完成)/system(系统)';

CREATE INDEX idx_notification_read ON notification (is_read, created_at DESC);
CREATE INDEX idx_notification_type ON notification (type, created_at DESC);

-- RLS
ALTER TABLE notification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON notification
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "authenticated_read" ON notification
  FOR SELECT USING (auth.role() = 'authenticated');
