# 客户雷达 — 爬虫指南

> 版本: v1.0 | 日期: 2026-07-07
> 目的: 定义爬虫最佳实践和反爬策略

---

## 1. 爬虫架构

### 1.1 基类设计

```python
class CrawlerBase(ABC):
    """
    爬虫基类
    
    提供 Playwright 浏览器管理、重试策略、日志统计等功能
    子类需要实现 extract_data 方法
    """
    
    def __init__(self, config: CrawlerConfig = None):
        self.config = config or CrawlerConfig()
        self.stats = {...}
        self.results = []
    
    def crawl_batch(self, urls: List[str]) -> List[CrawlResult]:
        """批量爬取"""
        ...
    
    @abstractmethod
    def extract_data(self, page, url: str) -> Dict[str, Any]:
        """提取页面数据（子类实现）"""
        pass
```

### 1.2 配置管理

```python
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
    user_agent: str = '...'
    viewport: Dict[str, int] = None
    locale: str = 'zh-CN'
    proxy: Optional[Dict[str, str]] = None
```

---

## 2. 反爬策略

### 2.1 Cookie 预热

**策略**: 访问首页获取 cookies，复用浏览器上下文

**实现**:
```python
def warmup(self) -> bool:
    """Cookie 预热"""
    if not self.config.warmup_url:
        return True
    
    self._page.goto(
        self.config.warmup_url,
        wait_until='domcontentloaded',
        timeout=self.config.timeout,
    )
    time.sleep(self.config.warmup_wait)
    
    cookies = self._context.cookies()
    self.log(f"Got {len(cookies)} cookies")
    return True
```

**最佳实践**:
- 预热 URL 应为目标网站首页
- 预热等待时间 3-5 秒
- 预热失败时继续爬取，不阻塞

### 2.2 请求延迟

**策略**: 请求之间添加随机延迟，模拟人类行为

**实现**:
```python
def crawl_batch(self, urls: List[str]) -> List[CrawlResult]:
    for i, url in enumerate(urls):
        # 请求间隔
        if i < len(urls) - 1:
            delay = self.config.delay + random.uniform(0, 2)
            time.sleep(delay)
```

**最佳实践**:
- 基础延迟 10-15 秒
- 随机延迟 0-2 秒
- 根据目标网站调整延迟

### 2.3 验证码处理

**策略**: 检测验证码，等待后重试

**实现**:
```python
def check_captcha(self, content: str) -> bool:
    """检查是否遇到验证码"""
    captcha_indicators = [
        'Verification Required',
        '人机验证',
        'CAPTCHA',
        'captcha',
        'verify',
    ]
    return any(indicator in content for indicator in captcha_indicators)

def handle_captcha(self, url: str, attempt: int) -> bool:
    """处理验证码"""
    if attempt < self.config.max_retries:
        self.log(f"Got CAPTCHA, waiting {self.config.retry_delay}s...")
        time.sleep(self.config.retry_delay)
        self.warmup()  # 重新预热
        return True
    else:
        self.log("CAPTCHA persists after max retries")
        return False
```

**最佳实践**:
- 验证码等待时间 30-60 秒
- 重新预热获取新 cookies
- 最大重试次数 2-3 次

### 2.4 代理轮换

**策略**: 从代理池中轮换使用代理

**实现**:
```python
class ProxyRotator:
    """代理轮换器"""
    
    def __init__(self, proxies: List[Dict[str, str]]):
        self.proxies = proxies
        self.current_index = 0
    
    def get_proxy(self) -> Optional[Dict[str, str]]:
        """获取下一个代理"""
        if not self.proxies:
            return None
        
        proxy = self.proxies[self.current_index]
        self.current_index = (self.current_index + 1) % len(self.proxies)
        return proxy
```

**最佳实践**:
- 代理池大小 5-10 个
- 代理质量：高匿代理
- 代理来源：付费代理服务

---

## 3. 数据提取

### 3.1 页面渲染

**策略**: 等待 SPA 渲染完成

**实现**:
```python
def wait_for_render(self, content: str) -> str:
    """等待 SPA 渲染"""
    if "doesn't work properly without JavaScript" in content:
        self.log("SPA shell detected, waiting for render...")
        time.sleep(8)
        return self._page.content()
    return content
```

**最佳实践**:
- 检测 SPA 壳
- 等待时间 5-10 秒
- 使用 Playwright 等待机制

### 3.2 数据提取模式

**策略**: 使用多种选择器提取数据

**实现**:
```python
def extract_data(self, page, url: str) -> dict:
    """提取页面数据"""
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
    
    # 使用正则表达式提取结构化数据
    date_match = re.search(r'发布时间[：:]*\s*(\d{4})年(\d{1,2})月(\d{1,2})日', body_text)
    ...
```

**最佳实践**:
- 使用多种选择器
- 正则表达式提取结构化数据
- 处理缺失字段

---

## 4. 错误处理

### 4.1 重试策略

**策略**: 失败后重试，指数退避

**实现**:
```python
def crawl_page(self, url: str) -> CrawlResult:
    """爬取单个页面"""
    for attempt in range(self.config.max_retries + 1):
        try:
            # 爬取逻辑
            ...
            return result
        except Exception as e:
            if attempt < self.config.max_retries:
                self.log(f"Error: {e}, retrying...")
                time.sleep(10)
            else:
                return CrawlResult(
                    url=url,
                    status='error',
                    error=str(e),
                )
```

**最佳实践**:
- 最大重试次数 2-3 次
- 重试延迟 10-30 秒
- 记录重试次数

### 4.2 超时处理

**策略**: 设置合理的超时时间

**实现**:
```python
self._page.goto(
    url,
    wait_until='domcontentloaded',
    timeout=self.config.timeout,
)
```

**最佳实践**:
- 页面加载超时 30 秒
- 资源加载超时 60 秒
- 脚本执行超时 10 秒

### 4.3 错误分类

**错误类型**:
- `timeout`: 超时错误
- `network`: 网络错误
- `captcha`: 验证码错误
- `parse`: 解析错误
- `unknown`: 未知错误

**处理策略**:
- 超时错误: 重试
- 网络错误: 重试
- 验证码错误: 等待后重试
- 解析错误: 记录日志，继续
- 未知错误: 记录日志，继续

---

## 5. 性能优化

### 5.1 并发控制

**策略**: 控制并发数量，避免被封

**实现**:
```python
import asyncio
from playwright.async_api import async_playwright

async def crawl_batch_async(self, urls: List[str], concurrency: int = 3):
    """异步批量爬取"""
    semaphore = asyncio.Semaphore(concurrency)
    
    async def crawl_with_semaphore(url):
        async with semaphore:
            return await self.crawl_page_async(url)
    
    tasks = [crawl_with_semaphore(url) for url in urls]
    return await asyncio.gather(*tasks)
```

**最佳实践**:
- 并发数 3-5 个
- 使用信号量控制
- 避免过高并发

### 5.2 资源管理

**策略**: 及时释放浏览器资源

**实现**:
```python
def cleanup_browser(self):
    """清理浏览器资源"""
    if self._page:
        self._page.close()
    if self._context:
        self._context.close()
    if self._browser:
        self._browser.close()
```

**最佳实践**:
- 使用 with 语句
- 及时关闭页面
- 定期重启浏览器

### 5.3 缓存策略

**策略**: 缓存已爬取的数据

**实现**:
```python
# 使用 Redis 缓存
import redis

class CachedCrawler(CrawlerBase):
    def __init__(self, config, redis_client):
        super().__init__(config)
        self.redis = redis_client
    
    def crawl_page(self, url: str) -> CrawlResult:
        # 检查缓存
        cached = self.redis.get(url)
        if cached:
            return json.loads(cached)
        
        # 爬取
        result = super().crawl_page(url)
        
        # 缓存结果
        self.redis.setex(url, 3600, json.dumps(asdict(result)))
        
        return result
```

**最佳实践**:
- 缓存时间 1-24 小时
- 使用 Redis 或内存缓存
- 缓存 key 使用 URL

---

## 6. 监控与日志

### 6.1 日志规范

**日志级别**:
- `INFO`: 正常操作
- `WARNING`: 警告信息
- `ERROR`: 错误信息
- `DEBUG`: 调试信息

**日志格式**:
```
[2026-07-07 10:00:00] [QianlimaCrawler] Starting batch crawl: 10 URLs
[2026-07-07 10:00:01] [QianlimaCrawler] [1/10] Crawling: https://...
[2026-07-07 10:00:05] [QianlimaCrawler]   Success: 123,456 chars
```

### 6.2 统计指标

**统计指标**:
- `total`: 总数
- `success`: 成功数
- `failed`: 失败数
- `partial`: 部分成功数
- `captcha`: 验证码数
- `retries`: 重试次数
- `success_rate`: 成功率
- `avg_duration`: 平均耗时

### 6.3 告警机制

**告警条件**:
- 成功率 < 80%
- 平均耗时 > 30 秒
- 验证码率 > 10%
- 连续失败 > 5 次

**告警方式**:
- 邮件通知
- 企微群通知
- 短信通知

---

## 7. 法律合规

### 7.1 robots.txt

**规范**: 遵守 robots.txt 规则

**检查**:
```python
import urllib.robotparser

def check_robots_txt(url):
    """检查 robots.txt"""
    rp = urllib.robotparser.RobotFileParser()
    rp.set_url(f"{url}/robots.txt")
    rp.read()
    return rp.can_fetch('*', url)
```

### 7.2 请求频率

**规范**: 控制请求频率，避免对目标网站造成压力

**建议**:
- 请求间隔 10-15 秒
- 每小时请求 < 1000 次
- 避免高峰时段爬取

### 7.3 数据使用

**规范**: 合法使用爬取的数据

**建议**:
- 仅用于研究目的
- 不用于商业用途
- 不侵犯版权
- 保护用户隐私

---

## 8. 测试策略

### 8.1 单元测试

**测试内容**:
- 配置验证
- 重试逻辑
- 验证码检测
- 代理轮换
- 统计计算

### 8.2 集成测试

**测试内容**:
- 爬虫基类功能
- 子类实现
- 数据提取
- 错误处理

### 8.3 性能测试

**测试内容**:
- 爬取速度
- 内存使用
- CPU 使用
- 网络带宽

---

## 9. 部署与运维

### 9.1 部署方式

**方式**:
- Docker 容器
- 虚拟机
- 云服务器

**建议**:
- 使用 Docker 部署
- 配置资源限制
- 监控资源使用

### 9.2 定时任务

**配置**:
```python
import schedule

def crawl_job():
    """定时爬取任务"""
    crawler = QianlimaCrawler()
    urls = load_urls_from_file('urls.txt')
    crawler.crawl_batch(urls)

# 每天凌晨 2 点执行
schedule.every().day.at("02:00").do(crawl_job)
```

### 9.3 监控告警

**监控指标**:
- 爬取成功率
- 平均耗时
- 错误率
- 资源使用

**告警配置**:
- 成功率 < 80%: 告警
- 平均耗时 > 30s: 告警
- 错误率 > 20%: 告警

---

## 10. 最佳实践总结

### 10.1 反爬策略

- Cookie 预热
- 请求延迟
- 验证码处理
- 代理轮换
- User-Agent 轮换

### 10.2 数据提取

- 多种选择器
- 正则表达式
- 处理缺失字段
- 数据清洗

### 10.3 错误处理

- 重试策略
- 超时处理
- 错误分类
- 日志记录

### 10.4 性能优化

- 并发控制
- 资源管理
- 缓存策略
- 定时任务

---

## 11. 参考资源

- [Playwright 官方文档](https://playwright.dev/python/)
- [Scrapy 官方文档](https://docs.scrapy.org/)
- [反爬虫技术](https://www.zhihu.com/topic/19552631)
- [代理池搭建](https://github.com/jhao104/proxy_pool)

---

## 12. 更新日志

- **v1.0** (2026-07-07): 初始版本，定义爬虫最佳实践和反爬策略
