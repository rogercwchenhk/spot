#!/usr/bin/env python3
"""
千里马详情页爬虫 — 浏览器模式，带反爬处理
策略：
  1. 用 StealthyFetcher (Playwright) 渲染Vue SPA
  2. 首先访问首页获取cookies
  3. 每个详情页间隔30秒，避免触发419
  4. 遇到419时等待60秒后重试
  5. 最多重试3次
"""
import sys
import json
import time
import re
import hashlib
from datetime import datetime
from urllib.parse import urljoin


def log(msg):
    print(f"[qianlima-detail] {msg}", file=sys.stderr, flush=True)


def extract_detail_from_html(page, url):
    """从渲染后的页面提取详情"""
    # 标题
    title = ''
    for sel in ['h1', 'h2', '.bid-title', '.detail-title', '.title']:
        el = page.css(sel)
        if el:
            t = el[0].css('::text').get(default='').strip()
            if t and len(t) > 5:
                title = t
                break

    # 正文内容
    content = ''
    for sel in ['.bid-content', '.detail-content', '.content', '.article', 
                '.info-detail', '.main-content', '#content', '.bid-info']:
        el = page.css(sel)
        if el:
            text = el[0].text_content() if hasattr(el[0], 'text_content') else el.css('::text').get(default='')
            if text and len(text) > 100:
                content = text.strip()
                break

    if not content:
        # Fallback: body text，过滤导航/页脚
        body_text = ' '.join([t.strip() for t in page.css('body').css('::text').getall() if t.strip()])
        # 去掉头部导航和尾部
        content = body_text

    # 发布日期
    publish_date = None
    for sel in ['.pub-date', '.date', '.time', '.publish-time', '.info-date']:
        el = page.css(sel)
        if el:
            date_text = el[0].css('::text').get(default='').strip()
            match = re.search(r'(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})', date_text)
            if match:
                y, m, d = match.groups()
                publish_date = f"{y}-{int(m):02d}-{int(d):02d}"
                break

    # 预算
    budget = 0
    budget_match = re.search(r'(?:预算|金额|限价)[：:]*\s*([\d,.]+)\s*(万?元)', content)
    if budget_match:
        amount = float(budget_match.group(1).replace(',', ''))
        if '万' in budget_match.group(0):
            amount *= 10000
        budget = amount

    # 截止日期
    end_date = None
    end_match = re.search(r'(?:截止|投标截止|开标)[：:]*\s*(\d{4}[-/年]\d{1,2}[-/月]\d{1,2})', content)
    if end_match:
        date_str = end_match.group(1)
        match = re.search(r'(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})', date_str)
        if match:
            y, m, d = match.groups()
            end_date = f"{y}-{int(m):02d}-{int(d):02d}"

    # 招标人
    tenderee = ''
    tenderee_match = re.search(r'(?:招标人|采购人|业主)[：:]*\s*(.{2,50}?)(?:\s|$|，|。)', content)
    if tenderee_match:
        tenderee = tenderee_match.group(1).strip()

    # 附件
    attachments = []
    for a in page.css('a'):
        href = a.attrib.get('href', '')
        if re.search(r'\.(pdf|docx?|zip|rar)(\?|$)', href, re.I):
            full_url = href if href.startswith('http') else urljoin(url, href)
            attachments.append(full_url)

    return {
        'title': title,
        'content': content[:50000],
        'publish_date': publish_date,
        'budget_amount': budget,
        'end_date': end_date,
        'tenderee': tenderee,
        'attachment_urls': attachments,
    }


def crawl_detail_with_retry(url, max_retries=3, delay_between=30):
    """
    爬取单个详情页，带重试逻辑
    """
    from scrapling.fetchers import StealthyFetcher

    for attempt in range(max_retries):
        try:
            log(f"Attempt {attempt + 1}/{max_retries}: {url}")
            page = StealthyFetcher.fetch(url, headless=True, network_idle=True, timeout=45000)

            if page.status == 200:
                html = page.html_content
                # 检查是否是验证页
                if 'Verification Required' in html or '人机验证' in html or 'too frequent' in html:
                    log(f"  Got verification page, waiting 60s before retry...")
                    time.sleep(60)
                    continue

                log(f"  Success: {len(html):,} chars")
                result = extract_detail_from_html(page, url)
                result['url'] = url
                result['status'] = 'success'
                return result

            elif page.status == 419:
                log(f"  Got 419 (rate limited), waiting 60s before retry...")
                time.sleep(60)
                continue

            else:
                log(f"  Unexpected status: {page.status}")
                return {'url': url, 'status': 'error', 'error': f'HTTP {page.status}'}

        except Exception as e:
            log(f"  Error: {e}")
            if attempt < max_retries - 1:
                time.sleep(30)
            continue

    return {'url': url, 'status': 'error', 'error': 'Max retries exceeded'}


def crawl_batch(urls, delay_between=30):
    """
    批量爬取详情页
    """
    from scrapling.fetchers import StealthyFetcher

    # Step 1: 首先访问首页获取cookies
    log("Warming up: visiting homepage...")
    try:
        StealthyFetcher.fetch('https://www.qianlima.com', headless=True, network_idle=True, timeout=30000)
        log("Homepage loaded, cookies acquired")
    except Exception as e:
        log(f"Homepage warmup failed: {e}")

    time.sleep(5)

    # Step 2: 逐个爬取详情页
    results = []
    for i, url in enumerate(urls):
        log(f"\n[{i+1}/{len(urls)}] Crawling: {url}")
        result = crawl_detail_with_retry(url)
        results.append(result)

        if i < len(urls) - 1:
            log(f"  Waiting {delay_between}s before next request...")
            time.sleep(delay_between)

    return results


def main():
    import argparse
    parser = argparse.ArgumentParser(description='千里马详情页爬虫')
    parser.add_argument('--urls', nargs='+', help='详情页URL列表')
    parser.add_argument('--file', type=str, help='包含URL列表的文件（每行一个）')
    parser.add_argument('--delay', type=int, default=30, help='请求间隔秒数')
    parser.add_argument('--output', type=str, help='输出JSON文件路径')

    args = parser.parse_args()

    urls = []
    if args.urls:
        urls = args.urls
    elif args.file:
        with open(args.file) as f:
            urls = [line.strip() for line in f if line.strip() and line.startswith('http')]
    else:
        # 从stdin读取JSON
        data = json.loads(sys.stdin.read())
        if isinstance(data, list):
            urls = [item.get('url', item.get('source_url', '')) for item in data]
        elif isinstance(data, dict):
            urls = [item.get('url', item.get('source_url', '')) for item in data.get('items', data.get('urls', []))]

    if not urls:
        log("No URLs provided")
        sys.exit(1)

    log(f"Starting batch crawl: {len(urls)} URLs, {args.delay}s delay")
    results = crawl_batch(urls, delay_between=args.delay)

    # 统计
    success = sum(1 for r in results if r.get('status') == 'success')
    failed = len(results) - success
    log(f"\nDone: {success} success, {failed} failed")

    # 输出
    output = json.dumps(results, ensure_ascii=False, indent=2)
    if args.output:
        with open(args.output, 'w') as f:
            f.write(output)
        log(f"Results saved to {args.output}")
    else:
        print(output)


if __name__ == '__main__':
    main()
