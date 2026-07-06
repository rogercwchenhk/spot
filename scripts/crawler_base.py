#!/usr/bin/env python3
"""
爬虫基类 — 封装 Playwright 工具类，统一重试策略

功能：
  1. Playwright 浏览器管理
  2. Cookie 预热策略
  3. 反爬重试逻辑
  4. 代理轮换支持
  5. 日志和统计
"""

import sys
import time
import json
import random
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
from datetime import datetime


@dataclass
class CrawlResult:
    """爬取结果数据类"""
    url: str
    status: str  # success, error, partial, captcha
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    content_length: int = 0
    retry_count: int = 0
    duration: float = 0.0
    timestamp: str = ''

    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = datetime.now().isoformat()


@dataclass
class CrawlerConfig:
    """爬虫配置"""
    headless: bool = True
    timeout: int = 30000
    delay: int = 10
    max_retries: int = 2
    retry_delay: int = 30
    warmup_url: str = ''
    warmup_wait: int = 3
    user_agent: str = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    viewport: Dict[str, int] = None
    locale: str = 'zh-CN'
    proxy: Optional[Dict[str, str]] = None
    
    def __post_init__(self):
        if self.viewport is None:
            self.viewport = {'width': 1920, 'height': 1080}


class CrawlerBase(ABC):
    """
    爬虫基类
    
    提供 Playwright 浏览器管理、重试策略、日志统计等功能
    子类需要实现 extract_data 方法
    """
    
    def __init__(self, config: CrawlerConfig = None):
        self.config = config or CrawlerConfig()
        self.stats = {
            'total': 0,
            'success': 0,
            'failed': 0,
            'partial': 0,
            'captcha': 0,
            'retries': 0,
            'total_duration': 0.0,
        }
        self.results: List[CrawlResult] = []
        self._browser = None
        self._context = None
        self._page = None
    
    def log(self, msg: str, level: str = 'info'):
        """日志输出"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        prefix = f"[{self.__class__.__name__}]"
        print(f"{timestamp} {prefix} {msg}", file=sys.stderr, flush=True)
    
    def setup_browser(self, playwright):
        """设置浏览器"""
        self.log("Setting up browser...")
        
        # 浏览器启动参数
        launch_args = {
            'headless': self.config.headless,
        }
        
        # 代理配置
        if self.config.proxy:
            launch_args['proxy'] = self.config.proxy
            self.log(f"Using proxy: {self.config.proxy.get('server', 'N/A')}")
        
        self._browser = playwright.chromium.launch(**launch_args)
        
        # 上下文配置
        context_args = {
            'user_agent': self.config.user_agent,
            'viewport': self.config.viewport,
            'locale': self.config.locale,
        }
        
        self._context = self._browser.new_context(**context_args)
        self._page = self._context.new_page()
        
        self.log("Browser setup complete")
    
    def cleanup_browser(self):
        """清理浏览器资源"""
        if self._page:
            self._page.close()
        if self._context:
            self._context.close()
        if self._browser:
            self._browser.close()
        self.log("Browser cleanup complete")
    
    def warmup(self) -> bool:
        """
        Cookie 预热
        
        Returns:
            bool: 预热是否成功
        """
        if not self.config.warmup_url:
            self.log("No warmup URL configured, skipping warmup")
            return True
        
        self.log(f"Warming up: visiting {self.config.warmup_url}...")
        try:
            self._page.goto(
                self.config.warmup_url,
                wait_until='domcontentloaded',
                timeout=self.config.timeout,
            )
            time.sleep(self.config.warmup_wait)
            
            cookies = self._context.cookies()
            self.log(f"  Got {len(cookies)} cookies")
            return True
        except Exception as e:
            self.log(f"  Warning: Warmup failed: {e}")
            return False
    
    def check_captcha(self, content: str) -> bool:
        """
        检查是否遇到验证码
        
        Args:
            content: 页面内容
            
        Returns:
            bool: 是否遇到验证码
        """
        captcha_indicators = [
            'Verification Required',
            '人机验证',
            'CAPTCHA',
            'captcha',
            'verify',
        ]
        return any(indicator in content for indicator in captcha_indicators)
    
    def handle_captcha(self, url: str, attempt: int) -> bool:
        """
        处理验证码
        
        Args:
            url: 当前 URL
            attempt: 当前重试次数
            
        Returns:
            bool: 是否应该继续重试
        """
        if attempt < self.config.max_retries:
            self.log(f"  Got CAPTCHA, waiting {self.config.retry_delay}s before retry ({attempt+1}/{self.config.max_retries+1})...")
            time.sleep(self.config.retry_delay)
            self.stats['retries'] += 1
            
            # 重新预热
            self.warmup()
            return True
        else:
            self.log(f"  CAPTCHA persists after {self.config.max_retries+1} attempts")
            return False
    
    def wait_for_render(self, content: str) -> str:
        """
        等待 SPA 渲染
        
        Args:
            content: 页面内容
            
        Returns:
            str: 渲染后的内容
        """
        if "doesn't work properly without JavaScript" in content:
            self.log("  SPA shell detected, waiting for render...")
            time.sleep(8)
            return self._page.content()
        return content
    
    def crawl_page(self, url: str) -> CrawlResult:
        """
        爬取单个页面
        
        Args:
            url: 页面 URL
            
        Returns:
            CrawlResult: 爬取结果
        """
        start_time = time.time()
        
        for attempt in range(self.config.max_retries + 1):
            try:
                self._page.goto(
                    url,
                    wait_until='domcontentloaded',
                    timeout=self.config.timeout,
                )
                time.sleep(5)  # 等待 Vue 渲染
                
                content = self._page.content()
                
                # 检查验证码
                if self.check_captcha(content):
                    if self.handle_captcha(url, attempt):
                        continue
                    else:
                        return CrawlResult(
                            url=url,
                            status='captcha',
                            error='CAPTCHA',
                            content_length=len(content),
                            retry_count=attempt,
                            duration=time.time() - start_time,
                        )
                
                # 等待 SPA 渲染
                content = self.wait_for_render(content)
                
                # 提取数据
                data = self.extract_data(self._page, url)
                
                # 判断状态
                if len(content) > 50000:
                    status = 'success'
                    self.log(f"  Success: {len(content):,} chars")
                else:
                    status = 'partial'
                    self.log(f"  Warning: Only {len(content):,} chars")
                
                return CrawlResult(
                    url=url,
                    status=status,
                    data=data,
                    content_length=len(content),
                    retry_count=attempt,
                    duration=time.time() - start_time,
                )
                
            except Exception as e:
                self.log(f"  Error: {e}")
                if attempt < self.config.max_retries:
                    self.log(f"  Retrying in 10s...")
                    time.sleep(10)
                    self.stats['retries'] += 1
                else:
                    return CrawlResult(
                        url=url,
                        status='error',
                        error=str(e),
                        retry_count=attempt,
                        duration=time.time() - start_time,
                    )
        
        # 不应该到达这里
        return CrawlResult(
            url=url,
            status='error',
            error='Max retries exceeded',
            retry_count=self.config.max_retries,
            duration=time.time() - start_time,
        )
    
    def crawl_batch(self, urls: List[str]) -> List[CrawlResult]:
        """
        批量爬取
        
        Args:
            urls: URL 列表
            
        Returns:
            List[CrawlResult]: 结果列表
        """
        from playwright.sync_api import sync_playwright
        
        self.stats['total'] = len(urls)
        self.results = []
        
        self.log(f"Starting batch crawl: {len(urls)} URLs, {self.config.delay}s delay")
        
        with sync_playwright() as p:
            self.setup_browser(p)
            self.warmup()
            
            for i, url in enumerate(urls):
                self.log(f"\n[{i+1}/{len(urls)}] Crawling: {url}")
                
                result = self.crawl_page(url)
                self.results.append(result)
                
                # 更新统计
                self.stats[result.status] = self.stats.get(result.status, 0) + 1
                self.stats['total_duration'] += result.duration
                
                # 请求间隔
                if i < len(urls) - 1:
                    self.log(f"  Waiting {self.config.delay}s before next request...")
                    time.sleep(self.config.delay)
            
            self.cleanup_browser()
        
        # 统计
        success = self.stats.get('success', 0)
        failed = self.stats.get('error', 0)
        self.log(f"\nTotal: {success} success, {failed} failed, {len(self.results)} total")
        
        return self.results
    
    @abstractmethod
    def extract_data(self, page, url: str) -> Dict[str, Any]:
        """
        提取页面数据（子类实现）
        
        Args:
            page: Playwright 页面对象
            url: 页面 URL
            
        Returns:
            Dict: 提取的数据
        """
        pass
    
    def get_stats(self) -> Dict[str, Any]:
        """获取统计信息"""
        return {
            **self.stats,
            'success_rate': self.stats['success'] / self.stats['total'] if self.stats['total'] > 0 else 0,
            'avg_duration': self.stats['total_duration'] / self.stats['total'] if self.stats['total'] > 0 else 0,
        }
    
    def export_results(self, output_path: str = None) -> str:
        """
        导出结果
        
        Args:
            output_path: 输出文件路径
            
        Returns:
            str: JSON 字符串
        """
        output = json.dumps(
            [asdict(r) for r in self.results],
            ensure_ascii=False,
            indent=2,
        )
        
        if output_path:
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(output)
            self.log(f"Results saved to {output_path}")
        
        return output


class ProxyRotator:
    """
    代理轮换器
    
    支持从代理池中随机选择代理
    """
    
    def __init__(self, proxies: List[Dict[str, str]]):
        """
        初始化代理轮换器
        
        Args:
            proxies: 代理列表，每个代理包含 server, username, password
        """
        self.proxies = proxies
        self.current_index = 0
    
    def get_proxy(self) -> Optional[Dict[str, str]]:
        """
        获取下一个代理
        
        Returns:
            Dict: 代理配置
        """
        if not self.proxies:
            return None
        
        proxy = self.proxies[self.current_index]
        self.current_index = (self.current_index + 1) % len(self.proxies)
        return proxy
    
    def get_random_proxy(self) -> Optional[Dict[str, str]]:
        """
        随机获取代理
        
        Returns:
            Dict: 代理配置
        """
        if not self.proxies:
            return None
        
        return random.choice(self.proxies)


# ============================================================
# 工具函数
# ============================================================

def load_urls_from_file(file_path: str) -> List[str]:
    """从文件加载 URL 列表"""
    urls = []
    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and line.startswith('http'):
                urls.append(line)
    return urls


def load_urls_from_stdin() -> List[str]:
    """从 stdin 加载 URL 列表"""
    data = json.loads(sys.stdin.read())
    
    if isinstance(data, list):
        return [item.get('url', item.get('source_url', '')) for item in data]
    elif isinstance(data, dict):
        return [item.get('url', item.get('source_url', '')) for item in data.get('items', data.get('urls', []))]
    
    return []


if __name__ == '__main__':
    # 示例用法
    print("CrawlerBase module loaded successfully")
    print("Usage: from crawler_base import CrawlerBase, CrawlerConfig")
