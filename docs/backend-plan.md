# 客户雷达 — 后端实施计划

> 版本: v1.0 | 日期: 2026-07-03

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

### 3.1 AI Pipeline 服务

**文件**: `src/server/services/ai-pipeline.js`

**处理流程**:
```
输入: bidding_notice.id
  ↓
1. 读取 cleaned_content（如无则从 notice_content 清洗）
  ↓
2. 调用 mimo-v2.5-pro 提取结构化字段
   - project_name: 项目名称
   - budget: 预算金额
   - deadline: 截止日期
   - region: 地区
   - industry_type: 行业类型
   - project_type: 项目类型（运维/驻场/集成等）
   - tech_keywords: 技术关键词[]
   - qualification_requirements: 资质要求[]
   - commercial_scoring_rules: 商务评分规则[]
  ↓
3. 写入 bidding_notice.ai_extracted_fields
  ↓
4. 展开写入 notice_tag（行级存储）
  ↓
5. 更新 ai_status 状态机
```

**AI 状态机**:
```
0 (待处理) → 1 (已清洗) → 2 (已摘要) → 3 (已打标) → 4 (全部完成)
                                                          ↓
失败 → -2 (处理失败，记录 ai_error)
噪声 → -1 (AI 判定为噪声)
```

### 3.2 匹配引擎

**文件**: `src/server/services/match-engine.js`

**输入**: notice_id
**输出**: match_result 记录

**匹配逻辑**:
```
1. 读取 notice.ai_extracted_fields.qualification_requirements
2. 读取 company_qualification 全量
3. 读取 personnel_qualification 全量
4. 读取 company_contract 全量（同类业绩）
5. 遍历每条资质要求：
   - 在 qualification_reference 中查找标准术语
   - 在 company_qualification 中匹配（match_keywords）
   - 在 personnel_qualification 中匹配（match_keywords）
   - 计算扣分
6. 同类业绩匹配：
   - 按 service_type + industry + tech_keywords 匹配合同
   - 检查 end_date 是否在近3年内
7. 汇总扣分，确定 recommend_level
```

**推荐等级**:
```
total_deduction <= 0: 'strong' (强推)
total_deduction <= 2: 'yes' (可以投)
total_deduction <= 5: 'risky' (风险)
total_deduction > 5:  'no' (不建议)
```

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
- [ ] 认证中间件 (auth.js)
- [ ] 资质管理 API (qualifications.js)
- [ ] 合同管理 API (contracts.js)
- [ ] 平台管理 API (platforms.js)
- [ ] 注册路由到 index.js

### Phase B
- [ ] AI Pipeline 服务 (ai-pipeline.js)
- [ ] 匹配引擎服务 (match-engine.js)
- [ ] 知了 API 现有字段映射更新

### Phase C
- [ ] 企微推送服务 (wecom-notify.js)
- [ ] 定时调度更新 (scheduler.js)

### Phase D
- [ ] CLI 框架 (cr.js)
- [ ] CLI 认证模块
- [ ] CLI Viewer 命令
- [ ] CLI Admin 命令
- [ ] Codex 技能打包

### Phase E
- [ ] Admin 技能测试
- [ ] Viewer 技能测试
- [ ] Bug 修复

