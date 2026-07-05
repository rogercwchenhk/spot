-- ============================================================
-- 022_dual_source_ingestion.sql
-- 双数据源采集架构：Scrapling 内部爬虫 + 知了 API 外部数据源
-- ============================================================

-- ============================================================
-- 1. crawl_run 采集运行记录表
-- ============================================================
CREATE TABLE crawl_run (
  id              BIGSERIAL PRIMARY KEY,
  platform_id     INT           REFERENCES platform_source(id) ON DELETE SET NULL,
  data_source     VARCHAR(20)   NOT NULL
    CHECK (data_source IN ('zhiliao', 'scrapling')),

  status          VARCHAR(20)   NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'success', 'partial', 'failed', 'cancelled')),

  -- 采集统计
  pages_crawled   INT           DEFAULT 0,
  items_found     INT           DEFAULT 0,
  items_inserted  INT           DEFAULT 0,
  items_skipped   INT           DEFAULT 0,  -- 去重跳过
  items_failed    INT           DEFAULT 0,

  -- 执行信息
  spider_strategy VARCHAR(50),              -- 实际使用的爬虫策略
  error_message   TEXT,
  duration_ms     INT,

  -- 调度信息
  trigger_type    VARCHAR(20)   DEFAULT 'manual'
    CHECK (trigger_type IN ('manual', 'scheduled', 'api')),
  keyword_group   VARCHAR(100),             -- 命中的关键词组名

  started_at      TIMESTAMPTZ   DEFAULT NOW(),
  finished_at     TIMESTAMPTZ
);

COMMENT ON TABLE crawl_run IS '采集运行记录，追踪每次采集任务的状态和统计';
COMMENT ON COLUMN crawl_run.data_source IS '数据来源: zhiliao=知了API, scrapling=内部爬虫';
COMMENT ON COLUMN crawl_run.trigger_type IS '触发方式: manual=手动, scheduled=定时, api=API调用';

CREATE INDEX idx_crawl_run_platform ON crawl_run (platform_id, started_at DESC);
CREATE INDEX idx_crawl_run_status ON crawl_run (status, started_at DESC);
CREATE INDEX idx_crawl_run_source ON crawl_run (data_source, started_at DESC);


-- ============================================================
-- 2. platform_source 新增 Scrapling 采集配置字段
-- ============================================================

-- 列表页 CSS 选择器配置
ALTER TABLE platform_source
  ADD COLUMN extraction_selectors JSONB;

COMMENT ON COLUMN platform_source.extraction_selectors IS
  'Scrapling CSS 选择器配置: {list_item, title, link, date, budget, notice_type}';

-- 翻页配置
ALTER TABLE platform_source
  ADD COLUMN pagination_config JSONB;

COMMENT ON COLUMN platform_source.pagination_config IS
  '翻页配置: {type: url_param|next_link|api_offset, param, start, max_pages}';

-- 详情页选择器
ALTER TABLE platform_source
  ADD COLUMN detail_selectors JSONB;

COMMENT ON COLUMN platform_source.detail_selectors IS
  '详情页 CSS 选择器: {content, attachments, publish_date, budget, end_date}';


-- ============================================================
-- 3. system_config 数据源路由配置
-- ============================================================
INSERT INTO system_config (key, value, description) VALUES
  ('datasource.mode', '"external"', '数据源模式: external=仅知了API, internal=仅Scrapling, hybrid=混合'),
  ('datasource.scrapling.enabled', 'false', 'Scrapling 内部爬虫开关'),
  ('datasource.scrapling.concurrency', '5', 'Scrapling 最大并发爬取数'),
  ('datasource.scrapling.daily_limit', '500', 'Scrapling 每日最大爬取页数'),
  ('datasource.scrapling.delay_ms', '2000', 'Scrapling 请求间隔(毫秒)'),
  ('datasource.scrapling.timeout_ms', '30000', 'Scrapling 单页超时(毫秒)'),
  ('datasource.zhiliao.enabled', 'true', '知了 API 外部数据源开关')
ON CONFLICT (key) DO NOTHING;


-- ============================================================
-- 4. 种子数据: ccgp.gov.cn 选择器配置（首个 Scrapling 平台）
-- ============================================================
UPDATE platform_source
SET
  extraction_selectors = '{
    "list_container": "ul",
    "list_item": "li a",
    "title": "::text",
    "link": "::attr(href)",
    "link_base": "http://www.ccgp.gov.cn",
    "date_pattern": "(\\d{4})[\\-/年](\\d{1,2})[\\-/月](\\d{1,2})",
    "budget_pattern": "(?:预算|金额)[：:]*\\s*([\\d,.]+)\\s*(?:万?元)",
    "notice_type_keywords": {
      "tender": ["招标公告", "采购公告", "公开招标"],
      "result": ["中标公告", "成交公告", "中标结果"],
      "candidate": ["中标候选", "候选公示"],
      "change": ["变更公告", "更正公告", "补充公告"]
    },
    "min_title_length": 10
  }',
  pagination_config = '{
    "type": "url_param",
    "base_url": "http://www.ccgp.gov.cn/cggg/dfgg/gkzb/index_{page}.htm",
    "start": 1,
    "max_pages": 10,
    "note": "首页无后缀，第2页起 index_2.htm"
  }',
  detail_selectors = $${
    "content": ".vF_detail_content, .detail-content, #detail, .content",
    "title": "h2, h1, .title",
    "publish_date": ".pubdate, .date, .time",
    "attachments": "a[href$='.pdf'], a[href$='.doc'], a[href$='.docx'], a[href$='.zip']"
  }$$
WHERE base_url LIKE '%ccgp.gov.cn%';


-- ============================================================
-- 5. 种子数据: epoint 系公共资源交易中心选择器模板
--    8个地市共用同一套选择器（新点软件系）
-- ============================================================
UPDATE platform_source
SET
  extraction_selectors = '{
    "list_container": ".ewb-list, .list-box, .news-list",
    "list_item": "li a, .list-item a",
    "title": "::text",
    "link": "::attr(href)",
    "date_class": ".date, .time, .ewb-list-date",
    "notice_type_keywords": {
      "tender": ["招标公告", "采购公告"],
      "result": ["中标公告", "成交公告"],
      "candidate": ["中标候选"],
      "change": ["变更", "更正", "补充"]
    }
  }',
  pagination_config = '{
    "type": "api_offset",
    "note": "新点软件系多为 POST + JSON API，需分析接口"
  }',
  detail_selectors = $${
    "content": ".ewb-detail, .detail-content, .article-content",
    "title": "h1, h2, .title",
    "publish_date": ".date, .pub-time",
    "attachments": "a[href$='.pdf'], a[href$='.doc'], a[href$='.zip']"
  }$$
WHERE supplier_vendor = 'epoint';


-- ============================================================
-- 6. RLS 策略
-- ============================================================
ALTER TABLE crawl_run ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON crawl_run
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "authenticated_read" ON crawl_run
  FOR SELECT USING (auth.role() = 'authenticated');


-- ============================================================
-- 7. 验证查询
-- ============================================================
-- SELECT platform_name, spider_strategy,
--        extraction_selectors IS NOT NULL AS has_selectors,
--        pagination_config IS NOT NULL AS has_pagination
-- FROM platform_source
-- WHERE extraction_selectors IS NOT NULL
-- ORDER BY platform_name;
