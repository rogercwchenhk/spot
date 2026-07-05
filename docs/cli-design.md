# CLI 工具设计 — Customer Radar CLI

> 版本: v1.0 | 日期: 2026-07-05

## 概述

`cr` 命令行工具，供商务人员快速查询标讯、管理员维护系统。
同时供 AI Agent 通过 Codex Skill 调用。

## 命令结构

```
cr <command> [subcommand] [options]

# 全局选项
  --json        JSON输出（AI Agent模式）
  --token       指定API Token
  --server      指定后端地址（默认 http://localhost:3000）
```

### Viewer 命令（只读）

| 命令 | 说明 |
|---|---|
| `cr notice list` | 查看今日标讯列表 |
| `cr notice list --level strong` | 按推荐等级筛选 |
| `cr notice list --region 广州` | 按地区筛选 |
| `cr notice list --days 7` | 最近N天 |
| `cr notice get <id>` | 查看标讯详情 |
| `cr notice search <keyword>` | 关键词搜索 |
| `cr match list` | 查看匹配结果 |
| `cr match list --level strong` | 按推荐等级筛选 |
| `cr match get <notice_id>` | 查看某条标讯的匹配详情 |
| `cr stats` | 系统概览统计 |
| `cr config list` | 查看系统配置（只读） |

### Admin 命令（写操作）

| 命令 | 说明 |
|---|---|
| `cr admin fetch` | 手动触发采集 |
| `cr admin fetch --keywords "运维,存储"` | 自定义关键词采集 |
| `cr admin crawl run` | Scrapling采集（全量） |
| `cr admin crawl run --platform <id>` | 指定平台采集 |
| `cr admin crawl runs` | 查看采集记录 |
| `cr admin process <id>` | AI提取单条标讯 |
| `cr admin process --batch` | 批量AI提取 |
| `cr admin match <id>` | 计算单条匹配 |
| `cr admin match --batch` | 批量匹配 |
| `cr admin download <id>` | 下载招标文件 |
| `cr admin download --batch` | 批量下载 |
| `cr admin scoring <id>` | 提取评分标准 |
| `cr admin push test` | 测试企微推送 |
| `cr admin pipeline` | 运行完整pipeline |
| `cr admin keyword stats` | 关键词效果统计 |
| `cr admin keyword report` | 生成关键词报告 |
| `cr admin keyword tune` | 查看调优建议 |
| `cr admin keyword tune --apply` | 应用调优建议 |
| `cr admin config get <key>` | 获取配置值 |
| `cr admin config set <key> <value>` | 设置配置值 |
| `cr admin qual list` | 查看资质列表 |
| `cr admin qual add` | 添加资质 |
| `cr admin contract list` | 查看合同列表 |
| `cr admin platform list` | 查看平台列表 |
| `cr admin platform ready` | 已配置平台列表 |

## 认证

- Token存储在 `~/.cr/token`
- 通过 `cr login` 获取
- 或通过 `--token` 参数/`CR_TOKEN` 环境变量

## JSON输出格式

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "total": 100,
    "page": 1,
    "per_page": 20
  }
}
```

## 文件结构

```
cli/
├── index.js          # 入口 + Commander配置
├── api.js            # HTTP客户端
├── auth.js           # Token管理
├── format.js         # 输出格式化
└── commands/
    ├── notice.js     # 标讯命令
    ├── match.js      # 匹配命令
    ├── crawl.js      # 采集命令
    ├── keyword.js    # 关键词命令
    ├── config.js     # 配置命令
    ├── qual.js       # 资质命令
    ├── contract.js   # 合同命令
    └── platform.js   # 平台命令
```
