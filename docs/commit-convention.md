# 客户雷达 — 提交规范

> 版本: v1.0 | 日期: 2026-07-07
> 目的: 建立 PDCA 感知的提交规范，提升项目可维护性

---

## 1. 提交类型定义

| 类型 | 说明 | PDCA 阶段 |
|---|---|---|
| `feat` | 新功能 | Do (执行) |
| `fix` | Bug 修复 | Check → Act |
| `refactor` | 代码重构（不改变外部行为） | Act (改进) |
| `docs` | 文档更新 | Plan (计划) |
| `chore` | 构建、依赖、配置等杂项 | - |
| `perf` | 性能优化 | Act (改进) |
| `test` | 测试相关 | Check (检查) |
| `ci` | CI/CD 配置 | - |
| `style` | 代码格式（不影响逻辑） | - |
| `revert` | 回滚提交 | - |

---

## 2. PDCA 映射表

```
┌─────────────────────────────────────────────────────────────┐
│                        PDCA 循环                            │
├─────────────┬─────────────┬─────────────┬────────────────────┤
│   Plan      │    Do       │   Check     │      Act           │
│   (计划)     │   (执行)    │   (检查)     │     (改进)         │
├─────────────┼─────────────┼─────────────┼────────────────────┤
│  docs       │  feat       │  test       │  refactor          │
│  - PRD      │  - 新功能    │  - 测试用例  │  - 代码重构        │
│  - 设计文档  │  - 新模块    │  - 测试计划  │  - 架构优化        │
│  - 测试计划  │  - 新接口    │  - 测试报告  │  - 逻辑优化        │
│             │             │  fix        │  perf              │
│             │             │  - Bug修复   │  - 性能优化         │
└─────────────┴─────────────┴─────────────┴────────────────────┘
```

---

## 3. fix vs refactor 决策树

```
代码变更是否改变外部行为？
├── 否 → refactor
│   ├── 代码结构优化
│   ├── 命名改进
│   ├── 函数拆分/合并
│   ├── 性能优化（不改变功能）
│   └── UI/UX 改进（不改变功能）
│
└── 是 → 是否修复已有问题？
    ├── 是 → fix
    │   ├── Bug 修复
    │   ├── 错误处理改进
    │   ├── 边界条件修复
    │   └── 兼容性修复
    │
    └── 否 → feat
        ├── 新功能
        ├── 新接口
        └── 新模块
```

### 关键判断标准

| 场景 | 类型 | 理由 |
|---|---|---|
| 修复按钮点击无响应 | fix | 修复已有问题 |
| 按钮位置从左侧移到右侧 | refactor | 改进 UX，不改变功能 |
| 新增用户管理模块 | feat | 新功能 |
| 优化查询性能（结果不变） | refactor | 性能优化，不改变功能 |
| 修复查询结果错误 | fix | 修复已有问题 |
| 新增查询接口 | feat | 新功能 |
| 重构过滤逻辑（结果不变） | refactor | 代码结构优化 |
| 修复过滤逻辑错误 | fix | 修复已有问题 |

---

## 4. 提交信息模板

### 基本格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 字段说明

- **type**: 提交类型（feat/fix/refactor/docs/chore/perf/test/ci/style/revert）
- **scope**: 可选，影响范围（模块/组件/功能）
- **subject**: 简短描述（不超过50字）
- **body**: 可选，详细说明（每行不超过72字）
- **footer**: 可选，关联 Issue/Breaking Change

### 示例

#### feat 示例

```
feat(auth): 新增用户登录功能

- 实现邮箱密码登录
- 集成 Supabase Auth
- 添加登录表单验证

Closes #123
```

#### fix 示例

```
fix(notice): 修复标讯列表筛选失效

- 修复日期筛选条件未生效
- 修复关键词筛选逻辑错误
- 添加筛选条件验证

Fixes #456
```

#### refactor 示例

```
refactor(filter): 重构关键词过滤逻辑

- 将 flatMap(OR) 改为组内 AND、组间 OR
- 新增正向关键词守卫
- 严格省份过滤

不改变外部行为，仅优化内部逻辑
```

---

## 5. 常见场景示例

### 场景 1: UI 布局调整

**错误示例**:
```
fix: Dashboard 快捷入口 grid 响应式适配
```

**正确示例**:
```
refactor(dashboard): 快捷入口 grid 响应式适配

- 移动端改为单列布局
- 平板端改为双列布局
- 桌面端保持四列布局
```

**理由**: UI 布局调整是 UX 改进，不修复已有问题，应使用 refactor。

---

### 场景 2: 过滤逻辑优化

**错误示例**:
```
fix: 关键词过滤逻辑修正为组内 AND
```

**正确示例**:
```
refactor(filter): 关键词过滤逻辑改为组内 AND

之前 flatMap 展平成 OR，导致'公安'单独出现就匹配
现在每个子组内 AND（公安 AND 运维），组间 OR

不改变过滤结果，仅优化逻辑结构
```

**理由**: 如果这是逻辑优化而非修复错误，应使用 refactor。

---

### 场景 3: 配置读取改进

**错误示例**:
```
fix: config.js 恢复完整.env回退结构
```

**正确示例**:
```
refactor(config): 恢复完整.env回退结构

- zhiliao-api 兼容 DB+env 双读
- wecom-notify 兼容 DB+env 双读
- 优先级: DB > env > 默认值
```

**理由**: 配置读取方式改进是架构优化，应使用 refactor。

---

### 场景 4: 安全加固

**正确示例**:
```
refactor(security): API 路由安全加固

- notifications API 加 requireAuth
- dashboard API 加 requireAuth
- dashboard-trend API 加 requireAuth
- api.js 401 自动登出
```

**理由**: 安全加固是架构改进，不修复已有问题，应使用 refactor。

---

### 场景 5: 爬虫架构改用 Playwright

**正确示例**:
```
refactor(scraper): 千里马详情页爬虫改用 Playwright

- 替代 Scrapling StealthyFetcher
- 新增首页预热获取 cookies 策略
- 新增 419 反爬重试逻辑（30秒等待+重新预热）
- 限制：IP 被限流后需等待较长时间恢复
```

**理由**: 架构变更，不改变外部行为，应使用 refactor。

---

## 6. 提交前检查清单

### 基础检查

- [ ] 代码能正常编译/运行
- [ ] 没有引入新的 lint 错误
- [ ] 没有引入新的 TypeScript 类型错误
- [ ] 相关测试通过

### 提交信息检查

- [ ] 使用正确的提交类型（feat/fix/refactor/docs/chore/perf/test/ci/style/revert）
- [ ] subject 不超过50字
- [ ] subject 使用中文或英文，保持一致
- [ ] subject 以动词开头（新增/修复/重构/更新/删除/优化等）
- [ ] body 详细说明了变更内容（如果需要）
- [ ] 关联了相关 Issue（如果有）

### PDCA 检查

- [ ] 确认提交类型是否正确映射 PDCA 阶段
- [ ] 如果是 fix，确认是否真的修复了已有问题
- [ ] 如果是 refactor，确认是否不改变外部行为
- [ ] 如果是 feat，确认是否真的是新功能

### 变更范围检查

- [ ] 变更范围是否合理（不超过10个文件，除非是大规模重构）
- [ ] 是否混入了不相关的变更
- [ ] 是否需要拆分为多个提交

---

## 7. 特殊情况处理

### 混合变更

如果一个提交包含多种类型的变更，应该拆分为多个提交：

**错误示例**:
```
fix: 全维度审计修复 (安全+lint+UX)

安全:
- notifications/dashboard/dashboard-trend API 加 requireAuth
- api.js: 401 自动登出 + GET 不传 body

Lint:
- 移除 7 处 unused imports/variables

UX:
- Modal 打开时锁定背景滚动
- Toast 容器小屏自适应
```

**正确示例**:
```
refactor(security): API 路由安全加固

- notifications/dashboard/dashboard-trend API 加 requireAuth
- api.js: 401 自动登出 + GET 不传 body

---

refactor(lint): 移除 7 处 unused imports/variables

- Layout/NoticeDetail/Reports/Platforms/Dashboard

---

refactor(ui): Modal 和 Toast 改进

- Modal 打开时锁定背景滚动
- Toast 容器小屏自适应
```

---

### 批量修复

如果一个提交修复了多个问题，应该在 body 中详细列出：

**示例**:
```
fix(frontend): 前端全面测试修复 (8 issues)

P0:
- dashboard-trend: select 补 city/region_scope/ai_extracted_fields
- admin.js: download-batch 路由嵌套修复

P1:
- Dashboard: 平台管理快捷入口仅 admin 可见
- dashboard.js: platform_registry -> platform_source 统一表名
- Contracts: 搜索加 300ms debounce
- Settings: 可投卡片 bg-yellow-50 颜色修正

P2:
- Settings: 新增用户管理模块
- ResetPassword: 无有效 token 时显示过期提示
```

**建议**: 如果可能，拆分为多个提交，每个提交修复一个问题。

---

## 8. 历史提交分类参考

以下是项目历史中23个fix提交的分类建议，供参考：

### 保持 fix (7个)

| 提交 | 说明 |
|---|---|
| `fcd1ffd` | 修复证书图片加载中卡死问题 |
| `d7c78ba` | reduce NoticeDetail title font size |
| `9488e7f` | api.js URL拼接兼容相对路径 |
| `bee50ad` | 后端P0/P1/P2修复 |
| `f5573c5` | detail命令移入register函数内 |
| `49ab6d0` | 采集频率调整为每天两次 |
| `6d017a3` | notices路由增加start_date日期筛选 |

### 建议重构为 refactor (16个)

| 提交 | 说明 | 建议类型 |
|---|---|---|
| `97fa290` | strict Guangdong filtering, keyword guard, province extraction | `refactor` |
| `289f989` | 关键词过滤逻辑修正为组内 AND | `refactor` |
| `b77c5df` | Scrapling 通道增加关键词+省份过滤 | `refactor` |
| `b7aba69` | 移动端窄屏适配 | `refactor` |
| `22d8e4a` | Dashboard 快捷入口 grid 响应式适配 | `refactor` |
| `9e83f24` | 时间选择器编辑模式下按钮移到内容下方 | `refactor` |
| `bb179da` | 时间选择器三个按钮始终可见 | `refactor` |
| `4e0fa79` | 采集/推送时间保存按钮始终可见 | `refactor` |
| `581c48d` | 设置页去掉字段key名称显示 | `refactor` |
| `2b6ece3` | 设置页每个字段右侧始终显示保存按钮 | `refactor` |
| `4cef8a7` | 安全区适配 + debounce 清理 | `refactor` |
| `5dcadc1` | 全维度审计修复 (安全+lint+UX) | `refactor` |
| `076b00a` | 千里马详情页爬虫优化 | `refactor` |
| `1580e88` | config.js 恢复完整.env回退结构 | `refactor` |
| `a6a45c0` | restore keyword_source in Scrapling mapping | `fix` (保持) |
| `136a3f5` | 前端全面测试修复 (8 issues) | 拆分: `fix` + `feat` |

---

## 9. 工具支持

### commitlint 配置 (可选)

如果需要自动化检查，可以配置 commitlint：

```javascript
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'feat', 'fix', 'refactor', 'docs', 'chore', 'perf', 'test', 'ci', 'style', 'revert'
    ]],
    'subject-max-length': [2, 'always', 50],
    'body-max-line-length': [2, 'always', 72],
  }
};
```

### Git Hooks (可选)

```bash
# .husky/commit-msg
npx --no -- commitlint --edit $1
```

---

## 10. 持续改进

本规范将随项目发展持续更新。如有疑问或建议，请在团队讨论中提出。

**最后更新**: 2026-07-07
**维护者**: 客户雷达项目组
