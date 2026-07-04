# 双角色 CLI 后端测试计划

> 日期: 2026-07-04
> 测试方式: 通过 `cr` CLI 工具，分别以 admin 和 viewer(销售) 角色执行
> 测试目标: 验证后端 API 全链路功能 + 角色权限控制

---

## 测试账号

| 角色 | 邮箱 | 密码 | 用途 |
|---|---|---|---|
| admin | admin@leadcom.chat | Admin123456 | 管理员：全权限 |
| viewer | viewer@leadcom.chat | Viewer123456 | 销售：只读 |

---

## Part 1: Admin 角色测试

### 1.1 认证

| # | 命令 | 预期结果 | 验证点 |
|---|---|---|---|
| A01 | `cr login -e admin@leadcom.chat -p Admin123456` | 登录成功 | 返回角色 admin |
| A02 | `cr whoami` | 显示 admin 信息 | email + role |

### 1.2 系统状态

| # | 命令 | 预期结果 | 验证点 |
|---|---|---|---|
| A03 | `cr status` | 服务状态 ok | 服务器时间 + API 地址 |
| A04 | `cr admin stats` | 返回统计 JSON | notices/qualifications/contracts/matches 数量 |

### 1.3 标讯查看（admin 也有 viewer 权限）

| # | 命令 | 预期结果 | 验证点 |
|---|---|---|---|
| A05 | `cr list --days 1` | 返回标讯列表 | 有数据、显示匹配等级 |
| A06 | `cr today` | 返回今日标讯 | 数量 > 0 |
| A07 | `cr search "运维"` | 搜索结果 | 包含"运维"关键词 |
| A08 | `cr show 5` | 标讯详情 | 标题/匹配结果/招标文件状态/原文链接 |
| A09 | `cr match` | 强推标讯 | 等级为🟢强推 |
| A10 | `cr list -a unknown` | 按 doc_access_type 筛选 | 返回数据 |
| A11 | `cr list -a paid` | 筛选收费文件 | 暂无数据（当前全部 unknown） |

### 1.4 公司资质 CRUD

| # | 命令 | 预期结果 | 验证点 |
|---|---|---|---|
| A12 | `cr qual` | 查看公司资质列表 | 返回 7+ 条 |
| A13 | `cr admin qual:add --type TEST --name 测试资质 --level 三级 --cert T-001` | 新增成功 | 返回新 ID |
| A14 | `cr qual` | 列表包含新资质 | 能看到"测试资质" |
| A15 | `cr admin qual:update <id> --name 测试资质-更新` | 更新成功 | 名称已变 |
| A16 | `cr admin qual:delete <id>` | 删除成功 | 列表中不再出现 |

### 1.5 人员资质 CRUD

| # | 命令 | 预期结果 | 验证点 |
|---|---|---|---|
| A17 | `cr person` | 查看人员资质列表 | 返回 11+ 条 |
| A18 | `cr admin person:add --name 测试人员 --type TEST --qual 测试证书 --cert TP-001` | 新增成功 | 返回新 ID |
| A19 | `cr admin person:delete <id>` | 删除成功 | 列表中不再出现 |

### 1.6 合同管理

| # | 命令 | 预期结果 | 验证点 |
|---|---|---|---|
| A20 | `cr contract` | 查看合同列表 | 返回 5 条 |
| A21 | `cr admin contract:list` | 管理员视角列表 | 同上 |

### 1.7 平台管理

| # | 命令 | 预期结果 | 验证点 |
|---|---|---|---|
| A22 | `cr admin platform:list` | 平台列表 | 返回 60+ 个平台 |

### 1.8 用户管理

| # | 命令 | 预期结果 | 验证点 |
|---|---|---|---|
| A23 | `cr admin user:list` | 用户列表 | 包含 admin + viewer 用户 |

---

## Part 2: Viewer(销售) 角色测试

### 2.1 认证

| # | 命令 | 预期结果 | 验证点 |
|---|---|---|---|
| V01 | `cr login -e viewer@leadcom.chat -p Viewer123456` | 登录成功 | 返回角色 viewer |
| V02 | `cr whoami` | 显示 viewer 信息 | email + role |

### 2.2 只读查询（应全部成功）

| # | 命令 | 预期结果 | 验证点 |
|---|---|---|---|
| V03 | `cr status` | 服务状态 ok | 正常访问 |
| V04 | `cr list --days 7` | 标讯列表 | 正常返回 |
| V05 | `cr today` | 今日标讯 | 正常返回 |
| V06 | `cr search "存储"` | 搜索结果 | 正常返回 |
| V07 | `cr show 1` | 标讯详情 | 正常返回 |
| V08 | `cr match` | 强推标讯 | 正常返回 |
| V09 | `cr qual` | 公司资质 | 正常返回（只读） |
| V10 | `cr person` | 人员资质 | 正常返回（只读） |
| V11 | `cr contract` | 合同列表 | 正常返回（只读） |

### 2.3 权限拒绝（viewer 不能执行 admin 命令）

| # | 命令 | 预期结果 | 验证点 |
|---|---|---|---|
| V12 | `cr admin stats` | 拒绝 | 返回 403 Admin access required |
| V13 | `cr admin user:list` | 拒绝 | 返回 403 |
| V14 | `cr admin qual:add --type T --name X` | 拒绝 | 返回 403 |
| V15 | `cr admin person:add --name X --type T --qual X` | 拒绝 | 返回 403 |
| V16 | `cr admin contract:add ...` | 拒绝 | 返回 403 |
| V17 | `cr admin platform:add ...` | 拒绝 | 返回 403 |
| V18 | `cr admin notice:fetch` | 拒绝 | 返回 403 |
| V19 | `cr admin match:run` | 拒绝 | 返回 403 |
| V20 | `cr admin push:test` | 拒绝 | 返回 403 |
| V21 | `cr admin pipeline` | 拒绝 | 返回 403 |

---

## Part 3: 未认证测试

| # | 命令 | 预期结果 | 验证点 |
|---|---|---|---|
| N01 | `cr logout` + `cr whoami` | 未登录提示 | 提示先执行 cr login |
| N02 | `cr list` (未登录) | 仍然可用 | notices 为公开 API，不需要认证 |
| N03 | `cr admin stats` (未登录) | 拒绝 | 需要认证 |

---

## 执行方式

两个 Codex 子任务并行执行：
1. **Admin 测试员**: 以 admin 身份登录，执行 Part 1 全部用例
2. **销售测试员**: 以 viewer 身份登录，执行 Part 2 + Part 3 全部用例

## 通过标准

- Part 1: 全部通过（admin 拥有完整权限）
- Part 2: V01-V11 通过（只读正常），V12-V21 通过（写入被拒）
- Part 3: N01 通过，N02 通过，N03 通过
