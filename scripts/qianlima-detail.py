#!/usr/bin/env python3
"""
千里马详情页爬虫 — Playwright 直接控制，首页预热获取cookies
策略：
  1. 用 Playwright 访问首页获取 cookies（18个）
  2. 复用同一浏览器上下文访问详情页
  3. 等待 Vue SPA 渲染（5-10秒）
  4. 每个详情页间隔10秒
  5. 遇到419时等待30秒后重试
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


def extract_detail_from_page(page, url):
    """从Playwright页面提取详情字段"""
    # 标题
    title = ''
    for sel in ['h1', 'h2', '.bid-title', '.detail-title', '.title']:
        el = page.query_selector(sel)
        if el:
            t = el.inner_text().strip()
            if t and len(t) > 5:
                title = t
                break

    # 正文内容
    body_text = page.inner_text('body')

    # 发布日期
    publish_date = None
    date_match = re.search(r'发布时间[：:]*\s*(\d{4})年(\d{1,2})月(\d{1,2})日', body_text)
    if date_match:
        y, m, d = date_match.groups()
        publish_date = f"{y}-{int(m):02d}-{int(d):02d}"

    # 预算
    budget = 0
    budget_match = re.search(r'(?:预算|金额|限价|投资)[：:]*\s*([\d,.]+)\s*(万?元)', body_text)
    if budget_match:
        amount = float(budget_match.group(1).replace(',', ''))
        if '万' in budget_match.group(0):
            amount *= 10000
        budget = amount

    # 截止日期
    end_date = None
    end_match = re.search(r'(?:截止|投标截止|开标)[时间]*[：:]*\s*(\d{4})年(\d{1,2})月(\d{1,2})日', body_text)
    if end_match:
        y, m, d = end_match.groups()
        end_date = f"{y}-{int(m):02d}-{int(d):02d}"

    # 招标人/采购人
    tenderee = ''
    tenderee_match = re.search(r'(?:招标人|采购人|业主|委托方)[：:]*\s*(.{2,50}?)(?:\s|$|，|。|\n)', body_text)
    if tenderee_match:
        tenderee = tenderee_match.group(1).strip()

    # 招标编号
    bid_number = ''
    bid_match = re.search(r'(?:招标编号|项目编号|采购编号)[：:]*\s*([A-Za-z0-9\-]+)', body_text)
    if bid_match:
        bid_number = bid_match.group(1).strip()

    # 附件
    attachments = []
    for a in page.query_selector_all('a[href]'):
        href = a.get_attribute('href') or ''
        if re.search(r'\.(pdf|docx?|zip|rar)(\?|$)', href, re.I):
            full_url = href if href.startswith('http') else urljoin(url, href)
            attachments.append(full_url)

    # 招标方式
    bid_method = ''
    method_match = re.search(r'(?:招标方式|采购方式)[：:]*\s*(.{2,20}?)(?:\s|$|，|。|\n)', body_text)
    if method_match:
        bid_method = method_match.group(1).strip()

    return {
        'title': title,
        'content': body_text[:50000],
        'publish_date': publish_date,
        'budget_amount': budget,
        'end_date': end_date,
        'tenderee': tenderee,
        'bid_number': bid_number,
        'bid_method': bid_method,
        'attachment_urls': attachments,
        'content_length': len(body_text),
    }


def crawl_details_with_playwright(urls, delay=10, max_retries=2):
    """
    批量爬取详情页 — 使用 Playwright 直接控制
    
    Args:
        urls: URL列表
        delay: 请求间隔秒数
        max_retries: 最大重试次数
    
    Returns:
        list: 结果列表
    """
    from playwright.sync_api import sync_playwright

    results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport={'width': 1920, 'height': 1080},
            locale='zh-CN',
        )

        page = context.new_page()

        # Step 1: 首页预热获取cookies
        log("Warming up: visiting homepage for cookies...")
        try:
            page.goto('https://www.qianlima.com', wait_until='domcontentloaded', timeout=30000)
            time.sleep(3)
            cookies = context.cookies()
            log(f"  Got {len(cookies)} cookies")
        except Exception as e:
            log(f"  Warning: Homepage warmup failed: {e}")

        # Step 2: 逐个爬取详情页
        for i, url in enumerate(urls):
            log(f"\n[{i+1}/{len(urls)}] Crawling: {url}")

            for attempt in range(max_retries + 1):
                try:
                    page.goto(url, wait_until='domcontentloaded', timeout=30000)
                    time.sleep(5)  # 等待Vue渲染

                    content = page.content()

                    # 检查是否是419验证页
                    if 'Verification Required' in content or '人机验证' in content:
                        if attempt < max_retries:
                            log(f"  Got CAPTCHA, waiting 30s before retry ({attempt+1}/{max_retries+1})...")
                            time.sleep(30)
                            # 重新访问首页刷新cookies
                            page.goto('https://www.qianlima.com', wait_until='domcontentloaded', timeout=30000)
                            time.sleep(3)
                            continue
                        else:
                            log(f"  CAPTCHA persists after {max_retries+1} attempts")
                            results.append({'url': url, 'status': 'error', 'error': 'CAPTCHA'})
                            break

                    # 检查SPA壳
                    if 'doesn\'t work properly without JavaScript' in content:
                        log("  SPA shell detected, waiting for render...")
                        time.sleep(8)
                        content = page.content()

                    # 提取内容
                    if len(content) > 50000:
                        log(f"  Success: {len(content):,} chars")
                        result = extract_detail_from_page(page, url)
                        result['url'] = url
                        result['status'] = 'success'
                        results.append(result)
                    else:
                        log(f"  Warning: Only {len(content):,} chars")
                        result = extract_detail_from_page(page, url)
                        result['url'] = url
                        result['status'] = 'partial'
                        results.append(result)

                    break  # 成功，跳出重试循环

                except Exception as e:
                    log(f"  Error: {e}")
                    if attempt < max_retries:
                        log(f"  Retrying in 10s...")
                        time.sleep(10)
                    else:
                        results.append({'url': url, 'status': 'error', 'error': str(e)})

            # 请求间隔
            if i < len(urls) - 1:
                log(f"  Waiting {delay}s before next request...")
                time.sleep(delay)

        browser.close()

    # 统计
    success = sum(1 for r in results if r.get('status') == 'success')
    failed = sum(1 for r in results if r.get('status') == 'error')
    log(f"\nTotal: {success} success, {failed} failed, {len(results)} total")

    return results


def main():
    import argparse
    parser = argparse.ArgumentParser(description='千里马详情页爬虫')
    parser.add_argument('--urls', nargs='+', help='详情页URL列表')
    parser.add_argument('--file', type=str, help='包含URL列表的文件（每行一个）')
    parser.add_argument('--delay', type=int, default=10, help='请求间隔秒数')
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
    results = crawl_details_with_playwright(urls, delay=args.delay)

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
