#!/usr/bin/env python3
"""
Scrapling 爬虫引擎 — 客户雷达内部采集核心
从 platform_source 配置读取选择器，爬取招标列表页，输出结构化 JSON。

用法:
  python3 scrapling_engine.py --platform '{"id":1,"list_url":"...","spider_strategy":"requests_plain","extraction_selectors":{...},"pagination_config":{...}}'
  python3 scrapling_engine.py --detail --url "http://..." --selectors '{"content":".detail","title":"h1"}'
  echo '{"platform":{...}}' | python3 scrapling_engine.py --stdin

输出: JSON 到 stdout（供 Node.js 读取）
日志: 文本到 stderr（不影响 JSON 解析）
"""

import sys
import json
import time
import hashlib
import argparse
import re
from datetime import datetime


def log(msg):
    """日志输出到 stderr，不污染 stdout JSON"""
    print(f"[scrapling] {msg}", file=sys.stderr, flush=True)


def get_fetcher(strategy):
    """根据 spider_strategy 返回对应的 Scrapling fetcher 函数"""
    if strategy in ('requests_plain', 'api_json'):
        from scrapling.fetchers import Fetcher
        return lambda url: Fetcher.get(url, stealthy_headers=True, timeout=30)

    elif strategy == 'requests_with_ja3':
        from scrapling.fetchers import Fetcher
        return lambda url: Fetcher.get(url, impersonate='chrome', stealthy_headers=True, timeout=30)

    elif strategy == 'requests_post_xml':
        from scrapling.fetchers import Fetcher
        return lambda url, body=None: Fetcher.post(url, data=body, impersonate='chrome', timeout=30)

    elif strategy == 'playwright_headless':
        from scrapling.fetchers import DynamicFetcher
        return lambda url: DynamicFetcher.fetch(url, headless=True, network_idle=True, timeout=30000)

    elif strategy == 'playwright_undetected':
        from scrapling.fetchers import StealthyFetcher
        return lambda url: StealthyFetcher.fetch(url, headless=True, network_idle=True, timeout=30000)

    else:
        # Fallback: try plain HTTP first
        log(f"Unknown strategy '{strategy}', falling back to requests_plain")
        from scrapling.fetchers import Fetcher
        return lambda url: Fetcher.get(url, stealthy_headers=True, timeout=30)


def classify_notice_type(title, keywords_map):
    """根据标题关键词判断公告类型"""
    if not keywords_map:
        return 'tender'
    for notice_type, keywords in keywords_map.items():
        for kw in keywords:
            if kw in title:
                return notice_type
    return 'tender'


def extract_budget(text, pattern=None):
    """从文本中提取预算金额（万元→元）"""
    if not text:
        return 0
    if not pattern:
        pattern = r'(?:预算|金额|预算金额)[：:]*\s*([\d,.]+)\s*(万?元)'
    match = re.search(pattern, text)
    if not match:
        return 0
    amount_str = match.group(1).replace(',', '')
    try:
        amount = float(amount_str)
        if '万' in match.group(0):
            amount *= 10000
        return amount
    except ValueError:
        return 0


def extract_date(text, pattern=None):
    """从文本中提取日期"""
    if not text:
        return None
    if not pattern:
        pattern = r'(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})'
    match = re.search(pattern, text)
    if match:
        y, m, d = match.groups()
        return f"{y}-{int(m):02d}-{int(d):02d}"
    return None


def generate_source_id(url, title):
    """生成 source_unique_id: URL hash 或标题 hash"""
    if url:
        return hashlib.md5(url.encode()).hexdigest()[:16]
    return hashlib.md5(title.encode()).hexdigest()[:16]


def crawl_listing_page(platform):
    """
    爬取单个平台的列表页，提取招标公告列表。
    
    Args:
        platform: dict, 包含:
            - id: platform_source.id
            - list_url: 列表页 URL
            - spider_strategy: 爬虫策略
            - extraction_selectors: CSS 选择器配置
            - pagination_config: 翻页配置
            - region_scope: 地区范围
    
    Returns:
        dict: {items: [...], pages_crawled: int, errors: [...]}
    """
    strategy = platform.get('spider_strategy', 'requests_plain')
    selectors = platform.get('extraction_selectors', {})
    pagination = platform.get('pagination_config', {})
    list_url = platform.get('list_url', '')
    region = platform.get('region_scope', '广东省')

    if not list_url:
        return {'items': [], 'pages_crawled': 0, 'errors': ['No list_url']}

    fetcher = get_fetcher(strategy)
    all_items = []
    errors = []
    pages_crawled = 0

    # 确定要爬取的页面列表
    urls_to_crawl = [list_url]
    pag_type = pagination.get('type', 'none')

    if pag_type == 'url_param':
        base_url = pagination.get('base_url', list_url)
        start = pagination.get('start', 1)
        max_pages = pagination.get('max_pages', 5)
        # 首页
        urls_to_crawl = [base_url if '{page}' not in base_url else base_url.replace('{page}', str(start))]
        # 后续页
        for p in range(start + 1, start + max_pages):
            if '{page}' in base_url:
                urls_to_crawl.append(base_url.replace('{page}', str(p)))
    elif pag_type == 'next_link':
        # 由爬取过程中动态发现
        pass
    # api_offset 和 dynamic_api 通常需要单独处理，先爬首页

    title_kw = selectors.get('notice_type_keywords', {})
    min_title_len = selectors.get('min_title_length', 10)

    for page_url in urls_to_crawl:
        try:
            log(f"Crawling: {page_url} (strategy={strategy})")
            start_time = time.time()
            page = fetcher(page_url)
            elapsed = time.time() - start_time
            log(f"  Fetched in {elapsed:.2f}s, status={page.status}")
            pages_crawled += 1

            if page.status != 200:
                errors.append(f"HTTP {page.status} on {page_url}")
                continue

            # 提取列表项
            list_sel = selectors.get('list_item', 'li a')
            links = page.css(list_sel)
            log(f"  Selector '{list_sel}': {len(links)} matches")

            link_base = selectors.get('link_base', '')
            for link in links:
                href = link.attrib.get('href', '')
                title_text = link.css('::text').get(default='').strip()

                if not title_text or len(title_text) < min_title_len:
                    continue

                # 构造完整 URL
                full_url = href
                if href and not href.startswith('http'):
                    if link_base:
                        from urllib.parse import urljoin
                        full_url = urljoin(link_base, href)
                    else:
                        full_url = href

                # 判断公告类型
                notice_type = classify_notice_type(title_text, title_kw)

                # 尝试提取日期（从同级或父元素）
                date_text = ''
                date_sel = selectors.get('date_class', '')
                if date_sel:
                    parent = link.parent
                    if parent:
                        date_el = parent.css(date_sel)
                        if date_el:
                            date_text = date_el.css('::text').get(default='')

                pub_date = extract_date(date_text) or datetime.now().strftime('%Y-%m-%d')

                # 预算（列表页通常没有，留空给详情页）
                budget = extract_budget(date_text)

                item = {
                    'source_unique_id': generate_source_id(full_url, title_text),
                    'title': title_text,
                    'notice_type': notice_type,
                    'source_url': full_url,
                    'publish_date': pub_date,
                    'budget_amount': budget,
                    'city': region,
                    'region_scope': region,
                    'data_source': 'scrapling',
                }
                all_items.append(item)

            # 动态翻页: 查找 "下一页" 链接
            if pag_type == 'next_link' and len(urls_to_crawl) <= pages_crawled:
                next_sel = pagination.get('next_selector', 'a:contains("下一页"), .next a, a.next')
                # 简单处理：查找含 "下一页" 的链接
                for a in page.css('a'):
                    a_text = a.css('::text').get(default='')
                    a_href = a.attrib.get('href', '')
                    if '下一页' in a_text or '下页' in a_text:
                        if a_href and a_href != '#':
                            if not a_href.startswith('http'):
                                a_href = f"{link_base}{a_href}" if link_base else a_href
                            urls_to_crawl.append(a_href)
                            break

            # 限速
            time.sleep(0.5)

        except Exception as e:
            error_msg = f"Error on {page_url}: {str(e)}"
            log(f"  ERROR: {error_msg}")
            errors.append(error_msg)

    return {
        'items': all_items,
        'pages_crawled': pages_crawled,
        'errors': errors,
    }


def crawl_detail_page(url, selectors, strategy='requests_plain'):
    """
    爬取详情页，提取正文内容。
    
    Args:
        url: 详情页 URL
        selectors: detail_selectors 配置
        strategy: 爬虫策略
    
    Returns:
        dict: {title, content, publish_date, budget, attachments, url}
    """
    fetcher = get_fetcher(strategy)

    try:
        log(f"Crawling detail: {url}")
        page = fetcher(url)

        if page.status != 200:
            return {'error': f'HTTP {page.status}', 'url': url}

        # 提取标题
        title_sel = selectors.get('title', 'h1, h2')
        title = page.css(f'{title_sel}::text').get(default='').strip()

        # 提取正文
        content_sel = selectors.get('content', '.content, .detail, article')
        content_el = page.css(content_sel)
        if content_el:
            content = content_el[0].text_content() if hasattr(content_el[0], 'text_content') else content_el.css('::text').get(default='')
        else:
            # Fallback: body text
            body = page.css('body')
            content = body[0].text_content() if body else ''

        # 提取日期
        date_sel = selectors.get('publish_date', '.date, .time')
        date_text = page.css(f'{date_sel}::text').get(default='')
        pub_date = extract_date(date_text)

        # 提取附件链接
        attach_sel = selectors.get('attachments', 'a[href$=".pdf"], a[href$=".doc"], a[href$=".zip"]')
        attachment_urls = []
        for a in page.css('a'):
            href = a.attrib.get('href', '')
            if re.search(r'\.(pdf|docx?|zip|rar)(\?|$)', href, re.I):
                if not href.startswith('http'):
                    href = f"{url.rstrip('/')}/{href.lstrip('/')}"
                attachment_urls.append(href)

        return {
            'title': title,
            'content': content[:50000],  # 限制长度
            'publish_date': pub_date,
            'budget_amount': extract_budget(content),
            'attachment_urls': attachment_urls,
            'url': url,
        }

    except Exception as e:
        return {'error': str(e), 'url': url}


def main():
    parser = argparse.ArgumentParser(description='Scrapling 爬虫引擎')
    parser.add_argument('--stdin', action='store_true', help='从 stdin 读取 JSON 配置')
    parser.add_argument('--platform', type=str, help='平台配置 JSON 字符串')
    parser.add_argument('--detail', action='store_true', help='爬取详情页模式')
    parser.add_argument('--url', type=str, help='详情页 URL (--detail 模式)')
    parser.add_argument('--selectors', type=str, help='详情页选择器 JSON (--detail 模式)')
    parser.add_argument('--strategy', type=str, default='requests_plain', help='爬虫策略')

    args = parser.parse_args()

    # 读取配置
    if args.stdin:
        config = json.loads(sys.stdin.read())
    elif args.platform:
        config = json.loads(args.platform)
    else:
        parser.print_help()
        sys.exit(1)

    # 详情页模式
    if args.detail:
        url = args.url or config.get('url', '')
        selectors = json.loads(args.selectors) if args.selectors else config.get('selectors', {})
        strategy = args.strategy or config.get('strategy', 'requests_plain')
        result = crawl_detail_page(url, selectors, strategy)
        print(json.dumps(result, ensure_ascii=False))
        return

    # 列表页模式
    platform = config.get('platform', config)
    result = crawl_listing_page(platform)
    print(json.dumps(result, ensure_ascii=False))


if __name__ == '__main__':
    main()
