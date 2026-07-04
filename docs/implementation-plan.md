# 客户雷达 — 实施计划

> 版本: v2.0 | 日期: 2026-07-03 | 基于 PRD v2.0 + 需求烤问结论
> 状态: 待确认

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
| 前端 | React 18 + Vite + shadcn/ui + Tailwind CSS | 国际化视觉质感，源码级样式可控，响应式灵活 |
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
| 标讯列表 | 今日/本周新增标讯，按匹配等级排序，支持筛选 | P0 |
| 标讯详情 | 公告摘要 + 结构化字段 + 匹配结果 + 扣分明细 | P0 |
| 资质管理 | 公司资质 + 人员资质的增删改查 | P0 |
| 标讯搜索 | 关键词搜索 + 标签筛选 | P1 |
| 设置 | 推送配置、筛选偏好 | P1 |

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

- [ ] Supabase 建表迁移（bidding_notice 补充字段 + 资质表 + 匹配结果表）
- [x] 知了标讯 API 对接：Node.js 定时任务，每天 12:00 和 23:00 拉取广东省 IT 运维类公告
- [ ] 数据清洗入库：去重、字段映射、`ai_status = 0`
- [x] AI Pipeline v2：元数据规则提取 + mimo AI 补充分类（已完成 226 条）
- [x] 公司资质 + 人员资质数据录入（已录入 7 公司资质 + 11 人员资质）
- [x] 匹配引擎 v2：五维能力匹配（已完成 226 条：7 strong / 54 yes / 122 risky / 43 no）
- [x] 企微群机器人 webhook 推送服务

**交付物：** 后端全链路跑通（采集 → AI 提取 → 匹配 → 推送），CLI 可查询

### Phase 2: PWA 前端 + CLI（Week 2-3）

**目标：销售能用手机/CLI 看标讯和匹配结果，管理者能用 CLI/前端管理资质和平台**

**PWA 前端：**
- [ ] React + Vite + shadcn/ui + Tailwind CSS 项目初始化（含移动端响应式适配）
- [ ] Supabase Auth 登录 + admin/viewer 角色控制
- [ ] 标讯列表页：按推荐等级排序，筛选（等级/地区/时间/金额）
- [ ] 标讯详情页：结构化信息 + 匹配结果 + 扣分明细 + 查看原文
- [ ] 资质管理页：公司资质 + 人员资质 CRUD（admin 可编辑，viewer 只读）
- [ ] 搜索页：关键词搜索（pg_trgm）
- [ ] 平台管理页：招标平台数据库查看和管理（admin）
- [ ] 设置页：推送配置（admin）
- [ ] PWA 配置：manifest.json + Service Worker + 安装引导

**CLI 工具：**
- [ ] CLI 框架搭建（ 命令，Node.js）
- [ ] 认证模块：，token 管理
- [ ] Viewer CLI：
- [ ] Admin CLI：
- [ ] JSON 输出支持（），方便 AI Agent 解析
- [ ] Codex Skill 集成： +  两个 Skill

**交付物：** 可安装到手机主屏幕的 PWA 应用 + 双角色 CLI 工具

### Phase 3: 打磨 + 扩展（Week 4+）

- [ ] 销售标注功能：已跟进 / 忽略 / 已投标
- [ ] 中标公告录入和回顾分析
- [ ] 企业自建平台爬虫（选 1-2 个低反爬平台先试点）
- [ ] 资质到期预警
- [ ] 标签筛选优化
- [ ] 竞对分析

---

## 8. 文件结构

```
customer radar/
├── docs/
│   ├── product-requirements.md
│   ├── system-design.md
│   ├── platform-registry.md
│   ├── ai-prompt-templates.md
│   └── implementation-plan.md    ← 本文件
├── supabase/
│   └── migrations/
│       ├── 001_init_schema.sql
│       ├── 002_platform_tech_profile.sql
│       ├── 003_enrich_business_fields.sql
│       ├── 004_expand_guangdong_platforms.sql
│       ├── 005_qualification_tables.sql
│       ├── 006_match_result_table.sql
│       ├── 007_qualification_reference.sql
│       ├── 008_qualification_ai_fields.sql
│       ├── 009_ai_friendly_enhancements.sql
│       ├── 010_seed_qualification_data.sql
│       ├── 011_fix_rls_anon_read.sql
│       └── 012_company_contract.sql
├── src/
│   ├── server/
│   │   ├── index.js
│   │   ├── config.js
│   │   ├── services/
│   │   │   ├── zhiliao-api.js
│   │   │   ├── ai-pipeline.js
│   │   │   ├── match-engine.js
│   │   │   ├── wecom-notify.js
│   │   │   └── scheduler.js
│   │   └── routes/
│   │       ├── notices.js
│   │       ├── qualifications.js
│   │       └── match.js
│   └── client/
│       ├── index.html
│       ├── src/
│       │   ├── App.jsx
│       │   ├── pages/
│       │   │   ├── NoticeList.jsx
│       │   │   ├── NoticeDetail.jsx
│       │   │   ├── QualificationManage.jsx
│       │   │   └── Search.jsx
│       │   ├── components/
│       │   └── utils/
│       ├── manifest.json
│       └── vite.config.js
├── package.json
├── .env
└── .env.example
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
| 2 | 企微群机器人 webhook URL？ | Phase 1 推送需要 | 待创建 |
| 3 | 公司资质文档格式（PDF/Word）？ | Phase 1 数据录入 | 已有专人管理，可 AI 提取或人工录入 |
| 4 | 首批对接的 3 个企业自建平台是哪些？ | Phase 3 规划 | 建议选反爬等级 low 的，先跑通 |
| 5 | Supabase 项目是否已建好表？ | Phase 1 需要确认 | 已有 001-004 迁移，检查是否已执行 |
| 6 | 销售用 iPhone 还是 Android？ | PWA 兼容性 | 待确认 |
- [x] 知了标讯 API 对接：Node.js 定时任务，每天 12:00 和 23:00 拉取广东省 IT 运维类公告
- [x] 企微日报推送：每天 9:00 和 14:00 汇总推送新标讯 + 匹配结果（上班时间推送，不影响休息）
