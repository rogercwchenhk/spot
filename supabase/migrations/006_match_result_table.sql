-- ============================================================
-- 006_match_result_table.sql
-- 资格匹配结果表 + bidding_notice 补充字段
-- ============================================================

-- === 匹配结果表 ===
CREATE TABLE match_result (
  id              BIGSERIAL PRIMARY KEY,
  notice_id       BIGINT NOT NULL REFERENCES bidding_notice(id) ON DELETE CASCADE,
  total_deduction DECIMAL(5,2) DEFAULT 0,  -- 预估总扣分
  recommend_level VARCHAR(20) NOT NULL     -- 推荐等级
    CHECK (recommend_level IN ('strong', 'yes', 'risky', 'no')),
  match_details   JSONB NOT NULL,          -- 逐项匹配详情
  unmatched_items JSONB,                   -- 不满足的条件列表
  risk_notes      TEXT[],                   -- 风险提示
  calculated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (notice_id)
);

COMMENT ON TABLE  match_result IS '资格匹配结果：预估扣分 + 推荐等级 + 逐项详情';
COMMENT ON COLUMN match_result.total_deduction IS '预估总扣分，0=完美匹配';
COMMENT ON COLUMN match_result.recommend_level IS 'strong<=0分/yes<=2分/risky<=5分/no>5分';
COMMENT ON COLUMN match_result.match_details IS 'JSON数组，每项含：requirement, matched, deduction, source';

-- 索引
CREATE INDEX idx_match_result_notice ON match_result (notice_id);
CREATE INDEX idx_match_result_level ON match_result (recommend_level);

-- RLS
ALTER TABLE match_result ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON match_result
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "authenticated_read" ON match_result
  FOR SELECT USING (auth.role() = 'authenticated');


-- === bidding_notice 补充字段 ===
ALTER TABLE bidding_notice
  ADD COLUMN IF NOT EXISTS data_source VARCHAR(50) DEFAULT 'zhiliao_api';

COMMENT ON COLUMN bidding_notice.data_source IS '数据来源：zhiliao_api/jianshu_email/self_crawler';

-- 补充匹配结果关联索引
CREATE INDEX IF NOT EXISTS idx_notice_data_source
  ON bidding_notice (data_source);
