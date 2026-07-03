-- ============================================================
-- 002_platform_tech_profile.sql
-- 给 platform_source 增加爬虫策略字段 + 广东省主流平台种子数据
-- ============================================================

-- === DDL: 新增爬虫策略相关字段 ===

ALTER TABLE platform_source
  ADD COLUMN spider_strategy VARCHAR(50) NOT NULL DEFAULT 'auto'
    CHECK (spider_strategy IN (
      'auto',                    -- 根据 rendering_type 自动选择
      'requests_plain',          -- requests + BeautifulSoup，最轻量
      'requests_post_xml',       -- 新点软件系：POST + XML/JSON 解析
      'requests_with_ja3',       -- curl_cffi / cloudscraper 模拟 TLS 指纹
      'playwright_headless',     -- Playwright 无头浏览器
      'playwright_undetected',   -- Playwright + 反检测补丁
      'api_json',                -- 直接调 JSON API
      'api_with_token'           -- 带 Bearer Token 的 API 调用
    ));

ALTER TABLE platform_source
  ADD COLUMN spider_config JSONB;

COMMENT ON COLUMN platform_source.spider_strategy IS '爬虫策略标识，调度器根据此字段分发给对应的爬虫核心';
COMMENT ON COLUMN platform_source.spider_config   IS '爬虫详细配置：headers模板、翻页参数、加密JS路径、Token刷新规则等';


-- === 种子数据：广东省主流招投标平台技术画像 ===

-- 第一类：政府公共资源交易/政采平台
INSERT INTO platform_source
  (platform_name, base_url, list_url, platform_type, rendering_type,
   supplier_vendor, anti_bot_level, waf_provider, auth_required,
   spider_strategy, spider_config)
VALUES
  ('广东省政府采购网',
   'https://gdgpo.czt.gd.gov.cn',
   'https://gdgpo.czt.gd.gov.cn/freecms/rest/v1/notice/selectInfoMoreChannel.do',
   'gov_platform', 'dynamic_api',
   'custom', 'low', 'none', FALSE,
   'api_json',
   '{"method": "POST", "params": {"page": 1, "pageSize": 20}, "note": "公开API，翻页用page参数"}'),

  ('广州公共资源交易中心',
   'https://www.gzggzy.cn',
   'https://www.gzggzy.cn/jyxx/list.html',
   'gov_platform', 'dynamic_api',
   'custom', 'low', 'none', FALSE,
   'requests_plain',
   '{"method": "GET", "note": "静态列表页，翻页通过URL参数"}'),

  ('深圳市公共资源交易中心',
   'https://ggzy.sz.gov.cn',
   'https://ggzy.sz.gov.cn/jyxx/zfcg/cggg/',
   'gov_platform', 'static',
   'custom', 'none', 'none', FALSE,
   'requests_plain',
   '{"method": "GET", "note": "服务端渲染，直接抓HTML"}');


-- 第二类：招标代理机构网站
INSERT INTO platform_source
  (platform_name, base_url, list_url, platform_type, rendering_type,
   supplier_vendor, anti_bot_level, waf_provider, auth_required,
   spider_strategy, spider_config)
VALUES
  ('国e平台（广东省机电设备招标中心）',
   'https://e.gdebidding.com',
   'https://e.gdebidding.com/ebidding/commonInfoController/queryCommonInfoList',
   'agency', 'dynamic_api',
   'custom', 'medium', 'aliyun_dun', FALSE,
   'requests_with_ja3',
   '{"method": "POST", "tls_fingerprint": "chrome120", "note": "阿里云盾防护，需模拟JA3指纹"}'),

  ('国信招标集团',
   'https://www.gtc.com',
   'https://www.gtc.com/notice/list.html',
   'agency', 'static',
   'custom', 'low', 'none', FALSE,
   'requests_plain',
   '{"method": "GET", "note": "服务端渲染，翻页用URL参数pageNo"}'),

  ('中化商务有限公司',
   'https://www.sinochembidding.com',
   'https://www.sinochembidding.com/notice/list',
   'agency', 'dynamic_api',
   'custom', 'medium', 'cloudflare', FALSE,
   'requests_with_ja3',
   '{"method": "GET", "tls_fingerprint": "chrome120", "note": "Cloudflare防护，需curl_cffi或cloudscraper"}');


-- 第三类：企业自主招标/采购平台（深度轨道重点）
INSERT INTO platform_source
  (platform_name, base_url, list_url, platform_type, rendering_type,
   supplier_vendor, anti_bot_level, waf_provider, auth_required,
   spider_strategy, spider_config)
VALUES
  ('国家电网电子商务平台',
   'https://ecp.sgcc.com.cn',
   'https://ecp.sgcc.com.cn/ecp2.0/portal/',
   'enterprise_srm', 'spa_headless',
   'custom', 'high', 'custom_waf', TRUE,
   'playwright_undetected',
   '{"note": "SPA架构+登录墙+自研WAF，需入库后用Token访问", "token_location": "localStorage", "token_key": "access_token", "token_refresh": "manual"}'),

  ('中国石油电子招标投标交易平台',
   'https://www.cnpcbidding.com',
   'https://www.cnpcbidding.com/ebid/',
   'enterprise_srm', 'spa_headless',
   'custom', 'high', 'custom_waf', TRUE,
   'playwright_undetected',
   '{"note": "需供应商入库审核，登录后Token访问", "token_location": "cookie", "token_refresh": "manual"}'),

  ('中煤招标网',
   'https://www.zmzb.com',
   'https://www.zmzb.com/notice/',
   'enterprise_srm', 'dynamic_api',
   'custom', 'medium', 'none', TRUE,
   'api_with_token',
   '{"note": "API+Token认证，登录后可直接调接口"}');


-- 第四类：第三方聚合平台
INSERT INTO platform_source
  (platform_name, base_url, list_url, platform_type, rendering_type,
   supplier_vendor, anti_bot_level, waf_provider, auth_required,
   spider_strategy, spider_config)
VALUES
  ('千里马招标网',
   'https://www.qianlima.com',
   'https://www.qianlima.com/zb/search',
   'gov_platform', 'dynamic_api',
   'custom', 'medium', 'none', FALSE,
   'requests_with_ja3',
   '{"method": "GET", "note": "有反爬频率限制，需控制QPS"}'),

  ('剑鱼招标网',
   'https://www.jianyu360.com',
   'https://www.jianyu360.com/search',
   'gov_platform', 'dynamic_api',
   'custom', 'low', 'none', FALSE,
   'api_json',
   '{"method": "GET", "note": "有公开搜索API"}');


-- 新点软件系平台模板（广东省多地市公共资源交易中心共用）
-- 这些平台由同一家供应商开发，接口结构几乎一模一样
INSERT INTO platform_source
  (platform_name, base_url, list_url, platform_type, rendering_type,
   supplier_vendor, anti_bot_level, waf_provider, auth_required,
   spider_strategy, spider_config)
VALUES
  ('新点软件系-佛山市公共资源交易中心',
   'https://ggzy.foshan.gov.cn',
   'https://ggzy.foshan.gov.cn/jyxx/queryListData.html',
   'gov_platform', 'dynamic_api',
   'epoint', 'low', 'none', FALSE,
   'requests_post_xml',
   '{"method": "POST", "content_type": "application/x-www-form-urlencoded", "params": {"pageNo": 1, "pageSize": 15}, "note": "新点软件标准接口，POST翻页，参数含viewstate"}'),

  ('新点软件系-珠海市公共资源交易中心',
   'https://ggzy.zhuhai.gov.cn',
   'https://ggzy.zhuhai.gov.cn/jyxx/queryListData.html',
   'gov_platform', 'dynamic_api',
   'epoint', 'low', 'none', FALSE,
   'requests_post_xml',
   '{"method": "POST", "content_type": "application/x-www-form-urlencoded", "params": {"pageNo": 1, "pageSize": 15}, "note": "与佛山同系，共用爬虫模板"}'),

  ('新点软件系-惠州市公共资源交易中心',
   'https://ggzy.huizhou.gov.cn',
   'https://ggzy.huizhou.gov.cn/jyxx/queryListData.html',
   'gov_platform', 'dynamic_api',
   'epoint', 'low', 'none', FALSE,
   'requests_post_xml',
   '{"method": "POST", "content_type": "application/x-www-form-urlencoded", "params": {"pageNo": 1, "pageSize": 15}, "note": "与佛山同系，共用爬虫模板"}');
