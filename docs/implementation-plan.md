# 客户雷达 — 实施计划

> 版本: v2.2 | 日期: 2026-07-06 | 基于 PRD v2.0 + 需求烤问结论
> 状态: Phase 1-5 全部完成，前端全面测试通过，安全加固完毕

---

## 0. 与 PRD v1.1 的差异说明

PRD v1.1 是一份优秀的技术架构文档，但经过需求烤问后，以下几点需要调整：

| # | PRD v1.1 原方案 | 调整后 | 原因 |
|---|---|---|---|
| 1 | Phase 1 就搭爬虫框架 | MVP 只接知了 API，爬虫第二阶段 | 知了 API 是主源，爬虫复杂度高、收益不确定 |
| 2 | 无资格匹配功能 | 新增资格匹配引擎 + 扣分预估 | 核心差异化：从"看标讯"升级到"算能不能投" |
| 3 | 无资质库 | 新增公司资质表 + 人员资质表 | 匹配引擎的数据基础 |
| 4 | Python 做后端 | Node.js (Express) | 与已有项目经验一致，一套栈维护成本最低 |
| 5 | OpenAI GPT-4o-mini | 小米 mimo-v2.5-pro | 开发者选定模型 |
| 6 | 无 PWA | PWA 优先 | 销售用手机看，固定到主屏幕 |
| 7 | 无通知推送 | 企微群机器人 webhook | 销售不用主动打开也能收到新标讯 |
| 8 | 语义搜索/RAG | 第二阶段 | MVP 用关键词搜索 + 标签筛选足够 |
| 9 | 公司名"广东佳途科技" | 广东励康信息技术有限公司 | 修正公司名 |
| 10 | 无同类项目经验匹配 | 新增产品线匹配逻辑 | 以运维主要产品类似为准 |
| 11 | 无 CLI | 第二阶段新增 CLI 工具 | 供 AI Agent 使用 |

**保留 PRD 的优秀设计**：AI 状态机（7 态）、平台技术画像、爬虫策略模式、标签行级存储、数据分层存储。这些在后续阶段直接可用。

---

## 1. 核心产品定义

### 1.1 一句话

> 广东励康的标讯情报系统：自动采集招标公告，AI 提取结构化字段，对照公司资质算出"能不能投、扣几分"。

### 1.2 用户

- **商务人员**：手机打开 PWA，看今日新标讯，看匹配结果，跟进/忽略
- **销售管理者**：看团队跟进状态，看趋势，做决策

### 1.3 核心价值链

```
知了标讯 API ──→ 入库 ──→ AI 提取结构化字段 ──→ 资格匹配 + 扣分预估 ──→ PWA 展示
                                                                        ──→ 企微推送
```

### 1.4 MVP 范围边界

**做（Phase 1-2，共 3 周）：**
- 知了标讯 API 对接（主数据源，广东省 IT 运维类公告）
- AI 元数据提取（规则引擎 + mimo 补充分类）
- 公司资质库 + 人员资质库 + 合同业绩库
- 能力匹配引擎（五维评分，100 分制）
- 招标文件获取方式标记 (doc_access_type)
- PWA 前端（React + Vite + shadcn/ui + Tailwind CSS）
- 企微群机器人 webhook 推送
- 基础筛选和搜索

**不做（第三阶段+）：**
- 自建平台爬虫（逐步扩展 3 个左右）
- CLI 工具
- 中标公告分析 / 竞品档案
- 语义搜索 / RAG
- 资质到期预警
- 趋势分析仪表盘

---

## 2. 技术架构

```
┌─────────────────────────────────────────────────┐
│            PWA 前端 (React + Vite)               │
│  标讯列表 / 标讯详情 / 匹配结果 / 资质管理          │
└────────────────────┬────────────────────────────┘
                     │ Supabase Client SDK
┌────────────────────┴────────────────────────────┐
│           Supabase (PostgreSQL 15+)              │
│  platform_source / bidding_notice / notice_tag   │
│  company_qualification / personnel_qualification │
│  match_result                                    │
│  RLS / Auth                                      │
└────────────────────┬────────────────────────────┘
                     │ service_role
┌────────────────────┴────────────────────────────┐
│           后端服务 (Node.js + Express)             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ 知了API   │  │ AI Pipeline│  │ 匹配引擎  │       │
│  │ 数据采集  │  │ mimo-v2.5 │  │ 规则匹配  │       │
│  └──────────┘  └──────────┘  └──────────┘       │
│  ┌──────────┐  ┌──────────┐                      │
│  │ 企微推送  │  │ 定时调度  │                      │
│  └──────────┘  └──────────┘                      │
└─────────────────────────────────────────────────┘
```

### 2.1 技术选型

| 层 | 选型 | 理由 |
|---|---|---|
| 前端 | React 19 + Vite + Tailwind CSS + lucide-react + Recharts | 国际化视觉质感，自定义组件，响应式灵活 |
| 后端 | Node.js + Express | 与已有项目经验一致，一套栈 |
| 数据库 | Supabase (PostgreSQL 15+) | 已有部署经验，RLS/Auth 内置 |
| AI 模型 | 小米 mimo-v2.5-pro | 开发者选定，结构化提取能力强 |
| 定时调度 | node-cron | 轻量，无需额外基础设施 |
| 推送 | 企微群机器人 webhook | 一行代码，销售零门槛使用 |
| 部署 | Vercel (前端) + Railway/自建 (后端) | 低成本，快速上线 |

---

## 3. 数据库设计

### 3.1 新增表

在 PRD 已有表基础上，新增以下表：

#### company_qualification — 公司资质表

```sql
CREATE TABLE company_qualification (
  id              SERIAL PRIMARY KEY,
  qual_type       VARCHAR(50) NOT NULL,
  qual_name       VARCHAR(200) NOT NULL,
  qual_level      VARCHAR(50),
  cert_number     VARCHAR(100),
  issue_date      DATE,
  expiry_date     DATE,
  issuing_body    VARCHAR(200),
  scope           TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### personnel_qualification — 人员资质表

```sql
CREATE TABLE personnel_qualification (
  id              SERIAL PRIMARY KEY,
  person_name     VARCHAR(50) NOT NULL,
  qual_type       VARCHAR(50) NOT NULL,
  qual_name       VARCHAR(200) NOT NULL,
  cert_number     VARCHAR(100),
  issue_date      DATE,
  expiry_date     DATE,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### match_result — 匹配结果表

```sql
CREATE TABLE match_result (
  id              BIGSERIAL PRIMARY KEY,
  notice_id       BIGINT NOT NULL REFERENCES bidding_notice(id) ON DELETE CASCADE,
  total_deduction DECIMAL(5,2) DEFAULT 0,
  recommend_level VARCHAR(20) NOT NULL
    CHECK (recommend_level IN ('strong', 'yes', 'risky', 'no')),
  match_details   JSONB NOT NULL,
  unmatched_items JSONB,
  risk_notes      TEXT[],
  calculated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (notice_id)
);
```

### 3.2 bidding_notice 补充字段

```sql
ALTER TABLE bidding_notice
  ADD COLUMN data_source VARCHAR(50) DEFAULT 'zhiliao_api';
```

---

## 4. AI Pipeline 设计

### 4.1 数据源约束

**知了 API 只返回元数据，不含招标文件正文。** 标讯的 `notice_content` 始终为空。

招标文件（含资质要求、评分标准）在原发布网站，获取方式各异：
- 免费下载 → 优先获取（第二阶段）
- 收费购买 → 跳过并标记 `doc_access_type = 'paid'`
- 需要报名 → 标记 `doc_access_type = 'registration_required'`，人工跟进

**约束：收费招标文件一律跳过，不付费获取。**

### 4.2 AI Pipeline v2（元数据提取）

因为没有招标文件正文，AI Pipeline 改为基于标题+元数据做分类提取：

**规则引擎**（快速免费，覆盖约 70% 标讯）：
- 技术关键词：14 种正则模式（小型机/存储/数据库/服务器/网络/虚拟化/桌面/安全/云/机房/ERP/监控/备份/容器）
- 行业分类：8 种模式（金融/医疗/电力能源/交通/教育/政府/通信/制造业）
- 项目类型：7 种模式（运维/驻场运维/桌面运维/系统集成/咨询/安全服务/培训）

**AI 补充**（仅在规则引擎无法确定时调用 mimo）：
- 输入：标题 + sm_names + caller_name + 地区 + 预算
- 输出：industry_type + project_type + tech_keywords + confidence

**不提取**：资质要求、评分标准、摘要（因为没有正文内容）

### 4.3 匹配引擎 v2（能力匹配）

因为没有招标文件的资质要求，改为评估公司已有能力与标讯需求的契合度：

```
五维评分（满分 100）：
1. 技术关键词匹配 (30分) — 公司资质+合同关键词 vs 标讯 tech_keywords
2. 行业经验匹配   (25分) — 公司合同 industry vs 标讯 industry_type
3. 项目类型匹配   (20分) — 公司合同 service_type vs 标讯 project_type
4. 地区匹配       (15分) — 公司合同 region vs 标讯 region（广东省内互通）
5. 同类业绩匹配   (10分) — 近 3 年同类合同（服务类型+行业+技术关键词）

推荐等级：
  >= 80: strong (强推)
  >= 60: yes    (可以投)
  >= 40: risky  (风险)
  <  40: no     (不建议)
```

**当前数据**：226 条标讯 → 7 strong / 54 yes / 122 risky / 43 no

---

## 5. 前端设计 (PWA)

### 5.1 页面结构

| 页面 | 功能 | 优先级 |
|---|---|---|
| 工作台 | 统计卡片 + 匹配分布 + 最近标讯 + 快捷入口 | P0 |
| 标讯列表 | 按匹配等级筛选 Tab + 分页 + 匹配分数条 | P0 |
| 标讯详情 | 结构化信息 + AI 提取 + 匹配维度分析 | P0 |
| 资质管理 | 公司资质 + 人员资质 CRUD（admin 编辑，viewer 只读） | P0 |
| 合同业绩库 | 搜索/分页/CRUD + 防抖（admin 编辑，viewer 只读） | P0 |
| 数据看板 | 趋势图 + 行业饼图 + 地区柱状图 (Recharts) | P0 |
| 标讯搜索 | 关键词搜索 + 热门标签 | P1 |
| 平台管理 | 平台 CRUD（admin only） | P1 |
| 设置 | 配置/关键词策略/时间管理/用户管理（admin only） | P1 |
| 通知中心 | 未读通知 + 标记已读（NotificationBell） | P1 |
| 忘记密码 | 邮箱发送重置链接 | P1 |
| 重置密码 | 新密码设置 + 无 token 提示 | P1 |

### 5.2 标讯列表页设计

```
┌─────────────────────────────┐
│ 客户雷达          🔍 搜索    │
├─────────────────────────────┤
│ [全部] [强推] [可以投] [风险] │
├─────────────────────────────┤
│ 🟢 强推                     │
│ XX单位信息系统运维服务采购     │
│ 预算: 150万 | 广州 | 7月25日  │
│ 小型机·存储·数据库            │
├─────────────────────────────┤
│ 🟡 可以投                   │
│ XX医院信息化驻场运维          │
│ 预算: 80万 | 深圳 | 7月20日   │
│ 桌面运维·网络                │
├─────────────────────────────┤
│ 🔴 不建议                   │
│ XX大学算力平台建设项目        │
│ 预算: 500万 | 广州 | 7月30日  │
│ GPU·深度学习                 │
└─────────────────────────────┘
```

### 5.3 PWA 配置

- `manifest.json`：应用名"客户雷达"，图标，主题色
- Service Worker：离线缓存最近 7 天标讯
- 安装提示：引导销售"添加到主屏幕"

---

## 6. 通知推送

### 6.1 企微群机器人 webhook

```javascript
async function notifyWeChat(notice, matchResult) {
  const webhookUrl = process.env.WECOM_WEBHOOK_URL;
  const color = matchResult.recommend_level === 'strong' ? '🟢' : '🟡';
  
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      msgtype: 'markdown',
      markdown: {
        content: [
          `## ${color} 新标讯`,
          `**${notice.title}**`,
          `- 预算: ${notice.budget_amount}万`,
          `- 地区: ${notice.region_scope}`,
          `- 截止: ${notice.end_date}`,
          `- 预估扣分: ${matchResult.total_deduction}分`,
          `- [查看详情](${pwaUrl}/notice/${notice.id})`
        ].join('\n')
      }
    })
  });
}
```

### 6.2 推送策略

- 新标讯入库 + AI 提取完成 + 匹配计算完成后推送
- 只推送 `recommend_level` 为 `strong` 或 `yes` 的标讯
- 同一采购单位 24 小时内只推一次

---

## 7. 开发路线图

### Phase 1: 数据基座 + AI + 匹配 + 推送（Week 1）

**目标：跑通全链路，企微群收到匹配标讯**

- [x] Supabase 建表迁移（23 个迁移文件，18+ 张表，66 条 RLS 策略）
- [x] 知了标讯 API 对接：Node.js 定时任务，每天 12:00 和 23:00 拉取广东省 IT 运维类公告
- [x] 数据清洗入库：去重、字段映射、`ai_status = 0`
- [x] AI Pipeline v2：元数据规则提取 + mimo AI 补充分类（已完成 449 条）
- [x] 公司资质 + 人员资质数据录入（已录入 7 公司资质 + 11 人员资质）
- [x] 匹配引擎 v2：五维能力匹配（28 条已匹配：4 strong / 12 yes / 10 risky / 2 no）
- [x] 企微群机器人 webhook 推送服务

**交付物：** 后端全链路跑通（采集 → AI 提取 → 匹配 → 推送），CLI 可查询

### Phase 2: PWA 前端 + CLI（Week 2-3）

**目标：销售能用手机/CLI 看标讯和匹配结果，管理者能用 CLI/前端管理资质和平台**

**PWA 前端：**
- [x] React + Vite + Tailwind CSS 项目初始化（含移动端响应式适配）
- [x] Supabase Auth 登录 + admin/viewer 角色控制
- [x] 标讯列表页：按推荐等级排序，筛选（等级），匹配分数进度条，来源标签
- [x] 标讯详情页：结构化信息 + 匹配结果 + 扣分明细 + 查看原文
- [x] 资质管理页：公司资质 + 人员资质 CRUD（admin 可编辑，viewer 只读）
- [x] 搜索页：关键词搜索
- [x] 平台管理页：招标平台 CRUD（admin 可编辑，viewer 只读）
- [x] 设置页：配置/关键词策略/时间管理/用户管理（admin）
- [x] 合同业绩库：搜索/分页/CRUD
- [x] 数据看板：趋势图/行业/地区分布 (Recharts)
- [x] 通知中心：NotificationBell + 未读数 + 标记已读
- [x] 忘记密码/重置密码页面
- [x] 离线状态指示器 (useOnlineStatus)
- [x] 移动端底部 Tab (4 + 更多弹出)
- [x] PWA 配置：manifest.json + Service Worker + 应用图标

**CLI 工具：**
- [x] CLI 框架搭建（cr 命令，Commander.js）
- [x] 认证模块：Supabase Auth，token 管理
- [x] Viewer CLI：查询公告、搜索、匹配、查看资质
- [x] Admin CLI：管理平台、配置、采集、关键词、详情爬取
- [x] JSON 输出支持（--json），方便 AI Agent 解析
- [x] Codex Skill 集成：cr-admin + cr-viewer 两个 Skill

**交付物：** 可安装到手机主屏幕的 PWA 应用 + 双角色 CLI 工具


### Phase 2.5: 招标文件自动下载（Week 3-4）

**目标：自动下载免费招标文件，为后续精确匹配打基础**

- [x] Supabase Storage 创建 `bid-documents` bucket
- [x] 数据库迁移：`bid_document` 表（019_bid_document.sql）
- [x] 招标文件下载服务 `doc-downloader.js`：
  - 知了中转页 HTML 解析 → 原站链接提取
  - PDF/Word 文件识别与下载
  - 上传 Supabase Storage + 元数据入库
- [x] API 接口：`POST /api/admin/notices/:id/download` + `download-batch`
- [x] CLI 命令：`cr admin notice:download <id>` + `--batch`
- [x] Pipeline 集成：采集后、AI 提取前插入下载步骤
- [x] 错误处理：下载失败标记状态，不影响主流程

**交付物：** 自动下载免费招标文件，存入 Supabase Storage，前端可查看/下载

### Phase 2.6: 评分标准自动提取（Week 4）

**目标：从招标文件中自动提取评分标准和资质要求**

- [x] notice_scoring 表（020_notice_scoring.sql）
- [x] PDF/DOCX 文本提取（Python PyPDF2）
- [x] AI 结构化解析（mimo）
- [x] API + CLI 接口
- [ ] 批量提取已下载的招标文件

**关键发现：**
- 招标文件在 ZIP 附件中，不在直接附件中
- ZIP 解压后 PDF 通常是完整招标文件（63页，50K字）
- 评分标准在"详细评审"章节
- 只处理 notice_type=tender 的标讯
- 小于 50KB 的文件跳过（封面/授权书/补充说明）

**交付物：** 从招标文件自动提取评分标准，存入结构化数据库

### Phase 3: 打磨 + 扩展（Week 4+）

- [ ] 销售标注功能：已跟进 / 忽略 / 已投标
- [ ] 中标公告录入和回顾分析
- [x] 企业自建平台爬虫（Scrapling: 千里马 94 条 + 广东招标 174 条）
- [ ] 资质到期预警
- [ ] 标签筛选优化
- [ ] 竞对分析

### Phase 4: 前端打磨（2026-07-06 完成）

**目标：前端从功能性可用升级到生产级体验**

- [x] Dashboard 工作台首页（统计卡片 + 匹配分布 + 最近标讯 + 快捷入口）
- [x] 全站视觉升级（slate + indigo 色系，卡片/徽章/按钮/表格统一）
- [x] Toast 通知系统（useToast hook，success/error/info）
- [x] ErrorBoundary 错误边界（每个路由独立兜底 + 全局顶层）
- [x] 资质 CRUD 完善（新增/编辑弹窗、表单校验、删除确认）
- [x] 标讯列表增强（匹配分数进度条、来源/类型标签）
- [x] PWA 支持（manifest.json + Service Worker + 应用图标）
- [x] 通用 Modal / ConfirmDialog 组件

**交付物：** 生产级前端体验，销售可安装到手机主屏幕


---

### Phase 5: 前端全面测试 + 安全加固 + 移动端适配（2026-07-06）

**目标：模拟销售用户全面测试，修复所有发现的问题，达到生产级质量**

**Bug 修复 (2 P0 + 4 P1):**
- [x] dashboard-trend API select 补 city/region_scope/ai_extracted_fields（行业/地区图表空白）
- [x] admin.js download-batch 嵌套路由修复（scoring 路由延迟注册）
- [x] Dashboard 快捷入口仅 admin 可见（防止 sales 点击被拦截）
- [x] 平台表名统一：platform_registry → platform_source
- [x] Contracts 搜索加 300ms debounce
- [x] Settings 关键词策略"可投"卡片颜色修正

**功能补全 (2 P2):**
- [x] Settings 页新增用户管理模块（列表/新增/角色切换）
- [x] ResetPassword 页无 token 时显示"链接无效或已过期"

**安全加固:**
- [x] notifications/dashboard/dashboard-trend API 加 requireAuth
- [x] API client 401 自动登出
- [x] GET 请求不传 body（fetch 规范）

**移动端适配:**
- [x] Qualifications/Contracts 表格 overflow-x-auto + min-w
- [x] NotificationBell 下拉 max-w 防溢出
- [x] Toast 容器小屏自适应
- [x] Reports 总览卡片 gap 响应式
- [x] Dashboard 快捷入口 grid-cols-2 lg:grid-cols-3

**UX 改进:**
- [x] Modal 打开时锁定背景滚动
- [x] 清除全部 linter 警告（7 处 unused imports/variables）

**交付物：** 0 P0/P1/P2 bug，oxlint 0 warnings，移动端/桌面端全页面可用

---

### Phase 6: 销售标注 + 资质到期预警（2026-07-06）

**目标：销售跟进状态管理 + 资质到期自动预警**

**B5 — 销售标注功能:**
- [x] 数据库：bidding_notice 新增 notice_status 字段（6态：new/following/ignored/bidding/won/lost）
- [x] 后端：PATCH /api/notices/:id/status 接口 + notice_status 查询筛选
- [x] 前端：NoticeList 状态筛选 Tab + NoticeDetail 状态选择器
- [x] CLI：cr notice status <id> [status] 命令

**B6 — 资质到期预警:**
- [x] 数据库：system_config 预警配置 + qual_warning_history 推送历史表
- [x] 后端：qual-warning.js 服务（检查+报告+推送+历史记录）
- [x] API：GET /api/admin/qual-warning + POST /api/admin/qual-warning/push
- [x] 定时调度：每天 09:00 检查并推送（与日报独立）
- [x] 前端：Qualifications 页面到期状态标签（绿/黄/红）+ Dashboard 预警卡片
- [x] CLI：cr admin qual:warning [--days N] [--push] 命令

**交付物：** 销售可标注跟进状态，资质到期前30天自动推送预警到企微群

**技术实现：**
- 迁移文件：`026_notice_status_and_qual_warning.sql`
- 后端服务：`qual-warning.js`（检查+报告生成+推送+历史记录）
- 定时任务：每天 09:00 独立于日报推送
- 推送去重：`qual_warning_history` 表记录每日推送，避免重复

**未来扩展（B11）：**
- 邮件通知：预警报告通过 SMTP/Resend 发送给指定人员
- 人员配置：`system_config` 中配置接收人邮箱列表
- 分级通知：紧急（<7天）邮件+企微双通道，一般（30天）仅企微


---

## 8. Backlog（待排期）

**已交付:**

| # | 功能 | 状态 |
|---|---|---|
| B1 | 平台页编辑功能 | ✅ Phase 5 |
| B2 | 通知中心 | ✅ Phase 5 |
| B3 | 合同业绩库前端 | ✅ Phase 5 |
| B4 | 数据看板/报表 | ✅ Phase 5 |
| B5 | 销售标注功能 | ✅ Phase 6 |
| B6 | 资质到期预警 | ✅ Phase 6 |

**待排期:**

| # | 功能 | 说明 | 依赖 |
|---|---|---|---|
| B7 | 评分标准批量提取 | 已下载招标文件的评分标准自动提取 | Phase 2.6 基础 |
| B8 | 代码分割 / 懒加载 | 路由级 lazy import 减少首屏 bundle | 无 |
| B9 | Modal 焦点陷阱 | Tab 键在弹窗内循环 | 无 |
| B10 | 无障碍标注 | 按钮/表单/图表的 aria-label | 无 |
| B11 | 资质预警邮件通知 | 到期预警通过邮件发送给相关人员（当前仅企微推送） | 邮件服务 + 人员配置表 |
| B12 | 标讯状态统计 | Dashboard 按状态维度统计（跟进中/已投标/中标率等） | B5 基础 |


---

## 9. 文件结构

```
customer radar/
├── docs/                          ← 设计文档（9 份）
├── supabase/migrations/           ← 23 个 SQL 迁移 + pending.sql
├── cli/                           ← CLI 工具（cr 命令，Commander.js）
│   ├── index.js                   ← 入口，双角色注册
│   ├── auth.js / api.js / format.js
│   └── commands/
│       ├── admin.js / viewer 命令组
│       ├── keyword.js / crawl.js / match.js / qual.js
│       ├── platform.js / config.js / contract.js / notice.js
├── scripts/                       ← 辅助脚本（Scrapling、测试、种子数据）
├── src/
│   ├── server/                    ← Express 后端 (port 3200)
│   │   ├── index.js
│   │   ├── config.js / db.js
│   │   ├── middleware/auth.js
│   │   ├── routes/
│   │   │   ├── dashboard.js       ← 新增：Dashboard 统计接口
│   │   │   ├── notices.js / match.js / qualifications.js
│   │   │   ├── platforms.js / contracts.js / config.js
│   │   │   ├── admin.js / auth.js / crawl.js
│   │   └── services/
│   │       ├── zhiliao-api.js / scrapling-client.js
│   │       ├── ai-pipeline.js / match-engine.js
│   │       ├── keyword-report.js / keyword-tuner.js
│   │       ├── ingestion.js / scheduler.js
│   │       ├── doc-downloader.js / scoring-extractor.js
│   │       ├── wecom-notify.js / qianlima-detail.js
│   │       └── config-reader.js
│   └── client/                    ← React PWA 前端 (Vite)
│       ├── index.html
│       ├── public/
│       │   ├── manifest.json / sw.js
│       │   ├── icon-192.png / icon-512.png / apple-touch-icon.png
│       └── src/
│           ├── App.jsx
│           ├── main.jsx           ← SW 注册
│           ├── index.css          ← Tailwind + badge 组件类
│           ├── hooks/
│           │   ├── useAuth.jsx / useToast.jsx / useOnlineStatus.jsx
│           ├── components/
│           │   ├── Layout.jsx     ← 侧边栏 + 底部Tab + 更多弹出
│           │   ├── ErrorBoundary.jsx / Modal.jsx / NotificationBell.jsx
│           ├── pages/
│           │   ├── Dashboard.jsx / NoticeList.jsx / NoticeDetail.jsx
│           │   ├── Search.jsx / Qualifications.jsx / Contracts.jsx
│           │   ├── Reports.jsx / Platforms.jsx / Settings.jsx
│           │   ├── Login.jsx / ForgotPassword.jsx / ResetPassword.jsx
│           └── lib/
│               ├── api.js        ← 多后端抽象 + 401 自动登出
│               ├── supabase.js / utils.js
├── tests/                         ← 测试脚本
├── package.json / .env / .env.example
└── typescript                     ← TypeScript 配置（预留）
```

---

## 9. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|---|---|---|
| 知了 API 覆盖范围不足 | 每月机会数达不到目标 | 用已知历史项目验证命中率，及时扩展自建平台 |
| mimo-v2.5-pro 提取准确率不够 | 匹配结果不准 | 先跑一批样本人工校验，迭代 Prompt；保留人工修正入口 |
| 资质数据过期 | 匹配结果失真 | MVP 阶段靠专人定期检查；后续做到期预警 |
| 销售不用 PWA | 系统没人用 | 企微推送降低使用门槛；收集反馈快速迭代 |
| 匹配规则过于简单 | 扣分不准确 | MVP 用规则引擎先跑，后续可升级为 LLM 评分 |
| 知了 API 接口变更或限流 | 数据采集中断 | 做好错误重试 + 监控告警 |

---

## 10. 开放问题

| # | 问题 | 影响 | 状态 |
|---|---|---|---|
| 1 | 知了标讯 API 的具体接口参数和返回格式？ | Phase 1 必须确认 | 待查阅 https://ai.zhiliaobiaoxun.com/docs |
| 2 | 企微群机器人 webhook URL？ | Phase 1 推送需要 | 已配置，存储在 system_config 表 |
| 3 | 公司资质文档格式（PDF/Word）？ | Phase 1 数据录入 | 已有专人管理，可 AI 提取或人工录入 |
| 4 | 首批对接的 3 个企业自建平台是哪些？ | Phase 3 规划 | 建议选反爬等级 low 的，先跑通 |
| 5 | Supabase 项目是否已建好表？ | Phase 1 需要确认 | 已有 001-004 迁移，检查是否已执行 |
| 6 | 销售用 iPhone 还是 Android？ | PWA 兼容性 | 待确认 |
- [x] 知了标讯 API 对接：Node.js 定时任务，每天 12:00 和 23:00 拉取广东省 IT 运维类公告
- [x] 企微日报推送：每天 9:00 和 14:00 汇总推送新标讯 + 匹配结果（上班时间推送，不影响休息）
### 6.2 推送策略

- 采集与推送分离：12:00/23:00 采集入库，9:00/14:00 上班时间推送日报
- 日报按匹配等级分组：强推、可以投、风险、不建议、待匹配
- 同一采购单位 24 小时内只推一次
- 推送时间、Webhook 地址、开关均可通过 `cr admin config:*` 动态配置
### 6.1 企微群机器人 webhook

Webhook 地址存储在 `system_config` 表，通过 `cr admin config:webhook <url>` 管理。

```javascript
// 优先从数据库读取，回退到 .env
const webhookUrl = await getConfig('push.webhook_url', DEFAULT_WEBHOOK);
```
