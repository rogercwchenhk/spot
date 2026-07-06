# 客户雷达 — 配置管理指南

> 版本: v1.0 | 日期: 2026-07-07
> 目的: 定义配置优先级、读取规范和环境变量清单

---

## 1. 配置优先级

### 1.1 优先级规则

配置读取遵循以下优先级（从高到低）：

1. **数据库 (system_config 表)**: 运行时可修改，优先级最高
2. **环境变量 (.env)**: 启动时加载，优先级次之
3. **代码默认值**: 硬编码在代码中，优先级最低

```
数据库 (system_config) > 环境变量 (.env) > 代码默认值
```

### 1.2 配置读取流程

```javascript
async function getConfig(key, fallback = null) {
  // 1. 优先从数据库读取
  const dbValue = await loadFromDatabase(key);
  if (dbValue !== undefined) return dbValue;
  
  // 2. 回退到环境变量
  const envKey = key.replace(/\./g, '_').toUpperCase();
  const envValue = process.env[envKey];
  if (envValue !== undefined) return envValue;
  
  // 3. 回退到默认值
  return fallback;
}
```

### 1.3 配置更新时机

- **数据库配置**: 运行时可通过管理界面或 CLI 更新
- **环境变量**: 需要重启服务才能生效
- **代码默认值**: 需要重新部署才能生效

---

## 2. 配置读取规范

### 2.1 统一使用 getConfig

**正确示例**:
```javascript
const { getConfig } = require('./config-reader');

// 读取配置，带默认值
const apiKey = await getConfig('llm.api_key', 'default-key');
const model = await getConfig('llm.model', 'mimo-v2.5-pro');
const baseUrl = await getConfig('llm.base_url', 'https://api.example.com');
```

**错误示例**:
```javascript
// ❌ 直接使用 process.env
const apiKey = process.env.MIMO_API_KEY;
const model = process.env.MIMO_MODEL || 'mimo-v2.5-pro';
```

### 2.2 配置键命名规范

**命名格式**: `模块.配置项`

**示例**:
- `llm.api_key` - LLM API 密钥
- `llm.model` - LLM 模型名称
- `llm.base_url` - LLM API 基础 URL
- `email.smtp_host` - SMTP 服务器地址
- `email.smtp_port` - SMTP 端口
- `push.webhook_url` - 推送 Webhook URL
- `push.enabled` - 推送是否启用

### 2.3 默认值设置

**必须设置默认值**:
```javascript
// ✅ 带默认值
const model = await getConfig('llm.model', 'mimo-v2.5-pro');

// ❌ 无默认值（可能导致 undefined）
const model = await getConfig('llm.model');
```

**可选配置（无默认值）**:
```javascript
// 可选配置，允许为 null
const apiKey = await getConfig('llm.api_key');
if (!apiKey) {
  console.warn('LLM API key not configured');
}
```

---

## 3. 环境变量清单

### 3.1 Supabase 配置

| 环境变量 | 说明 | 默认值 |
|---|---|---|
| `SUPABASE_URL` | Supabase 项目 URL | 必填 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服务角色密钥 | 必填 |
| `SUPABASE_ANON_KEY` | Supabase 匿名密钥 | 可选 |

### 3.2 LLM 配置

| 环境变量 | 说明 | 默认值 |
|---|---|---|
| `MIMO_API_KEY` | 小米 MIMO API 密钥 | 必填 |
| `MIMO_MODEL` | MIMO 模型名称 | `mimo-v2.5-pro` |
| `MIMO_BASE_URL` | MIMO API 基础 URL | `https://token-plan-cn.xiaomimimo.com/v1` |

### 3.3 知了标讯配置

| 环境变量 | 说明 | 默认值 |
|---|---|---|
| `ZLBX_API_KEY` | 知了标讯 API 密钥 | 必填 |
| `ZLBX_BASE_URL` | 知了标讯 API 基础 URL | `https://mcp-server.zhiliaobiaoxun.com/api_v2` |

### 3.4 邮件配置

| 环境变量 | 说明 | 默认值 |
|---|---|---|
| `SMTP_HOST` | SMTP 服务器地址 | `smtp.yunyou.top` |
| `SMTP_PORT` | SMTP 端口 | `465` |
| `SMTP_USER` | SMTP 用户名 | 必填 |
| `SMTP_PASS` | SMTP 密码 | 必填 |

### 3.5 推送配置

| 环境变量 | 说明 | 默认值 |
|---|---|---|
| `WECOM_WEBHOOK_URL` | 企微群机器人 Webhook URL | 可选 |
| `PWA_URL` | PWA 应用 URL | `http://localhost:5173` |
| `APP_URL` | 应用 URL | `http://localhost:5173` |

### 3.6 爬虫配置

| 环境变量 | 说明 | 默认值 |
|---|---|---|
| `SCRAPLING_PYTHON` | Python 解释器路径 | `python3.13` |

---

## 4. 数据库配置 (system_config)

### 4.1 配置表结构

```sql
CREATE TABLE system_config (
  key VARCHAR(255) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 4.2 常用配置项

| 配置键 | 说明 | 类型 | 默认值 |
|---|---|---|---|
| `llm.api_key` | LLM API 密钥 | string | - |
| `llm.model` | LLM 模型名称 | string | `mimo-v2.5-pro` |
| `llm.base_url` | LLM API 基础 URL | string | - |
| `email.smtp_host` | SMTP 服务器地址 | string | `smtp.yunyou.top` |
| `email.smtp_port` | SMTP 端口 | number | `465` |
| `email.smtp_user` | SMTP 用户名 | string | - |
| `email.smtp_pass` | SMTP 密码 | string | - |
| `push.webhook_url` | 推送 Webhook URL | string | - |
| `push.enabled` | 推送是否启用 | boolean | `true` |
| `push.schedule` | 推送时间表 | array | `['09:00', '14:00']` |
| `fetch.keyword_groups` | 关键词分组 | array | - |
| `fetch.province` | 目标省份 | string | `广东` |

### 4.3 配置更新方式

**通过管理界面**:
- 登录管理后台
- 进入系统设置页面
- 修改配置并保存

**通过 CLI**:
```bash
# 查看配置
cr admin config:list

# 设置配置
cr admin config:set llm.api_key "your-api-key"

# 删除配置
cr admin config:delete llm.api_key
```

**通过 API**:
```javascript
// 更新配置
await radarApi.post('/admin/config', {
  key: 'llm.api_key',
  value: 'your-api-key',
});
```

---

## 5. 配置缓存

### 5.1 缓存机制

```javascript
let cache = {};
let cacheTime = 0;
const CACHE_TTL = 60 * 1000; // 1 分钟

async function loadConfig() {
  const now = Date.now();
  if (now - cacheTime < CACHE_TTL && Object.keys(cache).length > 0) {
    return cache;
  }
  
  // 从数据库加载
  const { data } = await supabaseAdmin
    .from('system_config')
    .select('key, value');
  
  cache = {};
  for (const row of data || []) {
    cache[row.key] = row.value;
  }
  cacheTime = now;
  
  return cache;
}
```

### 5.2 缓存清除

**自动清除**:
- 缓存 TTL 为 1 分钟
- 超过 TTL 后自动重新加载

**手动清除**:
```javascript
const { clearCache } = require('./config-reader');

// 配置更新后清除缓存
await updateConfig(key, value);
clearCache();
```

### 5.3 缓存注意事项

- 缓存可能导致配置更新延迟生效（最多 1 分钟）
- 关键配置更新后建议手动清除缓存
- 缓存仅在单进程内有效，多进程需要各自清除

---

## 6. 配置验证

### 6.1 启动时验证

```javascript
async function validateConfig() {
  const errors = [];
  
  // 必填配置检查
  const requiredConfigs = [
    'supabase.url',
    'supabase.service_role_key',
    'llm.api_key',
  ];
  
  for (const key of requiredConfigs) {
    const value = await getConfig(key);
    if (!value) {
      errors.push(`Missing required config: ${key}`);
    }
  }
  
  if (errors.length > 0) {
    console.error('Configuration errors:', errors);
    process.exit(1);
  }
}
```

### 6.2 运行时验证

```javascript
async function getValidatedConfig(key, validator, fallback) {
  const value = await getConfig(key, fallback);
  
  if (value && !validator(value)) {
    console.warn(`Invalid config value for ${key}: ${value}`);
    return fallback;
  }
  
  return value;
}

// 使用示例
const port = await getValidatedConfig(
  'email.smtp_port',
  (v) => Number(v) > 0 && Number(v) < 65536,
  465
);
```

---

## 7. 安全最佳实践

### 7.1 敏感配置保护

**敏感配置项**:
- API 密钥
- 数据库密码
- SMTP 密码
- Webhook URL

**保护措施**:
- 敏感配置存储在数据库中时加密
- 日志中不记录敏感配置
- API 响应中脱敏显示

### 7.2 配置访问控制

**权限控制**:
- 仅管理员可查看/修改配置
- 普通用户无权访问配置接口
- 配置变更记录审计日志

### 7.3 配置备份

**备份策略**:
- 定期备份 system_config 表
- 备份 .env 文件
- 备份文件加密存储

---

## 8. 常见问题

### 8.1 配置不生效

**可能原因**:
- 缓存未清除
- 环境变量未重启
- 配置键拼写错误

**解决方法**:
```javascript
// 清除缓存
clearCache();

// 重启服务
// pm2 restart radar-server

// 检查配置键
console.log(await getConfig('your.config.key'));
```

### 8.2 配置优先级混乱

**可能原因**:
- 数据库和环境变量同时存在
- 配置键命名不规范

**解决方法**:
- 统一使用数据库配置
- 删除环境变量中的重复配置
- 使用规范的配置键命名

### 8.3 配置丢失

**可能原因**:
- 数据库连接失败
- 缓存过期
- 配置表不存在

**解决方法**:
```javascript
// 检查数据库连接
const { data, error } = await supabaseAdmin
  .from('system_config')
  .select('count');

if (error) {
  console.error('Database connection failed:', error);
}

// 检查配置表
const { data: tables } = await supabaseAdmin
  .rpc('get_tables');
```

---

## 9. 配置管理工具

### 9.1 CLI 工具

```bash
# 列出所有配置
cr admin config:list

# 获取配置值
cr admin config:get llm.api_key

# 设置配置值
cr admin config:set llm.api_key "your-api-key"

# 删除配置
cr admin config:delete llm.api_key

# 验证配置
cr admin config:validate
```

### 9.2 管理界面

- 登录管理后台
- 进入系统设置页面
- 查看/修改配置
- 配置变更历史

### 9.3 API 接口

```javascript
// 获取配置
GET /api/admin/config/:key

// 更新配置
POST /api/admin/config
{
  "key": "llm.api_key",
  "value": "your-api-key"
}

// 删除配置
DELETE /api/admin/config/:key

// 列出所有配置
GET /api/admin/config
```

---

## 10. 最佳实践总结

### 10.1 配置读取

- 统一使用 `getConfig` 函数
- 设置合理的默认值
- 避免直接使用 `process.env`

### 10.2 配置管理

- 使用数据库存储运行时配置
- 环境变量用于启动时配置
- 代码默认值作为最后回退

### 10.3 配置安全

- 敏感配置加密存储
- 日志中不记录敏感信息
- 配置访问控制权限

### 10.4 配置维护

- 定期备份配置
- 配置变更记录日志
- 配置验证防止错误

---

## 11. 参考资源

- [Node.js 环境变量](https://nodejs.org/api/process.html#process_process_env)
- [dotenv 文档](https://github.com/motdotla/dotenv)
- [Supabase 配置](https://supabase.com/docs/guides/config)

---

## 12. 更新日志

- **v1.0** (2026-07-07): 初始版本，定义配置优先级、读取规范和环境变量清单
