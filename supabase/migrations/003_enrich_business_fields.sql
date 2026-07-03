-- ============================================================
-- 003_enrich_business_fields.sql
-- 补充业务字段 + 更多广东省平台种子数据 + WAF 补全
-- ============================================================

-- === DDL: 给 bidding_notice 补充业务字段 ===

ALTER TABLE bidding_notice
  ADD COLUMN region_scope VARCHAR(50) DEFAULT '广东省';

ALTER TABLE bidding_notice
  ADD COLUMN industry_type VARCHAR(50) DEFAULT 'other';

ALTER TABLE bidding_notice
  ADD COLUMN tender_agent VARCHAR(200);

ALTER TABLE bidding_notice
  ADD COLUMN tenderee VARCHAR(200);

COMMENT ON COLUMN bidding_notice.region_scope IS '覆盖地域范围：全省/广州市/深圳市等';
COMMENT ON COLUMN bidding_notice.industry_type IS '行业分类：IT信息化、建筑工程、医疗器械、车辆采购等';
COMMENT ON COLUMN bidding_notice.tender_agent IS '招标代理机构名称（企业自主招标时为空）';
COMMENT ON COLUMN bidding_notice.tenderee   IS '招标人/业主单位';

-- 给 region_scope 和 industry_type 加索引
CREATE INDEX idx_notice_region
  ON bidding_notice (region_scope);

CREATE INDEX idx_notice_industry
  ON bidding_notice (industry_type);


-- === DDL: 给 platform_source 补充字段 ===

ALTER TABLE platform_source
  ADD COLUMN region_scope VARCHAR(50) DEFAULT '广东省';

ALTER TABLE platform_source
  ADD COLUMN cron_expression VARCHAR(50) DEFAULT '0 */2 * * *';

COMMENT ON COLUMN platform_source.region_scope   IS '覆盖地域范围：全省/广州市/深圳市等';
COMMENT ON COLUMN platform_source.cron_expression IS '爬取定时Cron表达式，默认每2小时';


-- === WAF 补全: 加入 jiasule (加速乐) ===
-- 先删除旧约束，再加新的
ALTER TABLE platform_source
  DROP CONSTRAINT IF EXISTS platform_source_waf_provider_check;

ALTER TABLE platform_source
  ADD CONSTRAINT platform_source_waf_provider_check
  CHECK (waf_provider IN ('none', 'aliyun_dun', 'cloudflare', 'jiasule', 'custom_waf'));


-- === 种子数据: 补充广东省更多平台 ===

-- 综合国企阳光采购平台
INSERT INTO platform_source
  (platform_name, base_url, list_url, platform_type, rendering_type,
   supplier_vendor, anti_bot_level, waf_provider, auth_required,
   spider_strategy, spider_config, region_scope)
VALUES
  ('粤采易阳光采购平台',
   'https://www.gdyce.com',
   'https://www.gdyce.com/notice/list',
   'gov_platform', 'dynamic_api',
   'custom', 'low', 'none', FALSE,
   'api_json',
   '{"method": "GET", "note": "广东省属国企集中采购平台，信息量大，公开性好"}',
   '广东省'),

  ('广州国企阳光采购服务平台',
   'https://www.gzggzy.com',
   'https://www.gzggzy.com/notice/list',
   'gov_platform', 'dynamic_api',
   'custom', 'low', 'none', FALSE,
   'requests_plain',
   '{"method": "GET", "note": "广州市属国企集中招投标平台"}',
   '广州市'),

  ('深圳阳光采购平台',
   'https://ggzy.sz.gov.cn',
   'https://ggzy.sz.gov.cn/jyxx/zfcg/',
   'gov_platform', 'static',
   'custom', 'none', 'none', FALSE,
   'requests_plain',
   '{"method": "GET", "note": "深圳市属国企集中平台"}',
   '深圳市');


-- 更多代理机构
INSERT INTO platform_source
  (platform_name, base_url, list_url, platform_type, rendering_type,
   supplier_vendor, anti_bot_level, waf_provider, auth_required,
   spider_strategy, spider_config, region_scope)
VALUES
  ('广东广咨国际（广咨电子招投标交易平台）',
   'https://www.gzicc.com.cn',
   'https://www.gzicc.com.cn/notice/',
   'agency', 'dynamic_api',
   'custom', 'medium', 'none', FALSE,
   'requests_with_ja3',
   '{"method": "GET", "note": "上市咨询招标巨头，部分页面异步加载"}',
   '广东省'),

  ('诚E招电子采购交易平台',
   'https://www.cnezz.com',
   'https://www.cnezz.com/notice/',
   'agency', 'dynamic_api',
   'custom', 'medium', 'aliyun_dun', FALSE,
   'requests_with_ja3',
   '{"method": "POST", "tls_fingerprint": "chrome120", "note": "华南地区影响力大的代理机构，阿里云盾防护"}',
   '广东省'),

  ('南方招标与采购交易平台',
   'https://www.nfbidding.com',
   'https://www.nfbidding.com/notice/',
   'agency', 'dynamic_api',
   'custom', 'low', 'none', FALSE,
   'api_json',
   '{"method": "GET", "note": "南方地区招标代理平台"}',
   '广东省'),

  ('恒德易电子交易平台',
   'https://www.hdebid.com',
   'https://www.hdebid.com/notice/',
   'agency', 'dynamic_api',
   'custom', 'low', 'none', FALSE,
   'requests_plain',
   '{"method": "GET", "note": "广东本地代理机构平台"}',
   '广东省');


-- 能源/电力企业
INSERT INTO platform_source
  (platform_name, base_url, list_url, platform_type, rendering_type,
   supplier_vendor, anti_bot_level, waf_provider, auth_required,
   spider_strategy, spider_config, region_scope)
VALUES
  ('中国南方电网',
   'https://ec.csg.cn',
   'https://ec.csg.cn/portal/',
   'enterprise_srm', 'spa_headless',
   'custom', 'high', 'custom_waf', TRUE,
   'playwright_undetected',
   '{"note": "总部在广州，SPA架构+登录墙，需入库后Token访问", "token_location": "localStorage", "token_refresh": "manual"}',
   '广东省'),

  ('广东能源集团采购平台',
   'https://www.gdeg.com.cn',
   'https://www.gdeg.com.cn/procurement/',
   'enterprise_srm', 'dynamic_api',
   'custom', 'medium', 'none', TRUE,
   'api_with_token',
   '{"note": "省属能源国企，需登录后查看"}',
   '广东省');


-- 交通/城建企业
INSERT INTO platform_source
  (platform_name, base_url, list_url, platform_type, rendering_type,
   supplier_vendor, anti_bot_level, waf_provider, auth_required,
   spider_strategy, spider_config, region_scope)
VALUES
  ('广州地铁采购网',
   'https://proc.gzmtr.com',
   'https://proc.gzmtr.com/notice/',
   'enterprise_srm', 'dynamic_api',
   'custom', 'medium', 'none', TRUE,
   'api_with_token',
   '{"note": "广州地铁招标采购平台，需注册供应商"}',
   '广州市'),

  ('深圳地铁采购系统',
   'https://proc.szmc.net',
   'https://proc.szmc.net/notice/',
   'enterprise_srm', 'dynamic_api',
   'custom', 'medium', 'none', TRUE,
   'api_with_token',
   '{"note": "深圳地铁招标采购平台，需注册供应商"}',
   '深圳市');


-- 民营大厂 SRM 系统（深度轨道高价值目标）
INSERT INTO platform_source
  (platform_name, base_url, list_url, platform_type, rendering_type,
   supplier_vendor, anti_bot_level, waf_provider, auth_required,
   spider_strategy, spider_config, region_scope)
VALUES
  ('华为采购门户',
   'https://supplier.huawei.com',
   'https://supplier.huawei.com/supplier/',
   'enterprise_srm', 'spa_headless',
   'custom', 'high', 'custom_waf', TRUE,
   'playwright_undetected',
   '{"note": "SPA架构，认证极严，需通过华为供应商审核入库", "token_location": "cookie", "token_refresh": "manual"}',
   '深圳市'),

  ('比亚迪采购项目电子交易平台',
   'https://ep.byd.com',
   'https://ep.byd.com/portal/',
   'enterprise_srm', 'spa_headless',
   'custom', 'medium', 'custom_waf', TRUE,
   'api_with_token',
   '{"note": "React SPA，需注册供应商账号，Bearer Token认证", "token_location": "localStorage", "token_refresh": "manual"}',
   '深圳市'),

  ('腾讯采购网',
   'https://procurement.tencent.com',
   'https://procurement.tencent.com/notice/',
   'enterprise_srm', 'spa_headless',
   'custom', 'low', 'none', TRUE,
   'api_with_token',
   '{"note": "Vue SPA，反爬不严但认证极严，需入库后Token访问", "token_location": "cookie", "token_refresh": "manual"}',
   '深圳市'),

  ('美的集团供应链平台',
   'https://supplier.midea.com',
   'https://supplier.midea.com/portal/',
   'enterprise_srm', 'spa_headless',
   'custom', 'medium', 'none', TRUE,
   'api_with_token',
   '{"note": "React SPA，需供应商入库", "token_location": "localStorage", "token_refresh": "manual"}',
   '佛山市'),

  ('格力电器供应链平台',
   'https://supplier.gree.com',
   'https://supplier.gree.com/portal/',
   'enterprise_srm', 'spa_headless',
   'custom', 'medium', 'none', TRUE,
   'api_with_token',
   '{"note": "需供应商入库，Token认证", "token_location": "cookie", "token_refresh": "manual"}',
   '珠海市');


-- 补充行业分类索引到 bidding_notice
CREATE INDEX IF NOT EXISTS idx_notice_industry_type
  ON bidding_notice (industry_type);
