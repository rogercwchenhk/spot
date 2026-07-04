-- ============================================================
-- 020_notice_scoring.sql
-- 评分标准结构化存储表
-- ============================================================

CREATE TABLE notice_scoring (
  id              BIGSERIAL PRIMARY KEY,
  notice_id       BIGINT NOT NULL REFERENCES bidding_notice(id) ON DELETE CASCADE,
  doc_id          BIGINT REFERENCES bid_document(id) ON DELETE SET NULL,
  total_score     DECIMAL(5,1) DEFAULT 100,
  scoring_json    JSONB NOT NULL,         -- 完整评分标准结构
  qualifications  JSONB,                  -- 资质要求
  summary         TEXT,                   -- AI 生成的评分概述
  extracted_at    TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (notice_id)
);

COMMENT ON TABLE notice_scoring IS '招标文件评分标准结构化存储';
COMMENT ON COLUMN notice_scoring.scoring_json IS '评分标准 JSON: {total, categories: [{name, max_score, items: [{item, score, rule}]}]}';
COMMENT ON COLUMN notice_scoring.qualifications IS '资质要求 JSON: [{type, requirement, mandatory}]';

CREATE INDEX idx_scoring_notice ON notice_scoring (notice_id);

ALTER TABLE notice_scoring ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON notice_scoring
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "authenticated_read" ON notice_scoring
  FOR SELECT USING (auth.role() = 'authenticated');
