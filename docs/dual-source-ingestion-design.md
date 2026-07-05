# 双数据源采集架构设计 — Dual-Source Ingestion Architecture

> 版本: v2 (实施后修订)  
> 日期: 2026-07-05  
> 状态: Phase 1-2 完成，Phase 3 进行中

## 概述

将招标数据采集从单一依赖知了标讯 API 扩展为 **双数据源架构**：
系统可选择从 **外部（知了 API）** 或 **内部（Scrapling 自爬）** 采集数据，
两者写入同一张 `bidding_notice` 表，下游管线无需感知数据来源。

## 设计目标

1. **零破坏**：现有 Zhiliao 采集流程完全不变，默认行为不变
2. **可切换**：通过 `system_config` 配置数据源模式，无需改代码
3. **可回退**：Scrapling 出问题时自动 fallback 到 Zhiliao
4. **可审计**：每次采集记录 `crawl_run`，追踪数据来源和成功率
5. **渐进式**：一个平台一个平台接入 Scrapling，逐步减少 Zhiliao 依赖

## 架构

```
                      system_config
                  datasource.mode = "external"
                              | "internal"
                              | "hybrid"
                           │
                ┌──────────▼──────────┐
                │   Ingestion Router   │
                │  (ingestion.js v3)   │
                └──┬───────────────┬───┘
                   │               │
        ┌──────────▼─────┐  ┌─────▼──────────────┐
        │  Zhiliao API   │  │  Scrapling Engine   │
        │  (zhiliao-api) │  │  (Python service)   │
        │                │  │                     │
        │  searchBids()  │  │  per-platform:      │
        │  queryAdv()    │  │  ├─ requests_plain  │
        │  getDetail()   │  │  ├─ playwright_*    │
        │                │  │  └─ api_*           │
        └───────┬────────┘  └─────┬───────────────┘
                │                 │
                └────────┬────────┘
                         │
              ┌──────────▼──────────┐
              │   dedupAndInsert()   │
              │   → bidding_notice   │
              └─────────────────────┘
```

## 数据源模式 (datasource.mode)

| 模式 | 行为 |
|---|---|
| `external` | 仅用 Zhiliao（当前默认，不改变任何行为） |
| `internal` | 仅用 Scrapling 自爬 |
| `hybrid` | Scrapling 优先，Zhiliao 补充/兜底 |

当前状态: **`hybrid`** (Scrapling + Zhiliao 双通道)

## 实施结果

### 已验证平台 (5个，421条记录)

| # | 平台 | 策略 | 记录数 | 速度 | 备注 |
|---|---|---|---|---|---|
| 63 | 中国政府采购网 | `requests_plain` | 214 | 0.15s/页 | Server-rendered，10页翻页 |
| 58 | 中国采购与招标网 | `playwright_undetected` | 118 | 3.8s | SPA，需浏览器渲染 |
| 10 | 千里马招标网 | `requests_plain` | 29 | 0.18s | SPA壳但HTTP可提取列表链接 |
| 43 | 广东志正招标 | `requests_plain` | 60 | 0.2s/页 | ASP经典站，翻页完美 |
| | **合计** | | **421** | | |

### 已配置但未验证 (11个 epoint 系)

| 平台 | 策略 | 状态 |
|---|---|---|
| 佛山/珠海/惠州公共资源 | `requests_post_xml` | 需中国大陆服务器（TLS/geo-blocked） |
| 东莞/中山/江门/湛江/汕头/茂名/肇庆/揭阳 | `requests_post_xml` | 同上 |

### 关键发现

#### 1. 站点类型分布

| 类型 | 数量 | 采集难度 | 代表 |
|---|---|---|---|
| Server-rendered (静态HTML) | ~15 | ⭐ 简单 | ccgp.gov.cn, gdzzzb.com |
| SPA (Vue/React) | ~20 | ⭐⭐⭐ 中等 | chinabidding.com, gdgpo.czt.gd.gov.cn |
| API驱动SPA | ~10 | ⭐⭐⭐⭐ 困难 | jianyu360.com (需逆向API) |
| 需登录 | ~10 | ⭐⭐⭐⭐ 困难 | 华为/比亚迪/腾讯SRM |

#### 2. 基础设施限制

| 限制 | 影响范围 | 解决方案 |
|---|---|---|
| **TLS不兼容** | ~15个站点 | curl_cffi的OpenSSL不支持国密SM2/SM4；需部署到中国大陆服务器 |
| **地理封锁** | 11个epoint城市站点 | 政府平台仅限大陆IP访问 |
| **SPA壳页面** | ~10个站点 | HTML为空壳，内容通过XHR加载；需逆向API或浏览器网络拦截 |

#### 3. Scrapling Fetcher 实际效果

| 策略 | 实际表现 | 适用场景 |
|---|---|---|
| `requests_plain` | ✅ 最快，0.1-0.3s/页 | Server-rendered站点 (ccgp, gdzzzb, qianlima) |
| `playwright_undetected` | ✅ 可用，3-15s/页 | SPA站点需浏览器渲染 (chinabidding) |
| `requests_with_ja3` | ❌ TLS错误 | curl_cffi TLS指纹模拟对政府站点无效 |
| `requests_post_xml` | ❌ TLS错误 | epoint系站点需大陆网络 |

## 文件清单

| 文件 | 说明 | 状态 |
|---|---|---|
| `docs/dual-source-ingestion-design.md` | 本设计文档 | ✅ |
| `supabase/migrations/022_dual_source_ingestion.sql` | DDL: crawl_run表 + selectors字段 + system_config | ✅ 已执行 |
| `scripts/scrapling_engine.py` | Scrapling 爬虫引擎 (Python) | ✅ 已测试 |
| `src/server/services/scrapling-client.js` | Node.js ↔ Python 桥接 + crawl_run审计 | ✅ 已测试 |
| `src/server/services/ingestion.js` | v3: 数据源路由 (external/internal/hybrid) | ✅ 已测试 |
| `src/server/routes/crawl.js` | 采集管理 API | ✅ 已注册 |

## API 端点

| 端点 | 方法 | 说明 |
|---|---|---|
| `POST /api/crawl/run` | 手动触发采集 | 支持指定platform_id或全量 |
| `POST /api/crawl/scrapling` | 仅Scrapling采集 | 支持按平台/类型/地区过滤 |
| `GET /api/crawl/runs` | 查看采集记录 | 分页，支持按platform/source/status过滤 |
| `GET /api/crawl/stats` | 采集统计概览 | 按数据源对比，按天统计 |
| `PUT /api/crawl/config` | 更新数据源配置 | mode, 开关, 并发, 限额 |
| `GET /api/crawl/platforms/ready` | 已配置平台列表 | 显示哪些平台有selectors |

## 后续计划

### Phase 3: 扩展覆盖 (进行中)

**短期可做 (无需大陆服务器):**
- 逆向剑鱼招标网 API — 站点内容通过XHR加载，需抓取API端点
- 逆向广东政府采购网 Vue app API — SPA壳已渲染，需找数据接口
- 配置更多静态站点的 selectors

**需要大陆服务器:**
- 部署 Scrapling 引擎到阿里云广州
- 批量接入 11 个 epoint 城市站点
- 解决 TLS 国密兼容问题

### Phase 4: 深度采集

- 详情页爬取 — 从列表页跟进到详情页，提取完整正文
- 附件下载 — 替代 Zhiliao 的 getBidDetail()
- AI 提取 — 详情页正文 → mimo 评分标准/资质要求

### Phase 5: 生产化

- 定时调度 — 接入现有 scheduler.js
- 告警机制 — crawl_run 失败率过高时通知
- 数据质量对比 — Scrapling vs Zhiliao 覆盖率/时效性对比

## 已知问题

| 问题 | 影响 | 状态 |
|---|---|---|
| URL中多余点号 (ccgp.gov.cn./) | source_url格式不规范 | ✅ 已修复 (urljoin) |
| keyword_source列不存在 | insert失败 | ⚠️ 需执行migration 021 |
| dedup未按platform_id过滤 | 跨平台重复误判 | ✅ 已修复 |
| SPA翻页URL无效 | 单页模式，无法翻页 | ⚠️ 需逆向API或浏览器翻页 |
| curl_cffi TLS不兼容 | ~15站点无法访问 | ⚠️ 需大陆服务器或TLS代理 |
