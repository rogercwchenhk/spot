-- ============================================================
-- 009_ai_friendly_enhancements.sql
-- 全表 AI 友好度增强
-- ============================================================

-- 1. 资质表关联 qualification_reference（标准化匹配）
ALTER TABLE company_qualification
  ADD COLUMN IF NOT EXISTS qual_ref_id INT REFERENCES qualification_reference(id),
  ADD COLUMN IF NOT EXISTS match_keywords TEXT[];

COMMENT ON COLUMN company_qualification.qual_ref_id IS '关联 qualification_reference.id，标准化资质匹配';
COMMENT ON COLUMN company_qualification.match_keywords IS 'AI 匹配关键词，从 qualification_reference 同步或自定义';

CREATE INDEX IF NOT EXISTS idx_company_qual_ref ON company_qualification (qual_ref_id);
CREATE INDEX IF NOT EXISTS idx_company_qual_keywords ON company_qualification USING gin(match_keywords);

ALTER TABLE personnel_qualification
  ADD COLUMN IF NOT EXISTS qual_ref_id INT REFERENCES qualification_reference(id),
  ADD COLUMN IF NOT EXISTS match_keywords TEXT[];

COMMENT ON COLUMN personnel_qualification.qual_ref_id IS '关联 qualification_reference.id，标准化资质匹配';
COMMENT ON COLUMN personnel_qualification.match_keywords IS 'AI 匹配关键词，从 qualification_reference 同步或自定义';

CREATE INDEX IF NOT EXISTS idx_personnel_qual_ref ON personnel_qualification (qual_ref_id);
CREATE INDEX IF NOT EXISTS idx_personnel_qual_keywords ON personnel_qualification USING gin(match_keywords);


-- 2. bidding_notice 存储 AI 完整提取结果
ALTER TABLE bidding_notice
  ADD COLUMN IF NOT EXISTS ai_extracted_fields JSONB;

COMMENT ON COLUMN bidding_notice.ai_extracted_fields IS 'AI 结构化提取完整结果：项目类型、预算、资质要求、评分规则、技术关键词等';

CREATE INDEX IF NOT EXISTS idx_notice_ai_fields ON bidding_notice USING gin(ai_extracted_fields);


-- 3. notice_tag 添加置信度
ALTER TABLE notice_tag
  ADD COLUMN IF NOT EXISTS confidence DECIMAL(3,2) DEFAULT 1.0;

COMMENT ON COLUMN notice_tag.confidence IS 'AI 提取置信度 0.00-1.00，低于阈值可人工复核';

CREATE INDEX IF NOT EXISTS idx_tag_confidence ON notice_tag (confidence);


-- 4. match_result 添加 AI 评分详情
ALTER TABLE match_result
  ADD COLUMN IF NOT EXISTS ai_score_details JSONB;

COMMENT ON COLUMN match_result.ai_score_details IS 'AI 辅助评分详情（第二阶段用），规则引擎评分在 match_details';


