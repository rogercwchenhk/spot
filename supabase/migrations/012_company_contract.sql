-- ============================================================
-- 012_company_contract.sql
-- 公司业绩/合同表 — 供匹配引擎查询同类项目经验
-- ============================================================

CREATE TABLE company_contract (
  id              BIGSERIAL PRIMARY KEY,
  source_file     VARCHAR(200),            -- 原始文件名（本地索引）
  project_name    VARCHAR(300) NOT NULL,   -- 项目名称
  client_name     VARCHAR(200),            -- 甲方名称
  service_type    VARCHAR(50),             -- 服务类型：运维/驻场/集成/桌面/维保/咨询
  tech_keywords   TEXT[],                  -- 技术关键词：小型机/存储/数据库/Oracle等
  industry        VARCHAR(50),             -- 行业：银行/医院/政府/交通/电力等
  contract_amount DECIMAL(18,2),           -- 合同金额
  start_date      DATE,                    -- 合同开始日期
  end_date        DATE,                    -- 合同结束日期
  region          VARCHAR(50),             -- 地区

  -- === AI 友好字段 ===
  raw_text        TEXT,                    -- 合同关键文本（供 AI 匹配参考）
  ai_extracted    JSONB,                   -- AI 提取完整结果（可扩展）
  confidence      DECIMAL(3,2),            -- 提取置信度 0.00-1.00
  process_status  SMALLINT DEFAULT 0,      -- 0-待处理, 1-已完成, -1-失败
  process_error   TEXT,                    -- 处理失败原因

  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE company_contract IS '公司业绩/合同表，供匹配引擎查询同类项目经验';
COMMENT ON COLUMN company_contract.source_file IS '原始文件名，用于本地文件索引';
COMMENT ON COLUMN company_contract.service_type IS '服务类型：运维/驻场/集成/桌面/维保/咨询';
COMMENT ON COLUMN company_contract.tech_keywords IS '技术关键词数组，匹配引擎直接使用';
COMMENT ON COLUMN company_contract.industry IS '行业分类：银行/医院/政府/交通/电力等';
COMMENT ON COLUMN company_contract.raw_text IS '合同关键文本，供 AI 匹配时参考';
COMMENT ON COLUMN company_contract.ai_extracted IS 'AI 提取完整结果 JSON，字段可扩展';
COMMENT ON COLUMN company_contract.confidence IS 'AI 提取置信度 0.00-1.00';
COMMENT ON COLUMN company_contract.process_status IS '处理状态：0-待处理, 1-已完成, -1-失败';

-- 索引
CREATE INDEX idx_contract_service_type ON company_contract (service_type);
CREATE INDEX idx_contract_industry ON company_contract (industry);
CREATE INDEX idx_contract_region ON company_contract (region);
CREATE INDEX idx_contract_dates ON company_contract (start_date, end_date);
CREATE INDEX idx_contract_keywords ON company_contract USING gin(tech_keywords);
CREATE INDEX idx_contract_status ON company_contract (process_status);
CREATE INDEX idx_contract_client ON company_contract (client_name);

-- 自动更新 updated_at
CREATE TRIGGER trg_company_contract_updated
  BEFORE UPDATE ON company_contract
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE company_contract ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON company_contract
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "public_read" ON company_contract
  FOR SELECT USING (true);

