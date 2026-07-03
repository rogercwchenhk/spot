-- ============================================================
-- 005_qualification_tables.sql
-- 公司资质表 + 人员资质表
-- ============================================================

-- === 公司资质表 ===
CREATE TABLE company_qualification (
  id              SERIAL PRIMARY KEY,
  qual_type       VARCHAR(50) NOT NULL,    -- 资质类型：ISO9001/ISO27001/ITSS/CS/软件著作权/营业执照等
  qual_name       VARCHAR(200) NOT NULL,   -- 资质名称
  qual_level      VARCHAR(50),             -- 等级：一级/二级/三级/甲级/乙级
  cert_number     VARCHAR(100),            -- 证书编号
  issue_date      DATE,
  expiry_date     DATE,                    -- 到期日
  issuing_body    VARCHAR(200),            -- 发证机关
  scope           TEXT,                    -- 覆盖范围描述
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE  company_qualification IS '公司资质证书表';
COMMENT ON COLUMN company_qualification.qual_type IS '资质类型：ISO9001/ISO27001/ITSS/CS/软件著作权/营业执照等';
COMMENT ON COLUMN company_qualification.qual_level IS '等级：一级/二级/三级/甲级/乙级';
COMMENT ON COLUMN company_qualification.expiry_date IS '到期日，后续用于资质到期预警';

-- 索引
CREATE INDEX idx_company_qual_type ON company_qualification (qual_type);
CREATE INDEX idx_company_qual_active ON company_qualification (is_active);

-- 自动更新 updated_at
CREATE TRIGGER trg_company_qualification_updated
  BEFORE UPDATE ON company_qualification
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE company_qualification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON company_qualification
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "authenticated_read" ON company_qualification
  FOR SELECT USING (auth.role() = 'authenticated');


-- === 人员资质表 ===
CREATE TABLE personnel_qualification (
  id              SERIAL PRIMARY KEY,
  person_name     VARCHAR(50) NOT NULL,    -- 姓名
  qual_type       VARCHAR(50) NOT NULL,    -- 证书类型：PMP/OCP/RHCE/CCIE/HCIE/软考等
  qual_name       VARCHAR(200) NOT NULL,   -- 证书全称
  cert_number     VARCHAR(100),            -- 证书编号
  issue_date      DATE,
  expiry_date     DATE,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE  personnel_qualification IS '人员资质证书表';
COMMENT ON COLUMN personnel_qualification.qual_type IS '证书类型：PMP/OCP/RHCE/CCIE/HCIE/软考等';

-- 索引
CREATE INDEX idx_personnel_qual_type ON personnel_qualification (qual_type);
CREATE INDEX idx_personnel_qual_active ON personnel_qualification (is_active);

-- 自动更新 updated_at
CREATE TRIGGER trg_personnel_qualification_updated
  BEFORE UPDATE ON personnel_qualification
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE personnel_qualification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON personnel_qualification
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "authenticated_read" ON personnel_qualification
  FOR SELECT USING (auth.role() = 'authenticated');
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
