#!/usr/bin/env python3
"""
千里马详情页爬虫 — 基于 CrawlerBase 封装

使用 Playwright 直接控制浏览器，支持：
  1. 首页预热获取 cookies
  2. 419 反爬重试逻辑
  3. 代理轮换（可选）
  4. 统一的日志和统计
"""

import sys
import json
import re
from urllib.parse import urljoin
from datetime import datetime

# 导入爬虫基类
from crawler_base import CrawlerBase, CrawlerConfig, CrawlResult, load_urls_from_file, load_urls_from_stdin


class QianlimaCrawler(CrawlerBase):
    """
    千里马爬虫
    
    继承 CrawlerBase，实现千里马详情页数据提取
    """
    
    def __init__(self, config: CrawlerConfig = None):
        # 默认配置
        default_config = CrawlerConfig(
            warmup_url='https://www.qianlima.com',
            warmup_wait=3,
            delay=10,
            max_retries=2,
            retry_delay=30,
        )
        
        # 合并配置
        if config:
            # 用户配置覆盖默认配置
            for key, value in vars(config).items():
                if value is not None:
                    setattr(default_config, key, value)
        
        super().__init__(default_config)
    
    def extract_data(self, page, url: str) -> dict:
        """
        提取千里马详情页数据
        
        Args:
            page: Playwright 页面对象
            url: 页面 URL
            
        Returns:
            dict: 提取的数据
        """
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


def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description='千里马详情页爬虫')
    parser.add_argument('--urls', nargs='+', help='详情页URL列表')
    parser.add_argument('--file', type=str, help='包含URL列表的文件（每行一个）')
    parser.add_argument('--delay', type=int, default=10, help='请求间隔秒数')
    parser.add_argument('--output', type=str, help='输出JSON文件路径')
    parser.add_argument('--proxy', type=str, help='代理服务器地址')
    parser.add_argument('--headless', action='store_true', default=True, help='无头模式')
    
    args = parser.parse_args()
    
    # 加载 URL
    urls = []
    if args.urls:
        urls = args.urls
    elif args.file:
        urls = load_urls_from_file(args.file)
    else:
        urls = load_urls_from_stdin()
    
    if not urls:
        print("No URLs provided", file=sys.stderr)
        sys.exit(1)
    
    # 配置爬虫
    config = CrawlerConfig(
        delay=args.delay,
        headless=args.headless,
    )
    
    # 代理配置
    if args.proxy:
        config.proxy = {
            'server': args.proxy,
        }
    
    # 创建爬虫实例
    crawler = QianlimaCrawler(config)
    
    # 执行爬取
    results = crawler.crawl_batch(urls)
    
    # 统计
    stats = crawler.get_stats()
    print(f"\nDone: {stats['success']} success, {stats['failed']} failed", file=sys.stderr)
    print(f"Success rate: {stats['success_rate']:.1%}", file=sys.stderr)
    print(f"Avg duration: {stats['avg_duration']:.1f}s", file=sys.stderr)
    
    # 输出结果
    crawler.export_results(args.output)


if __name__ == '__main__':
    main()
