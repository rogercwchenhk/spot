-- ============================================================
-- 023_extend_scrapling_platforms.sql
-- 扩展 Scrapling 覆盖：千里马 + 中国采购与招标网
-- ============================================================

-- 1. 千里马招标网 (www.qianlima.com)
-- 首页混合布局：表格(8条) + 列表(86条)，直接匹配 a[href*='/bid-']
-- 日期在表格 td[3] 或列表 li > span 中
-- 注意：详情页有419反爬（人机验证），只抓列表页
UPDATE platform_source
SET
  list_url = 'https://www.qianlima.com',
  spider_strategy = 'requests_plain',
  extraction_selectors = '{
    "list_item": "a[href*=\"/bid-\"]",
    "link_base": "https://www.qianlima.com",
    "date_class": "span",
    "notice_type_keywords": {
      "tender": ["招标", "采购", "询价", "竞谈", "磋商"],
      "result": ["中标", "成交"],
      "candidate": ["候选"],
      "change": ["变更", "更正", "补充"]
    },
    "min_title_length": 5,
    "detail_page_note": "详情页有419反爬，暂不爬取详情"
  }',
  pagination_config = '{
    "type": "none",
    "note": "首页展示约94条，暂不翻页"
  }',
  detail_selectors = '{
    "note": "详情页有419人机验证，暂不支持"
  }'
WHERE base_url LIKE '%qianlima.com%';

-- 2. 中国采购与招标网 (www.chinabidding.com)
-- 首页 li.news-info-item 列表：a[title]=完整标题, span.time=日期
-- 链接格式：/bidDetail/*.html（招标公告）vs /infoDetail/*.html（新闻）
-- 日期格式：MM-DD
-- 注意：详情页是SPA壳，暂不爬取详情
UPDATE platform_source
SET
  list_url = 'https://www.chinabidding.com',
  spider_strategy = 'requests_plain',
  extraction_selectors = '{
    "list_item": "li.news-info-item",
    "title_selector": "a[title]",
    "link_selector": "a",
    "date_selector": "span.time",
    "link_base": "https://www.chinabidding.com",
    "link_pattern": "/bidDetail/",
    "date_format": "MM-DD",
    "notice_type_keywords": {
      "tender": ["招标", "采购", "询价", "竞谈", "磋商"],
      "result": ["中标", "成交"],
      "candidate": ["候选"],
      "change": ["变更", "更正", "补充"]
    },
    "min_title_length": 10,
    "detail_page_note": "详情页是SPA壳，暂不爬取详情"
  }',
  pagination_config = '{
    "type": "none",
    "note": "首页展示约174条，暂不翻页"
  }',
  detail_selectors = '{
    "note": "详情页是SPA壳，暂不支持"
  }'
WHERE base_url LIKE '%chinabidding.com%';
