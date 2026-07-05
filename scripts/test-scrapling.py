#!/usr/bin/env python3.13
"""
Scrapling bid crawling test - v2
Tests both HTTP fetcher and browser-based fetcher against real bidding platforms.
"""
import time
import json

# ---- Test 1: ccgp.gov.cn (Server-rendered, HTTP works) ----
print("="*60)
print("TEST 1: 中国政府采购网 (Server-rendered)")
print("="*60)

from scrapling.fetchers import Fetcher

# Fetch the listing page
start = time.time()
page = Fetcher.get(
    "http://www.ccgp.gov.cn/cggg/dfgg/gkzb/index.htm",
    impersonate='chrome',
    stealthy_headers=True,
    timeout=30
)
elapsed = time.time() - start
print(f"Status: {page.status} | Time: {elapsed:.2f}s")
print(f"HTML length: {len(page.html_content):,} chars")

# Extract bid listings using CSS selectors
# ccgp.gov.cn uses <li><a> pattern for bid notices
links = page.css('li a')
print(f"\nTotal li a links: {len(links)}")

bid_items = []
for link in links:
    href = link.attrib.get('href', '')
    text = link.css('::text').get(default='').strip()
    if text and len(text) > 10 and ('采购' in text or '招标' in text or '公告' in text):
        full_url = href if href.startswith('http') else f"http://www.ccgp.gov.cn{href}"
        bid_items.append({'title': text, 'url': full_url})

print(f"Bid items found: {len(bid_items)}")
for i, item in enumerate(bid_items[:10]):
    print(f"  [{i+1}] {item['title'][:80]}")
    print(f"      → {item['url']}")

# Test a detail page if we found one
if bid_items:
    detail_url = bid_items[0]['url']
    print(f"\n--- Fetching detail page: {detail_url} ---")
    start = time.time()
    detail = Fetcher.get(detail_url, impersonate='chrome', stealthy_headers=True, timeout=30)
    elapsed = time.time() - start
    print(f"Status: {detail.status} | Time: {elapsed:.2f}s")
    print(f"HTML length: {len(detail.html_content):,} chars")
    
    # Try to extract structured bid info
    detail_title = detail.css('h2::text, h1::text, .title::text').get(default='N/A')
    print(f"Detail title: {detail_title[:100]}")
    
    # Look for common bid detail fields
    all_text = detail.css('body').css('::text').getall()
    body_text = ' '.join([t.strip() for t in all_text if t.strip()])
    print(f"Body text: {len(body_text):,} chars")
    
    # Extract key fields with regex-like approach
    import re
    budget_match = re.search(r'(?:预算|金额|预算金额)[：:]*\s*([\d,.]+)\s*(?:万?元)', body_text)
    deadline_match = re.search(r'(?:截止|投标截止|开标)[：:]*\s*(\d{4}[-/年]\d{1,2}[-/月]\d{1,2})', body_text)
    
    if budget_match:
        print(f"Budget found: {budget_match.group(0)}")
    if deadline_match:
        print(f"Deadline found: {deadline_match.group(0)}")
    
    # Show first 500 chars of body
    print(f"\nContent preview:\n{body_text[:500]}")


# ---- Test 2: gdgpo.czt.gd.gov.cn (Vue SPA, needs browser) ----
print("\n" + "="*60)
print("TEST 2: 广东省政府采购网 (Vue SPA - needs browser)")
print("="*60)

# First show what HTTP gets us (empty shell)
page_http = Fetcher.get(
    "https://gdgpo.czt.gd.gov.cn/",
    impersonate='chrome',
    timeout=15
)
print(f"HTTP fetch: Status={page_http.status}, HTML={len(page_http.html_content)} chars")
print(f"  (This is expected to be an empty Vue SPA shell)")

# Now try with browser
print("\nAttempting browser-based fetch (StealthyFetcher)...")
try:
    from scrapling.fetchers import StealthyFetcher
    start = time.time()
    page_browser = StealthyFetcher.fetch(
        "https://gdgpo.czt.gd.gov.cn/",
        headless=True,
        network_idle=True,
        timeout=30000
    )
    elapsed = time.time() - start
    print(f"Browser fetch: Status={page_browser.status}, Time={elapsed:.2f}s")
    html = page_browser.html_content if hasattr(page_browser, 'html_content') else str(page_browser)
    print(f"HTML length: {len(html):,} chars")
    
    title = page_browser.css('title::text').get(default='N/A')
    print(f"Title: {title[:100]}")
    
    # Look for rendered content
    body_text_browser = page_browser.css('body').css('::text').getall()
    body_text_joined = ' '.join([t.strip() for t in body_text_browser if t.strip()])
    print(f"Body text: {len(body_text_joined):,} chars")
    if body_text_joined:
        print(f"Preview: {body_text_joined[:500]}")
    
except Exception as e:
    print(f"Browser fetch FAILED: {e}")
    print("  (May need: python3.13 -m scrapling install)")


# ---- Test 3: 深圳公共资源交易中心 (Likely SPA) ----
print("\n" + "="*60)
print("TEST 3: 深圳公共资源交易中心")
print("="*60)

try:
    from scrapling.fetchers import StealthyFetcher
    start = time.time()
    page_sz = StealthyFetcher.fetch(
        "https://www.szggzy.com/",
        headless=True,
        network_idle=True,
        timeout=30000
    )
    elapsed = time.time() - start
    html_sz = page_sz.html_content if hasattr(page_sz, 'html_content') else str(page_sz)
    print(f"Status: {page_sz.status} | Time: {elapsed:.2f}s | HTML: {len(html_sz):,} chars")
    
    title_sz = page_sz.css('title::text').get(default='N/A')
    print(f"Title: {title_sz[:100]}")
    
    links_sz = page_sz.css('a')
    print(f"Links: {len(links_sz)}")
    
    bid_links_sz = []
    for link in links_sz:
        href = link.attrib.get('href', '')
        text = link.css('::text').get(default='').strip()
        if text and any(kw in text for kw in ['招标', '中标', '采购', '公告']):
            bid_links_sz.append({'title': text, 'url': href})
    
    print(f"Bid links: {len(bid_links_sz)}")
    for item in bid_links_sz[:5]:
        print(f"  → {item['title'][:60]}")
        
except Exception as e:
    print(f"FAILED: {e}")


print("\n" + "="*60)
print("TEST COMPLETE")
print("="*60)
