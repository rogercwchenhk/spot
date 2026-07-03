-- ============================================================
-- 001_init_schema.sql
-- 客户雷达 (Customer Radar) — AI-Friendly 招投标数据平台
-- Supabase / PostgreSQL 15+ 迁移脚本
-- ============================================================

-- 启用必要扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUID 生成
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- 中文模糊搜索加速

-- ============================================================
-- 1. 平台源信息表 (platform_source)
-- ============================================================
CREATE TABLE platform_source (
  id                SERIAL PRIMARY KEY,
  platform_name     VARCHAR(100)  NOT NULL,
  base_url          VARCHAR(255)  NOT NULL,
  list_url          VARCHAR(500)  NOT NULL,

  platform_type     VARCHAR(30)   NOT NULL
    CHECK (platform_type IN ('agency', 'enterprise_srm', 'gov_platform')),

  rendering_type    VARCHAR(20)   NOT NULL DEFAULT 'static'
    CHECK (rendering_type IN ('static', 'dynamic_api', 'spa_headless')),

  supplier_vendor   VARCHAR(50)   DEFAULT 'unknown',
  anti_bot_level    VARCHAR(20)   DEFAULT 'none'
    CHECK (anti_bot_level IN ('none', 'low', 'medium', 'high')),

  waf_provider      VARCHAR(30)   DEFAULT 'none',
  auth_required     BOOLEAN       DEFAULT FALSE,
  auth_config       JSONB,

  -- === AI 引导字段 ===
  extraction_prompt TEXT,
  prompt_version    INT           DEFAULT 1,
  is_active         BOOLEAN       DEFAULT TRUE,

  created_at        TIMESTAMPTZ   DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   DEFAULT NOW()
);

COMMENT ON TABLE  platform_source IS '招标平台源信息及技术画像表';
COMMENT ON COLUMN platform_source.extraction_prompt IS '针对该平台的定制化AI提取提示词(Prompt)';
COMMENT ON COLUMN platform_source.prompt_version IS '提示词版本号，迭代时递增';


-- ============================================================
-- 2. 平台提示词历史表 (platform_prompt_history)
--    追溯每次 prompt 变更，方便回滚与 A/B 对比
-- ============================================================
CREATE TABLE platform_prompt_history (
  id            SERIAL PRIMARY KEY,
  platform_id   INT           NOT NULL REFERENCES platform_source(id) ON DELETE CASCADE,
  version       INT           NOT NULL,
  prompt_text   TEXT          NOT NULL,
  change_note   VARCHAR(500),
  created_at    TIMESTAMPTZ   DEFAULT NOW(),

  UNIQUE (platform_id, version)
);

COMMENT ON TABLE platform_prompt_history IS '平台提取提示词版本历史';


-- ============================================================
-- 3. 招投标公告数据表 (bidding_notice)
-- ============================================================
CREATE TABLE bidding_notice (
  id                BIGSERIAL PRIMARY KEY,
  platform_id       INT           NOT NULL REFERENCES platform_source(id),
  source_unique_id  VARCHAR(100)  NOT NULL,
  title             VARCHAR(500)  NOT NULL,
  notice_type       VARCHAR(30)   NOT NULL
    CHECK (notice_type IN ('tender', 'change', 'candidate', 'result')),

  city              VARCHAR(30)   DEFAULT '广东省',
  publish_date      DATE          NOT NULL,
  end_date          TIMESTAMPTZ,
  budget_amount     DECIMAL(18,2) DEFAULT 0.00,
  source_url        TEXT          NOT NULL,

  -- === AI 核心字段 ===
  cleaned_content   TEXT,
  notice_summary    VARCHAR(1000),
  ai_status         SMALLINT      DEFAULT 0,
  ai_error          TEXT,

  notice_content    TEXT          NOT NULL,

  created_at        TIMESTAMPTZ   DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   DEFAULT NOW(),

  UNIQUE (platform_id, source_unique_id)
);

COMMENT ON TABLE  bidding_notice IS '招投标公告 AI 友好清洗数据表';
COMMENT ON COLUMN bidding_notice.cleaned_content IS '【AI消费】去除HTML噪声后的核心干净文本';
COMMENT ON COLUMN bidding_notice.notice_summary  IS '【AI生成】LLM自动生成的精炼商机摘要';
COMMENT ON COLUMN bidding_notice.ai_status       IS 'AI处理状态: 0-待处理, 1-已清洗, 2-已摘要, 3-已打标, 4-全部完成, -1-噪声, -2-处理失败';
COMMENT ON COLUMN bidding_notice.ai_error        IS 'AI 处理失败时的错误信息';

-- 索引: 流水线批量捞取未处理数据
CREATE INDEX idx_notice_ai_status_date
  ON bidding_notice (ai_status, publish_date);

-- 索引: 复合筛选
CREATE INDEX idx_notice_filter_composite
  ON bidding_notice (publish_date, city, notice_type);

-- 全文搜索: title + notice_summary (中文用 pg_trgm)
CREATE INDEX idx_notice_title_trgm
  ON bidding_notice USING gin (title gin_trgm_ops);

CREATE INDEX idx_notice_summary_trgm
  ON bidding_notice USING gin (notice_summary gin_trgm_ops);


-- ============================================================
-- 4. AI 结构化标签表 (notice_tag)
--    将 ai_tags JSON 拆成行级记录，支持高效 B-Tree 查询
-- ============================================================
CREATE TABLE notice_tag (
  id          BIGSERIAL PRIMARY KEY,
  notice_id   BIGINT        NOT NULL REFERENCES bidding_notice(id) ON DELETE CASCADE,
  tag_type    VARCHAR(50)   NOT NULL,   -- 如 tech_keyword, qualification, competitor, industry
  tag_value   VARCHAR(200)  NOT NULL,
  created_at  TIMESTAMPTZ   DEFAULT NOW()
);

COMMENT ON TABLE notice_tag IS '公告AI标签（结构化行存储），从ai_tags JSON展开';

CREATE INDEX idx_tag_type_value
  ON notice_tag (tag_type, tag_value);

CREATE INDEX idx_tag_notice_id
  ON notice_tag (notice_id);


-- ============================================================
-- 5. 公告向量嵌入表 (notice_embedding)
--    用于 RAG 语义检索
-- ============================================================
CREATE TABLE notice_embedding (
  id              BIGSERIAL PRIMARY KEY,
  notice_id       BIGINT        NOT NULL REFERENCES bidding_notice(id) ON DELETE CASCADE,
  embedding_model VARCHAR(50)   NOT NULL DEFAULT 'text-embedding-3-small',
  embedding       JSONB         NOT NULL,   -- 向量数组；生产环境可迁移到 pgvector
  chunk_index     SMALLINT      DEFAULT 0,
  chunk_text      TEXT,                      -- 该 chunk 的原文，方便调试
  created_at      TIMESTAMPTZ   DEFAULT NOW()
);

COMMENT ON TABLE notice_embedding IS '公告向量嵌入表，用于语义检索（RAG）';

CREATE INDEX idx_embedding_notice_id
  ON notice_embedding (notice_id);


-- ============================================================
-- 6. 自动更新 updated_at 触发器
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_platform_source_updated
  BEFORE UPDATE ON platform_source
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_bidding_notice_updated
  BEFORE UPDATE ON bidding_notice
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- 7. Row Level Security (RLS)
--    Supabase 默认启用 RLS，这里先建基础策略
-- ============================================================

-- 开启 RLS
ALTER TABLE platform_source       ENABLE ROW LEVEL SECURITY;
ALTER TABLE bidding_notice        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notice_tag            ENABLE ROW LEVEL SECURITY;
ALTER TABLE notice_embedding      ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_prompt_history ENABLE ROW LEVEL SECURITY;

-- 策略: service_role 拥有全部权限（后端 AI Pipeline 使用）
CREATE POLICY "service_role_all" ON platform_source
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all" ON bidding_notice
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all" ON notice_tag
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all" ON notice_embedding
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all" ON platform_prompt_history
  FOR ALL USING (auth.role() = 'service_role');

-- 策略: 已认证用户可读（前端查询使用）
CREATE POLICY "authenticated_read" ON platform_source
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_read" ON bidding_notice
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_read" ON notice_tag
  FOR SELECT USING (auth.role() = 'authenticated');
