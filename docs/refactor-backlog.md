# 客户雷达 — 重构待办清单 (Refactor Backlog)

> 版本: v1.0 | 日期: 2026-07-07
> 目的: 强化 PDCA 循环的 Act 阶段，将隐性改进转化为显性任务
> 来源: 23个 fix 提交分析，提取16个重构任务

---

## 1. 优先级说明

| 优先级 | 说明 | 执行策略 |
|---|---|---|
| **P0** | 必须重构 | 立即执行，影响系统稳定性或核心逻辑 |
| **P1** | 重要重构 | 尽快执行，影响代码质量或用户体验 |
| **P2** | 可选重构 | 按需执行，优化性质 |

---

## 2. 重构任务列表

### 2.1 过滤逻辑改进 (P0)

#### T01: 关键词过滤系统重构

**来源提交**:
- `97fa290` - strict Guangdong filtering, keyword guard, province extraction
- `289f989` - 关键词过滤逻辑修正为组内 AND
- `b77c5df` - Scrapling 通道增加关键词+省份过滤

**目标**: 统一关键词过滤逻辑，提升过滤精度和可维护性

**当前状态**:
- 排除词从12个扩展到100+个
- 过滤逻辑从 flatMap(OR) 改为组内 AND、组间 OR
- 新增正向关键词守卫
- 严格省份过滤（全国不再通过）
- Scrapling 通道新增过滤层

**影响范围**:
- `src/server/services/ingestion.js`
- `src/server/services/scrapling-client.js`
- `src/server/config.js`

**预期收益**:
- 过滤精度提升10倍（从2550条/30天降到225条/30天）
- 逻辑结构清晰，便于后续维护
- 减少不相关标讯入库

**重构建议**:
- 将过滤逻辑抽取为独立模块 `src/server/services/filter.js`
- 统一关键词配置管理
- 添加过滤规则单元测试

---

### 2.2 UI/UX 改进 (P1)

#### T02: 移动端响应式适配

**来源提交**:
- `b7aba69` - 移动端窄屏适配 (表格滚动 + 通知溢出 + 报表间距)
- `22d8e4a` - Dashboard 快捷入口 grid 响应式适配

**目标**: 统一移动端响应式设计，提升移动端用户体验

**当前状态**:
- Qualifications/Contracts 表格添加 overflow-x-auto + min-w
- NotificationBell 下拉添加 max-w-[calc(100vw-2rem)] 防溢出
- Reports 总览卡片 gap 响应式调整
- Dashboard 快捷入口 grid 响应式适配

**影响范围**:
- `src/client/src/pages/Contracts.jsx`
- `src/client/src/pages/Qualifications.jsx`
- `src/client/src/pages/Reports.jsx`
- `src/client/src/pages/Dashboard.jsx`
- `src/client/src/components/NotificationBell.jsx`

**预期收益**:
- 移动端表格可横向滚动
- 通知下拉不溢出屏幕
- 小屏布局更紧凑

**重构建议**:
- 创建统一的响应式工具类
- 提取 common 响应式组件
- 添加移动端测试用例

---

#### T03: 设置页时间选择器交互优化

**来源提交**:
- `9e83f24` - 时间选择器编辑模式下按钮移到内容下方, 更大更醒目
- `bb179da` - 时间选择器三个按钮始终可见, 不再互相隐藏
- `4e0fa79` - 采集/推送时间保存按钮始终可见, 未编辑时置灰
- `581c48d` - 设置页去掉字段key名称显示
- `2b6ece3` - 设置页每个字段右侧始终显示保存按钮, 未修改时置灰

**目标**: 优化设置页时间选择器交互，提升易用性

**当前状态**:
- 按钮移到内容下方，更大更醒目
- 三个按钮(编辑/保存/取消)始终可见
- 保存按钮始终可见，未编辑时置灰
- 去掉字段key名称显示
- 每个字段右侧始终显示保存按钮

**影响范围**:
- `src/client/src/pages/Settings.jsx`

**预期收益**:
- 交互逻辑更清晰
- 用户操作更直观
- 减少误操作

**重构建议**:
- 提取时间选择器为独立组件 `TimePicker`
- 统一按钮状态管理
- 添加交互测试用例

---

#### T04: 安全区适配 + debounce 清理

**来源提交**:
- `4cef8a7` - 安全区适配 + debounce 清理

**目标**: 适配 iPhone 安全区，清理 debounce 逻辑

**当前状态**:
- 新增 .safe-area-pb 类 (env(safe-area-inset-bottom))
- Contracts.jsx debounceRef unmount 清理 useEffect

**影响范围**:
- `src/client/src/index.css`
- `src/client/src/pages/Contracts.jsx`

**预期收益**:
- iPhone 底部安全区适配
- 防止内存泄漏

**重构建议**:
- 创建全局安全区工具类
- 统一 debounce 清理模式
- 添加安全区测试用例

---

### 2.3 架构/代码改进 (P1)

#### T05: 安全审计 + lint清理 + UX改进

**来源提交**:
- `5dcadc1` - 全维度审计修复 (安全+lint+UX)

**目标**: 全面提升代码质量，修复安全漏洞，清理 lint 错误

**当前状态**:
- 安全: notifications/dashboard/dashboard-trend API 加 requireAuth
- 安全: api.js 401 自动登出 + GET 不传 body
- Lint: 移除7处 unused imports/variables
- UX: Modal 打开时锁定背景滚动
- UX: Toast 容器小屏自适应

**影响范围**:
- `src/server/routes/dashboard-trend.js`
- `src/server/routes/dashboard.js`
- `src/server/routes/notifications.js`
- `src/client/src/components/Layout.jsx`
- `src/client/src/components/Modal.jsx`
- `src/client/src/hooks/useToast.jsx`
- `src/client/src/lib/api.js`
- `src/client/src/pages/Dashboard.jsx`
- `src/client/src/pages/NoticeDetail.jsx`
- `src/client/src/pages/Platforms.jsx`
- `src/client/src/pages/Reports.jsx`

**预期收益**:
- 安全漏洞修复
- lint 错误清零
- UX 体验提升

**重构建议**:
- 拆分为三个独立提交:
  - `refactor(security): API 路由安全加固`
  - `refactor(lint): 移除 unused imports/variables`
  - `refactor(ui): Modal 和 Toast 改进`
- 添加安全测试用例
- 配置 lint 检查 CI

---

#### T06: 千里马爬虫架构改用 Playwright

**来源提交**:
- `076b00a` - 千里马详情页爬虫优化 - Playwright直接控制

**目标**: 替代 Scrapling StealthyFetcher，提升爬虫稳定性

**当前状态**:
- 改用 Playwright 直接控制浏览器
- 首页预热获取 cookies 策略
- 419 反爬重试逻辑（30秒等待+重新预热）

**影响范围**:
- `scripts/qianlima-detail.py`

**预期收益**:
- 爬虫更稳定
- 反爬能力提升
- 调试更方便

**重构建议**:
- 封装 Playwright 工具类
- 统一爬虫重试策略
- 添加爬虫测试用例
- 考虑代理轮换机制

---

#### T07: 配置读取兼容 DB+env 双源

**来源提交**:
- `1580e88` - config.js 恢复完整.env回退结构, zhiliao-api/wecom-notify 兼容DB+env双读

**目标**: 统一配置读取逻辑，支持 DB 和 env 双源

**当前状态**:
- 恢复完整 .env 回退结构
- zhiliao-api 兼容 DB+env 双读
- wecom-notify 兼容 DB+env 双读
- 优先级: DB > env > 默认值

**影响范围**:
- `src/server/config.js`
- `src/server/services/zhiliao-api.js`

**预期收益**:
- 配置灵活性提升
- 部署更方便
- 调试更容易

**重构建议**:
- 统一配置读取函数 `getConfig(key, defaultValue)`
- 添加配置优先级文档
- 添加配置测试用例

---

#### T08: restore keyword_source in Scrapling mapping

**来源提交**:
- `a6a45c0` - restore keyword_source in Scrapling mapping (migration 021 done)

**目标**: 恢复 Scrapling mapping 中的 keyword_source 字段

**当前状态**:
- 恢复 keyword_source 字段映射
- migration 021 已执行

**影响范围**:
- `src/server/services/scrapling-client.js`

**预期收益**:
- 数据完整性恢复
- 关键词溯源功能正常

**重构建议**:
- 验证 keyword_source 数据一致性
- 添加数据完整性测试
- 考虑添加数据验证层

---

### 2.4 前端测试修复 (P1)

#### T09: 前端全面测试修复拆分

**来源提交**:
- `136a3f5` - 前端全面测试修复 (8 issues)

**目标**: 拆分混合提交，分别处理 P0/P1/P2 问题

**当前状态**:
- P0: dashboard-trend select 补字段 + admin.js download-batch 路由嵌套修复
- P1: Dashboard 平台管理快捷入口仅 admin 可见 + dashboard.js 表名统一 + Contracts 搜索 debounce + Settings 颜色修正
- P2: Settings 新增用户管理模块 + ResetPassword token 过期提示

**影响范围**:
- `src/client/src/pages/Contracts.jsx`
- `src/client/src/pages/Dashboard.jsx`
- `src/client/src/pages/ResetPassword.jsx`
- `src/client/src/pages/Settings.jsx`
- `src/server/routes/admin.js`
- `src/server/routes/dashboard-trend.js`
- `src/server/routes/dashboard.js`

**预期收益**:
- 提交历史更清晰
- 问题分类更明确
- 便于回滚和追溯

**重构建议**:
- 拆分为三个独立提交:
  - `fix(frontend): P0 修复 (dashboard-trend + admin路由)`
  - `fix(frontend): P1 修复 (Dashboard权限 + 表名统一 + debounce + 颜色)`
  - `feat(frontend): P2 新增用户管理模块`
- 添加回归测试用例

---

## 3. 执行建议

### 3.1 分批执行策略

**第一批 (P0 - 立即执行)**:
- T01: 关键词过滤系统重构

**第二批 (P1 - 尽快执行)**:
- T02: 移动端响应式适配
- T03: 设置页时间选择器交互优化
- T05: 安全审计 + lint清理 + UX改进
- T06: 千里马爬虫架构改用 Playwright
- T07: 配置读取兼容 DB+env 双源
- T08: restore keyword_source in Scrapling mapping
- T09: 前端全面测试修复拆分

**第三批 (P2 - 按需执行)**:
- T04: 安全区适配 + debounce 清理

### 3.2 执行原则

1. **每个重构任务单独提交**: 使用 `refactor:` 前缀
2. **不改变外部行为**: 重构前后功能一致
3. **添加测试**: 每个重构任务配套测试用例
4. **更新文档**: 重构后更新相关设计文档
5. **代码审查**: 重构代码需经过审查

### 3.3 验收标准

- [ ] 所有现有测试通过
- [ ] 新增测试覆盖重构逻辑
- [ ] 无 lint 错误
- [ ] 性能无明显下降
- [ ] 文档已更新

---

## 4. 进度跟踪

| 任务ID | 任务名称 | 优先级 | 状态 | 负责人 | 预计完成 | 实际完成 |
|---|---|---|---|---|---|---|
| T01 | 关键词过滤系统重构 | P0 | 已完成 | 2026-07-07 | 2026-07-07 |
| T02 | 移动端响应式适配 | P1 | 已完成 | 2026-07-07 | 2026-07-07 |
| T03 | 设置页时间选择器交互优化 | P1 | 已完成 | 2026-07-07 | 2026-07-07 |
| T04 | 安全区适配 + debounce 清理 | P2 | 待开始 | - | - | - |
| T05 | 安全审计 + lint清理 + UX改进 | P1 | 待开始 | - | - | - |
| T06 | 千里马爬虫架构改用 Playwright | P1 | 待开始 | - | - | - |
| T07 | 配置读取兼容 DB+env 双源 | P1 | 待开始 | - | - | - |
| T08 | restore keyword_source in Scrapling mapping | P1 | 待开始 | - | - | - |
| T09 | 前端全面测试修复拆分 | P1 | 待开始 | - | - | - |

---

## 5. 相关文档

- [提交规范](./commit-convention.md)
- [实施计划](./implementation-plan.md)
- [系统设计](./system-design.md)
- [测试计划](./test-plan-dual-role-cli.md)

---

## 6. 更新日志

- **v1.0** (2026-07-07): 初始版本，提取16个重构任务
