-- ============================================================
-- 004_expand_guangdong_platforms.sql
-- 扩展广东省招标代理机构 + 国企阳光采购 + 民企SRM + 聚合平台
-- ============================================================

-- ============================================================
-- 第一类补充：更多地市公共资源交易中心
-- ============================================================
INSERT INTO platform_source
  (platform_name, base_url, list_url, platform_type, rendering_type,
   supplier_vendor, anti_bot_level, waf_provider, auth_required,
   spider_strategy, spider_config, region_scope)
VALUES
  ('东莞市公共资源交易中心',
   'https://ggzy.dg.gov.cn',
   'https://ggzy.dg.gov.cn/jyxx/',
   'gov_platform', 'dynamic_api',
   'epoint', 'low', 'none', FALSE,
   'requests_post_xml',
   '{"method": "POST", "note": "新点软件系，共用模板"}',
   '东莞市'),

  ('中山市公共资源交易中心',
   'https://ggzy.zs.gov.cn',
   'https://ggzy.zs.gov.cn/jyxx/',
   'gov_platform', 'dynamic_api',
   'epoint', 'low', 'none', FALSE,
   'requests_post_xml',
   '{"method": "POST", "note": "新点软件系，共用模板"}',
   '中山市'),

  ('江门市公共资源交易中心',
   'https://ggzy.jiangmen.gov.cn',
   'https://ggzy.jiangmen.gov.cn/jyxx/',
   'gov_platform', 'dynamic_api',
   'epoint', 'low', 'none', FALSE,
   'requests_post_xml',
   '{"method": "POST", "note": "新点软件系，共用模板"}',
   '江门市'),

  ('湛江市公共资源交易中心',
   'https://ggzy.zhanjiang.gov.cn',
   'https://ggzy.zhanjiang.gov.cn/jyxx/',
   'gov_platform', 'dynamic_api',
   'epoint', 'low', 'none', FALSE,
   'requests_post_xml',
   '{"method": "POST", "note": "新点软件系，共用模板"}',
   '湛江市'),

  ('汕头市公共资源交易中心',
   'https://ggzy.shantou.gov.cn',
   'https://ggzy.shantou.gov.cn/jyxx/',
   'gov_platform', 'dynamic_api',
   'epoint', 'low', 'none', FALSE,
   'requests_post_xml',
   '{"method": "POST", "note": "新点软件系，共用模板"}',
   '汕头市'),

  ('茂名市公共资源交易中心',
   'https://ggzy.maoming.gov.cn',
   'https://ggzy.maoming.gov.cn/jyxx/',
   'gov_platform', 'dynamic_api',
   'epoint', 'low', 'none', FALSE,
   'requests_post_xml',
   '{"method": "POST", "note": "新点软件系，共用模板"}',
   '茂名市'),

  ('肇庆市公共资源交易中心',
   'https://ggzy.zhaoqing.gov.cn',
   'https://ggzy.zhaoqing.gov.cn/jyxx/',
   'gov_platform', 'dynamic_api',
   'epoint', 'low', 'none', FALSE,
   'requests_post_xml',
   '{"method": "POST", "note": "新点软件系，共用模板"}',
   '肇庆市'),

  ('揭阳市公共资源交易中心',
   'https://ggzy.jieyang.gov.cn',
   'https://ggzy.jieyang.gov.cn/jyxx/',
   'gov_platform', 'dynamic_api',
   'epoint', 'low', 'none', FALSE,
   'requests_post_xml',
   '{"method": "POST", "note": "新点软件系，共用模板"}',
   '揭阳市');


-- ============================================================
-- 第二类补充：更多招标代理机构
-- ============================================================
INSERT INTO platform_source
  (platform_name, base_url, list_url, platform_type, rendering_type,
   supplier_vendor, anti_bot_level, waf_provider, auth_required,
   spider_strategy, spider_config, region_scope)
VALUES
  ('广东华伦招标有限公司',
   'https://www.gdhualun.com',
   'https://www.gdhualun.com/notice/',
   'agency', 'static',
   'custom', 'low', 'none', FALSE,
   'requests_plain',
   '{"method": "GET", "note": "广东本地老牌代理机构，服务端渲染"}',
   '广东省'),

  ('广东远东招标代理有限公司',
   'https://www.gdydzl.com',
   'https://www.gdydzl.com/notice/',
   'agency', 'static',
   'custom', 'low', 'none', FALSE,
   'requests_plain',
   '{"method": "GET", "note": "广东本地代理机构"}',
   '广东省'),

  ('广东省国际工程咨询有限公司',
   'https://www.gdiec.com',
   'https://www.gdiec.com/notice/',
   'agency', 'dynamic_api',
   'custom', 'low', 'none', FALSE,
   'requests_plain',
   '{"method": "GET", "note": "省属咨询招标机构"}',
   '广东省'),

  ('广东建设工程招标有限公司',
   'https://www.gdjsgczb.com',
   'https://www.gdjsgczb.com/notice/',
   'agency', 'static',
   'custom', 'low', 'none', FALSE,
   'requests_plain',
   '{"method": "GET", "note": "建筑工程领域专业代理"}',
   '广东省'),

  ('广东志正招标有限公司',
   'https://www.gdzzzb.com',
   'https://www.gdzzzb.com/notice/',
   'agency', 'static',
   'custom', 'low', 'none', FALSE,
   'requests_plain',
   '{"method": "GET", "note": "广东本地代理机构"}',
   '广东省'),

  ('广州建筑工程监理有限公司',
   'https://www.gzjgjl.com',
   'https://www.gzjgjl.com/notice/',
   'agency', 'static',
   'custom', 'low', 'none', FALSE,
   'requests_plain',
   '{"method": "GET", "note": "广州本地建筑领域代理"}',
   '广州市'),

  ('深圳市国际招标有限公司',
   'https://www.sztc.com',
   'https://www.sztc.com/notice/',
   'agency', 'dynamic_api',
   'custom', 'medium', 'none', FALSE,
   'requests_with_ja3',
   '{"method": "GET", "note": "深圳本地大型代理机构"}',
   '深圳市'),

  ('广东省政府采购中心',
   'https://www.gdgpo.com',
   'https://www.gdgpo.com/notice/',
   'gov_platform', 'dynamic_api',
   'custom', 'low', 'none', FALSE,
   'api_json',
   '{"method": "GET", "note": "省级政府采购中心，公开API"}',
   '广东省');


-- ============================================================
-- 第三类补充：更多省属国企阳光采购平台
-- ============================================================
INSERT INTO platform_source
  (platform_name, base_url, list_url, platform_type, rendering_type,
   supplier_vendor, anti_bot_level, waf_provider, auth_required,
   spider_strategy, spider_config, region_scope)
VALUES
  ('广东省交通集团采购平台',
   'https://proc.gdcp.cn',
   'https://proc.gdcp.cn/notice/',
   'enterprise_srm', 'dynamic_api',
   'custom', 'medium', 'none', TRUE,
   'api_with_token',
   '{"note": "省属交通国企，需注册供应商"}',
   '广东省'),

  ('广东省建工集团采购平台',
   'https://proc.gdcg.com',
   'https://proc.gdcg.com/notice/',
   'enterprise_srm', 'dynamic_api',
   'custom', 'medium', 'none', TRUE,
   'api_with_token',
   '{"note": "省属建筑国企，需注册供应商"}',
   '广东省'),

  ('广东省广新控股集团采购平台',
   'https://proc.gdxhkg.com',
   'https://proc.gdxhkg.com/notice/',
   'enterprise_srm', 'dynamic_api',
   'custom', 'low', 'none', TRUE,
   'api_with_token',
   '{"note": "省属综合国企集团"}',
   '广东省'),

  ('广东省粤海控股集团采购平台',
   'https://proc.gdyhkg.com',
   'https://proc.gdyhkg.com/notice/',
   'enterprise_srm', 'dynamic_api',
   'custom', 'low', 'none', TRUE,
   'api_with_token',
   '{"note": "省属综合国企集团"}',
   '广东省'),

  ('广东省恒健投资控股采购平台',
   'https://proc.gdhjtz.com',
   'https://proc.gdhjtz.com/notice/',
   'enterprise_srm', 'dynamic_api',
   'custom', 'low', 'none', TRUE,
   'api_with_token',
   '{"note": "省属投资控股平台"}',
   '广东省'),

  ('广州汽车集团（广汽）采购平台',
   'https://proc.gac.com.cn',
   'https://proc.gac.com.cn/notice/',
   'enterprise_srm', 'spa_headless',
   'custom', 'medium', 'none', TRUE,
   'api_with_token',
   '{"note": "广州市属汽车国企，React SPA"}',
   '广州市'),

  ('深圳市投资控股有限公司采购平台',
   'https://proc.sztkg.com',
   'https://proc.sztkg.com/notice/',
   'enterprise_srm', 'dynamic_api',
   'custom', 'low', 'none', TRUE,
   'api_with_token',
   '{"note": "深圳市属投资控股平台"}',
   '深圳市');


-- ============================================================
-- 第三类补充：更多民企大厂 SRM
-- ============================================================
INSERT INTO platform_source
  (platform_name, base_url, list_url, platform_type, rendering_type,
   supplier_vendor, anti_bot_level, waf_provider, auth_required,
   spider_strategy, spider_config, region_scope)
VALUES
  ('大疆创新采购门户',
   'https://supplier.dji.com',
   'https://supplier.dji.com/portal/',
   'enterprise_srm', 'spa_headless',
   'custom', 'medium', 'none', TRUE,
   'api_with_token',
   '{"note": "深圳民企，React SPA，需供应商入库", "token_location": "localStorage", "token_refresh": "manual"}',
   '深圳市'),

  ('中兴通讯采购平台',
   'https://proc.zte.com.cn',
   'https://proc.zte.com.cn/notice/',
   'enterprise_srm', 'spa_headless',
   'custom', 'medium', 'custom_waf', TRUE,
   'api_with_token',
   '{"note": "深圳民企，需注册供应商", "token_location": "cookie", "token_refresh": "manual"}',
   '深圳市'),

  ('TCL采购平台',
   'https://proc.tcl.com',
   'https://proc.tcl.com/notice/',
   'enterprise_srm', 'spa_headless',
   'custom', 'low', 'none', TRUE,
   'api_with_token',
   '{"note": "惠州民企，需供应商入库", "token_location": "localStorage", "token_refresh": "manual"}',
   '惠州市'),

  ('万科采筑平台',
   'https://www.caiwoo.com',
   'https://www.caiwoo.com/notice/',
   'enterprise_srm', 'dynamic_api',
   'custom', 'medium', 'none', TRUE,
   'api_with_token',
   '{"note": "万科旗下建材采购平台，面向供应商开放", "token_location": "cookie", "token_refresh": "manual"}',
   '深圳市');


-- ============================================================
-- 第四类补充：更多第三方聚合平台
-- ============================================================
INSERT INTO platform_source
  (platform_name, base_url, list_url, platform_type, rendering_type,
   supplier_vendor, anti_bot_level, waf_provider, auth_required,
   spider_strategy, spider_config, region_scope)
VALUES
  ('中国采购与招标网',
   'https://www.chinabidding.com',
   'https://www.chinabidding.com/search/',
   'gov_platform', 'dynamic_api',
   'custom', 'medium', 'none', FALSE,
   'requests_with_ja3',
   '{"method": "GET", "note": "老牌聚合平台，有反爬频率限制"}',
   '全国'),

  ('中国招标网',
   'https://www.zbcg.cn',
   'https://www.zbcg.cn/search/',
   'gov_platform', 'dynamic_api',
   'custom', 'low', 'none', FALSE,
   'api_json',
   '{"method": "GET", "note": "综合招标信息聚合平台"}',
   '全国'),

  ('标讯快车',
   'https://www.biaoxunkuaiche.com',
   'https://www.biaoxunkuaiche.com/search/',
   'gov_platform', 'dynamic_api',
   'custom', 'low', 'none', FALSE,
   'requests_plain',
   '{"method": "GET", "note": "招标信息聚合平台"}',
   '全国'),

  ('招标信息网',
   'https://www.bidnews.cn',
   'https://www.bidnews.cn/search/',
   'gov_platform', 'dynamic_api',
   'custom', 'low', 'none', FALSE,
   'requests_plain',
   '{"method": "GET", "note": "招标信息聚合平台"}',
   '全国'),

  ('比地招标网',
   'https://www.bidizhaobiao.com',
   'https://www.bidizhaobiao.com/search/',
   'gov_platform', 'dynamic_api',
   'custom', 'low', 'none', FALSE,
   'requests_plain',
   '{"method": "GET", "note": "招标信息聚合平台"}',
   '全国');


-- ============================================================
-- 验证：统计各类型平台数量
-- ============================================================
-- SELECT platform_type, COUNT(*) FROM platform_source GROUP BY platform_type;
