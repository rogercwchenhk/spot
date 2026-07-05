# Scrapling 采集研究测试报告

> 版本: v1.0 | 日期: 2026-07-06  
> 研究周期: 2026-07-05 ~ 2026-07-06  
> 目标: 评估 Scrapling 替代知了API 的可行性，扩展自有数据源覆盖

---

## 1. 研究结论

### 核心发现

| 结论 | 说明 |
|---|---|
| **Scrapling 可用于列表页采集** | 4个平台验证通过，542条记录/页 |
| **详情页受限于反爬机制** | 千里马419限流，chinabidding SPA壳 |
| **国密TLS是最大障碍** | 15+政府站点无法访问，需大陆服务器+国密库 |
| **双数据源架构已落地** | Scrapling + Zhiliao 可切换/可回退 |

### 可用平台（列表页）

| 平台 | 记录数/页 | 速度 | 选择器策略 |
|---|---|---|---|
| 中国政府采购网 | 214 | 0.15s | `li a` + URL翻页 |
| 中国采购与招标网 | 174 | 0.44s | `li.news-info-item` + `a[title]` |
| 千里马招标网 | 94 | 0.15s | `a[href*='/bid-']` 直接匹配 |
| 广东志正招标 | 60 | 0.2s | ASP经典站翻页 |

**总计: 542条/次采集**

---

## 2. 平台逐一测试结果

### 2.1 中国政府采购网 (ccgp.gov.cn) ✅

**类型**: Server-rendered 静态HTML  
**策略**: `requests_plain`  
**结果**: 214条/10页，完美

| 项目 | 结果 |
|---|---|
| 首页 | 200 OK, 0.15s |
| 翻页 | `index_{page}.htm` URL参数翻页 |
| 详情页 | 可访问，但未测试提取 |
| 反爬 | 无明显反爬 |

**选择器配置**:
```json
{
  "list_item": "li a",
  "link_base": "http://www.ccgp.gov.cn",
  "pagination": {"type": "url_param", "base_url": ".../index_{page}.htm", "max_pages": 10}
}
```

---

### 2.2 中国采购与招标网 (chinabidding.com) ✅

**类型**: 混合（首页静态，详情页SPA）  
**策略**: `requests_plain`  
**结果**: 174条/页，列表页完美

| 项目 | 结果 |
|---|---|
| 首页 | 200 OK, 0.44s, 217个`li.news-info-item` |
| 标题 | `a[title]`属性（完整标题，不截断） |
| 日期 | `span.time` (MM-DD格式) |
| 详情页 | ❌ SPA壳（2,842 chars），需浏览器渲染 |
| 反爬 | 无明显反爬 |

**关键发现**:
- 首页有两类链接：`/bidDetail/`（招标）和 `/infoDetail/`（新闻）
- 需用 `link_pattern: "/bidDetail/"` 过滤新闻
- 标题在 `a[title]` 属性中，比 `::text` 更完整

**选择器配置**:
```json
{
  "list_item": "li.news-info-item",
  "title_selector": "a[title]",
  "link_selector": "a",
  "date_selector": "span.time",
  "link_pattern": "/bidDetail/",
  "date_format": "MM-DD"
}
```

---

### 2.3 千里马招标网 (qianlima.com) ✅ 列表 / ⚠️ 详情

**类型**: 混合布局（表格+列表）  
**策略**: `requests_plain` 列表 / `playwright` 详情  
**结果**: 94条列表页 / 详情页受限流

#### 列表页

| 项目 | 结果 |
|---|---|
| 首页 | 200 OK, 0.15s, 105个bid链接 |
| 布局 | 混合：表格8条 + 列表86条 |
| 标题 | 截断（"某公司..."），详情页才有完整标题 |
| 日期 | 表格 `td[3]` 或列表 `li > span`（MM-DD格式） |
| 反爬 | 列表页无反爬 |

**关键发现**:
- 不能用 `table tr` 只匹配表格，会遗漏86条列表项
- 最佳选择器：`a[href*="/bid-"]` 直接匹配所有bid链接
- 需要分别处理表格（`parent.tag == 'td'`）和列表（`parent.css('span')`）的日期提取

**选择器配置**:
```json
{
  "list_item": "a[href*=\"/bid-\"]",
  "date_class": "span",
  "link_base": "https://www.qianlima.com"
}
```

#### 详情页（华为云WAF反爬）

| 项目 | 结果 |
|---|---|
| HTTP直接访问 | ❌ 419 (HuaweiCloudWAF 人机验证) |
| StealthyFetcher | ❌ 419（被检测为headless浏览器） |
| Playwright + 首页预热 | ✅ 首次成功，后续419 |

**成功策略（Playwright + 首页预热）**:
```python
# 1. 首页获取cookies（18个）
page.goto('https://www.qianlima.com')
time.sleep(3)

# 2. 访问详情页
page.goto(detail_url)
time.sleep(5)  # 等待Vue渲染

# 3. 提取内容
body = page.inner_text('body')
```

**反爬机制分析**:
- **华为云WAF** — 检测IP频率、浏览器指纹、Cookie完整性
- **限流触发条件** — 短时间内多次请求（>3次/分钟）
- **限流持续时间** — 至少30分钟以上
- **绕过难度** — 中等（需代理轮换或限制请求频率）

**成功提取的字段**:
```
标题: 某公司智慧充电集成服务（二次）招议标公告资料征集中
地区: 安徽-蚌埠
发布: 2026年05月09日
截止: 2026年06月18日
正文: 2,319字符（项目详情、资质要求等）
```

---

### 2.4 广东志正招标 (gdzzzb.com) ✅

**类型**: ASP经典站  
**策略**: `requests_plain`  
**结果**: 60条/页，翻页完美

| 项目 | 结果 |
|---|---|
| 首页 | 200 OK, 0.2s |
| 翻页 | ASP POST翻页 |
| 反爬 | 无 |

---

### 2.5 标讯快车 (biaoxunkuaiche.com) ❌

**失败原因**: SSL证书过期（服务器端问题）  
**状态**: 站点可能已停止维护

---

### 2.6 招标信息网 (bidnews.cn) ❌

**失败原因**: SPA + 超时  
**测试结果**:
- HTTP: 200 OK, 但0个链接（SPA壳）
- 浏览器: 30秒超时，页面无法加载

---

### 2.7 中国招标网 (zbcg.cn) ❌

**失败原因**: TLS不兼容（国密SM2/SM4）  
**测试结果**:
- curl_cffi: TLS connect error
- requests: SSL UNEXPECTED_EOF_WHILE_READING
- Playwright: ERR_CONNECTION_CLOSED

---

### 2.8 广东政府采购网 (gdgpo.czt.gd.gov.cn) ⚠️

**类型**: Vue SPA + Gateway认证  
**状态**: API需登录token，逆向复杂度高

**技术分析**:
- 前端: Vue SPA (`gpcms-center-web`)
- 网关: `/gateway/` 统一入口
- API: `rest/web/v2/info/selectOpenTenderInfo` 等
- 认证: 所有API需OAuth token

---

### 2.9 epoint 城市站点（11个）❌

**站点**: 佛山/珠海/惠州/东莞/中山/江门/湛江/汕头/茂名/肇庆/揭阳  
**失败原因**: TLS国密不兼容 + 部分站点Connection Reset

| 站点 | 结果 |
|---|---|
| 佛山 | Connection reset by peer |
| 珠海 | TLS error (国密) |
| 惠州 | TLS error (国密) |
| 东莞 | 200 OK, 但SPA壳（2,556 chars） |

---

## 3. 技术发现汇总

### 3.1 站点类型分布

| 类型 | 数量 | 采集难度 | 代表 |
|---|---|---|---|
| Server-rendered (静态HTML) | ~15 | ⭐ 简单 | ccgp.gov.cn, gdzzzb.com |
| SPA (Vue/React) | ~20 | ⭐⭐⭐ 中等 | chinabidding.com, gdgpo.czt.gd.gov.cn |
| API驱动SPA | ~10 | ⭐⭐⭐⭐ 困难 | jianyu360.com (需逆向API) |
| 需登录 | ~10 | ⭐⭐⭐⭐ 困难 | 华为/比亚迪/腾讯SRM |

### 3.2 反爬机制分布

| 机制 | 影响站点 | 绕过难度 | 解决方案 |
|---|---|---|---|
| **华为云WAF** | 千里马 | 中 | 代理轮换 + 请求限速 |
| **国密TLS** | 15+政府站点 | 高 | 需国密TLS库 + 大陆服务器 |
| **SPA壳** | ~20个站点 | 中 | Playwright浏览器渲染 |
| **IP地理封锁** | 部分政府站点 | 高 | 大陆服务器部署 |
| **Cloudflare** | 少量站点 | 高 | undetected-chromedriver |

### 3.3 Fetcher 策略效果

| 策略 | 实际表现 | 适用场景 |
|---|---|---|
| `requests_plain` | ✅ 最快，0.1-0.5s/页 | Server-rendered站点 |
| `playwright_undetected` | ✅ 可用，5-15s/页 | SPA站点需浏览器渲染 |
| `requests_with_ja3` | ❌ TLS错误多 | curl_cffi TLS指纹对政府站点无效 |
| `requests_post_xml` | ❌ TLS错误 | epoint系站点需大陆网络 |

### 3.4 选择器模式总结

| 模式 | 适用场景 | 示例 |
|---|---|---|
| 旧格式 `list_item: "li a"` | 链接直接在容器中 | ccgp.gov.cn |
| 新格式 `list_item` + `link_selector` | 容器内需二次定位 | chinabidding.com |
| 直接匹配 `a[href*='pattern']` | 混合布局，统一匹配 | qianlima.com |

**新格式字段**:
```json
{
  "list_item": "li.news-info-item",  // 容器选择器
  "title_selector": "a[title]",       // 标题选择器（优先title属性）
  "link_selector": "a",               // 链接选择器
  "date_selector": "span.time",       // 日期选择器
  "link_pattern": "/bidDetail/",      // 链接过滤模式
  "date_format": "MM-DD"              // 日期格式
}
```

---

## 4. 关键经验教训

### 4.1 IP限流管理

**问题**: 千里马详情页在连续请求后触发华为云WAF限流（419）  
**教训**:
- 单IP每小时最多爬取5-10个详情页
- 列表页不受限流影响（可大量爬取）
- 限流触发后至少持续30分钟

**建议**:
- 详情页采集与列表页分开调度
- 详情页使用代理轮换
- 优先爬取 strong/yes 级别的详情页

### 4.2 SPA页面处理

**问题**: chinabidding.com、bidnews.cn 等SPA站点返回空壳  
**教训**:
- HTTP只能获取Vue/React的空壳HTML
- 必须用Playwright等浏览器引擎渲染
- 浏览器模式速度慢（5-15s/页）且资源占用大

**建议**:
- SPA站点优先找API端点（逆向XHR请求）
- 无API时才用浏览器渲染
- 浏览器渲染需等待足够时间（5-10秒）

### 4.3 国密TLS兼容

**问题**: 15+政府站点使用国密SM2/SM4加密，curl_cffi/OpenSSL不支持  
**教训**:
- 这不是IP地理封锁，是TLS库兼容性问题
- 即使用大陆IP+浏览器也无法访问（ERR_CONNECTION_CLOSED）
- 需要支持国密的TLS库（如GmSSL）

**建议**:
- 短期：放弃这些站点，用知了API覆盖
- 长期：部署到大陆服务器 + 安装国密TLS库

### 4.4 日期格式处理

**问题**: 不同站点日期格式差异大  
**发现**:
- `YYYY-MM-DD` — 标准格式
- `MM-DD` — 千里马、chinabidding（需补充年份）
- `YYYY年MM月DD日` — 中文格式
- 日期可能在不同位置：`td[3]`、`span.time`、`.date`

**解决方案**: 引擎支持 `date_format: "MM-DD"` 自动补充年份

### 4.5 混合布局处理

**问题**: 千里马首页同时有表格和列表两种布局  
**教训**:
- 不能用 `table tr` 只匹配表格，会遗漏列表项
- 最佳方案：用 `a[href*='/bid-']` 直接匹配链接，绕过容器差异
- 日期提取需判断父元素类型（`td` vs `li`）

---

## 5. 实施成果

### 5.1 代码产出

| 文件 | 功能 | 行数 |
|---|---|---|
| `scripts/scrapling_engine.py` | Scrapling爬虫引擎 | ~350 |
| `scripts/qianlima-detail.py` | 千里马详情页爬虫 | ~250 |
| `src/server/services/scrapling-client.js` | Node.js桥接 | 182 |
| `src/server/services/qianlima-detail.js` | 详情页桥接 | 120 |
| `src/server/services/ingestion.js` | 双数据源路由 | 373 |
| `src/server/routes/crawl.js` | 采集管理API | 330 |
| `cli/commands/crawl.js` | CLI采集命令 | 150 |
| `supabase/migrations/022-023.sql` | 数据库迁移 | 180 |

### 5.2 数据库变更

- `crawl_run` 表 — 采集运行记录审计
- `platform_source` 新增字段 — `extraction_selectors`, `pagination_config`, `detail_selectors`
- `system_config` 新增 — 数据源模式/Scrapling开关/并发/限额/超时

### 5.3 API端点

| 端点 | 方法 | 说明 |
|---|---|---|
| `POST /api/crawl/run` | 手动触发采集 | 支持指定platform_id或全量 |
| `POST /api/crawl/scrapling` | 仅Scrapling采集 | 支持按平台/类型/地区过滤 |
| `GET /api/crawl/runs` | 查看采集记录 | 分页，支持过滤 |
| `GET /api/crawl/stats` | 采集统计概览 | 按数据源对比 |
| `POST /api/crawl/detail/:id` | 爬取千里马详情页 | Playwright浏览器模式 |
| `POST /api/crawl/detail-batch` | 批量详情页爬取 | 可配置延迟和数量 |

---

## 6. 后续建议

### 短期（无需大陆服务器）

| 优先级 | 任务 | 说明 |
|---|---|---|
| P0 | 列表页定时采集 | 已验证4个平台，接入scheduler.js |
| P1 | 详情页限量采集 | 每天10条strong/yes级别，用知了API补充 |
| P2 | 逆向更多SPA站点API | chinabidding详情页API |

### 中期（需大陆服务器）

| 优先级 | 任务 | 说明 |
|---|---|---|
| P0 | 部署到阿里云广州 | 解锁epoint 11个城市站点 |
| P1 | 安装国密TLS库 | 解锁15+政府站点 |
| P2 | 代理IP池 | 千里马详情页大量采集 |

### 长期

| 任务 | 说明 |
|---|---|
| 知了API + Scrapling覆盖率对比 | 量化自有数据源的价值 |
| 详情页AI提取 | 正文 → 资质要求/评分标准 |
| 数据质量监控 | Scrapling vs Zhiliao 时效性对比 |

---

## 7. 决策记录

| 日期 | 决策 | 原因 |
|---|---|---|
| 2026-07-05 | 放弃剑鱼招标网 | 无API，逆向复杂度高 |
| 2026-07-05 | 放弃标讯快车 | SSL证书过期，站点可能停维 |
| 2026-07-05 | 暂缓广东政府采购网 | API需OAuth认证，逆向复杂 |
| 2026-07-05 | 千里马详情页用Playwright | HTTP被419，浏览器首次可过 |
| 2026-07-06 | 详情页限量采集 | IP限流严重，需代理轮换 |
