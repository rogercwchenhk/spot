# 客户雷达 — 后端实施计划

> 版本: v1.0 | 日期: 2026-07-03
> 版本: v2.0 | 日期: 2026-07-04 | 基于 Phase A-E 实际实现更新
---

## 1. 开发顺序

```
Phase A: 认证 + 基础 CRUD（Day 1）
    ↓
Phase B: AI Pipeline + 匹配引擎（Day 2）
    ↓
Phase C: 企微推送 + 定时调度（Day 3）
    ↓
Phase D: CLI 框架 + 技能打包（Day 4）
    ↓
Phase E: AI Agent 测试（Day 5）
```

---

## 2. Phase A: 认证 + 基础 CRUD

### 2.1 认证中间件

**文件**: `src/server/middleware/auth.js`

```javascript
// 核心逻辑：
// 1. 从 Header 提取 Bearer token
// 2. 调用 Supabase Auth 验证 token
// 3. 获取用户角色（admin/viewer）
// 4. 注入 req.user = { id, email, role }
```

**角色判断**:
- 读取 `user.user_metadata.role` 或 `app_metadata.role`
- 默认角色: `viewer`
- 管理员设置: 在 Supabase Dashboard 手动设置

**中间件函数**:
- `requireAuth` — 必须登录
- `requireAdmin` — 必须 admin 角色
- `optionalAuth` — 可选登录（未登录时 req.user = null）

### 2.2 资质管理 API

**文件**: `src/server/routes/qualifications.js`

| 路由 | 方法 | 权限 | 说明 |
|---|---|---|---|
| `/api/qualifications/company` | GET | 公开 | 公司资质列表 |
| `/api/qualifications/company` | POST | admin | 新增公司资质 |
| `/api/qualifications/company/:id` | PUT | admin | 更新公司资质 |
| `/api/qualifications/company/:id` | DELETE | admin | 删除公司资质 |
| `/api/qualifications/personnel` | GET | 公开 | 人员资质列表 |
| `/api/qualifications/personnel` | POST | admin | 新增人员资质 |
| `/api/qualifications/personnel/:id` | PUT | admin | 更新人员资质 |
| `/api/qualifications/personnel/:id` | DELETE | admin | 删除人员资质 |

**查询参数**:
- `?type=ISO9001` — 按资质类型筛选
- `?active=true` — 只显示有效资质
- `?keyword=ISO` — 模糊搜索

### 2.3 合同管理 API

**文件**: `src/server/routes/contracts.js`

| 路由 | 方法 | 权限 | 说明 |
|---|---|---|---|
| `/api/contracts` | GET | 公开 | 合同列表 |
| `/api/contracts/:id` | GET | 公开 | 合同详情 |
| `/api/contracts` | POST | admin | 新增合同 |
| `/api/contracts/:id` | PUT | admin | 更新合同 |
| `/api/contracts/:id` | DELETE | admin | 删除合同 |
| `/api/contracts/import` | POST | admin | 批量导入（JSONL） |

**查询参数**:
- `?industry=银行` — 按行业筛选
- `?service_type=运维` — 按服务类型筛选
- `?region=广州` — 按地区筛选
- `?keyword=小型机` — 关键词搜索

### 2.4 平台管理 API

**文件**: `src/server/routes/platforms.js`

| 路由 | 方法 | 权限 | 说明 |
|---|---|---|---|
| `/api/platforms` | GET | 公开 | 平台列表 |
| `/api/platforms/:id` | GET | 公开 | 平台详情 |
| `/api/platforms` | POST | admin | 新增平台 |
| `/api/platforms/:id` | PUT | admin | 更新平台 |
| `/api/platforms/:id` | DELETE | admin | 删除平台 |

---

## 3. Phase B: AI Pipeline + 匹配引擎

### 3.0 数据源约束

**知了 API 只返回元数据，不含招标文件正文。** `notice_content` 始终为空。
招标文件（含资质要求、评分标准）在原发布网站，获取方式各异：
- 免费下载 → 优先获取（第二阶段）
- 收费购买 → 跳过，标记 `doc_access_type = 'paid'`
- 需要报名 → 标记 `doc_access_type = 'registration_required'`，人工跟进

**约束：收费招标文件一律跳过，不付费获取。**

### 3.1 AI Pipeline 服务 (v2)

**文件**: `src/server/services/ai-pipeline.js`

因为 `notice_content` 始终为空，AI Pipeline 改为基于标题+元数据做分类提取。

**处理流程**:
```
输入: bidding_notice (标题 + sm_names + caller_name + 地区 + 预算)
  ↓
1. 规则引擎提取（快速免费，覆盖约 70%）
   - 技术关键词: 14 种正则模式
   - 行业分类: 8 种模式
   - 项目类型: 7 种模式
  ↓
2. 如规则无法确定行业/项目类型，调用 mimo AI 补充分类
  ↓
3. 写入 ai_extracted_fields + industry_type
  ↓
4. 写入 notice_tag (tech_keyword / industry / project_type)
  ↓
5. ai_status → 4
```

**不提取的字段**（因为没有招标文件正文）：
- ~~资质要求 (qualification_requirements)~~
- ~~评分标准 (commercial_scoring_rules)~~
- ~~摘要 (notice_summary)~~

**AI 状态机** (v2 简化):
```
0 (待处理)  →  4 (元数据提取完成)
       └→ -2 (处理失败，记录 ai_error)
```

### 3.2 匹配引擎 (v2)

**文件**: `src/server/services/match-engine.js`

因为没有招标文件的资质要求，改为评估公司已有能力与标讯需求的契合度。

**五维评分（满分 100）**:

| 维度 | 满分 | 匹配逻辑 |
|---|---|---|
| 技术关键词 | 30 | 公司资质 scope/名称 + 合同 tech_keywords vs 标讯 tech_keywords 重叠比例 |
| 行业经验 | 25 | 公司合同 industry vs 标讯 industry_type |
| 项目类型 | 20 | 公司合同 service_type vs 标讯 project_type |
| 地区匹配 | 15 | 公司合同 region vs 标讯 region（广东省内各市互通） |
| 同类业绩 | 10 | 近 3 年同类合同（服务类型+行业+技术关键词至少匹配 2 项） |

**推荐等级**:
```
总分 >= 80: 'strong' (强推)
总分 >= 60: 'yes'    (可以投)
总分 >= 40: 'risky'  (风险)
总分 <  40: 'no'     (不建议)
```

**当前数据验证**：226 条标讯 → 7 strong / 54 yes / 122 risky / 43 no

---

## 4. Phase C: 企微推送 + 定时调度

### 4.1 企微推送服务

**文件**: `src/server/services/wecom-notify.js`

**推送条件**:
- 新标讯入库 + AI 提取完成 + 匹配计算完成
- recommend_level 为 'strong' 或 'yes'
- 同一采购单位 24 小时内只推一次

**消息格式** (Markdown):
```markdown
## 🟢 新标讯
**XX单位信息系统运维服务采购**
- 预算: ¥150万
- 地区: 广州
- 截止: 2026-07-25
- 预估扣分: 0分
- [查看详情](http://xxx/notice/123)
```

### 4.2 定时调度更新

**文件**: `src/server/services/scheduler.js`

**调度任务**:
- 每2小时: 知了 API 采集
- 采集完成后: 触发 AI Pipeline
- AI 完成后: 触发匹配引擎
- 匹配完成后: 触发企微推送

---

## 5. Phase D: CLI 框架 + 技能打包

### 5.1 CLI 框架

**文件**: `src/cli/bin/cr.js`

**命令结构**:
```
cr
├── login/logout          ← 认证
├── list/show/search/today/match  ← Viewer 命令
├── qual/person/contract/platform  ← Viewer 查看
└── admin
    ├── qual:add/update/delete     ← 公司资质管理
    ├── person:add/update/delete   ← 人员资质管理
    ├── contract:add/update/delete/import ← 合同管理
    ├── platform:add/update/delete ← 平台管理
    ├── notice:fetch/process       ← 标讯处理
    ├── match:run                  ← 匹配计算
    ├── push:send/test             ← 推送管理
    └── user:list/add/role         ← 用户管理
```

### 5.2 Codex 技能打包

**Admin 技能**: `cr-admin`
- 角色: admin
- 能力: 全部管理命令
- 认证: service_role key 或 admin JWT

**Viewer 技能**: `cr-viewer`
- 角色: viewer
- 能力: 只读查询命令
- 认证: viewer JWT

---

## 6. Phase E: AI Agent 测试

### 6.1 测试场景

**Admin 技能测试**:
1. 登录 → 获取 token
2. 新增公司资质 → 验证写入
3. 新增人员资质 → 验证写入
4. 导入合同 → 验证批量写入
5. 手动触发标讯采集 → 验证入库
6. 触发 AI Pipeline → 验证提取结果
7. 触发匹配引擎 → 验证匹配结果
8. 测试企微推送 → 验证发送

**Viewer 技能测试**:
1. 查看标讯列表 → 验证数据
2. 查看标讯详情 → 验证关联数据
3. 搜索标讯 → 验证关键词匹配
4. 查看资质列表 → 验证只读
5. 尝试写入 → 验证权限拒绝

---

## 7. 文件结构

```
src/server/
├── index.js                    ← Express 入口
├── config.js                   ← 配置
├── db.js                       ← Supabase 连接
├── middleware/
│   └── auth.js                 ← 认证中间件
├── routes/
│   ├── notices.js              ← 标讯 API
│   ├── qualifications.js       ← 资质 API
│   ├── contracts.js            ← 合同 API
│   ├── platforms.js            ← 平台 API
│   └── auth.js                 ← 认证 API
├── services/
│   ├── zhiliao-api.js          ← 知了 API 客户端
│   ├── ingestion.js            ← 数据入库
│   ├── ai-pipeline.js          ← AI Pipeline
│   ├── match-engine.js         ← 匹配引擎
│   ├── wecom-notify.js         ← 企微推送
│   └── scheduler.js            ← 定时调度
└── jobs/
    └── fetch-notices.js        ← 采集任务

src/cli/
├── bin/cr.js                   ← CLI 入口
├── lib/
│   ├── auth.js                 ← 认证工具
│   ├── api.js                  ← API 请求封装
│   └── output.js               ← 输出格式化
└── commands/
    ├── auth.js                 ← login/logout
    ├── list.js                 ← cr list
    ├── show.js                 ← cr show
    ├── search.js               ← cr search
    ├── qual.js                 ← cr qual
    ├── person.js               ← cr person
    ├── contract.js             ← cr contract
    └── admin/
        ├── qual.js             ← cr admin qual:*
        ├── person.js           ← cr admin person:*
        ├── contract.js         ← cr admin contract:*
        ├── platform.js         ← cr admin platform:*
        ├── notice.js           ← cr admin notice:*
        ├── push.js             ← cr admin push:*
        └── user.js             ← cr admin user:*
```

---

## 8. 开发检查清单

### Phase A
- [x] 认证中间件 (auth.js)
- [x] 资质管理 API (qualifications.js)
- [x] 合同管理 API (contracts.js)
- [x] 平台管理 API (platforms.js)
- [x] 注册路由到 index.js

### Phase B
- [x] AI Pipeline v2 (ai-pipeline.js) — 元数据规则提取 + mimo AI 补充
- [x] 匹配引擎 v2 (match-engine.js) — 五维能力匹配 (100分制)
- [x] 知了 API 字段映射 (ingestion.js)
- [x] doc_access_type 招标文件获取方式标记

### Phase C
- [x] 企微推送服务 (wecom-notify.js)
- [x] 定时调度 (scheduler.js) — 每2小时: 采集→AI→匹配→推送

### Phase D
- [x] CLI 框架 (cr.js) — 16 个命令
- [x] CLI 认证模块 (login/logout/whoami)
- [x] CLI Viewer 命令 (list/show/search/today/match/qual/person/contract/status)
- [x] CLI Admin 命令 (qual/person/contract/platform/notice/match/push/user/pipeline/stats)
- [ ] Codex 技能打包

### Phase E
- [x] 后端 API 测试 (全部端点通过)
- [x] CLI 测试 (全部命令通过)
- [x] 权限控制测试 (viewer 被 admin 接口拒绝)
- [x] Bug 修复 (notices 路由 recommend_level/start_date 筛选、CLI match_result 兼容)
