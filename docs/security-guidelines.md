# 客户雷达 — 安全指南

> 版本: v1.0 | 日期: 2026-07-07
> 目的: 定义安全最佳实践和 API 安全规范

---

## 1. 认证与授权

### 1.1 认证流程

1. **用户登录**: 前端发送邮箱+密码到 `/api/auth/login`
2. **Token 生成**: 后端验证凭证，生成 JWT Token
3. **Token 存储**: 前端存储 Token 到 localStorage
4. **请求认证**: 前端在请求头中添加 `Authorization: Bearer <token>`
5. **Token 验证**: 后端验证 Token 有效性
6. **Token 刷新**: Token 过期前自动刷新

### 1.2 授权机制

- **角色定义**: admin, hr, presales, sales
- **权限控制**: 基于角色的 API 访问控制
- **路由保护**: 使用 `requireAuth` 中间件保护敏感路由

### 1.3 安全建议

- Token 有效期: 24小时
- 密码强度: 最少8位，包含大小写字母和数字
- 登录失败限制: 5次失败后锁定15分钟
- 密码存储: 使用 bcrypt 加密

---

## 2. API 安全规范

### 2.1 路由保护

**必须保护的路由**:
- `/api/notifications` - 通知相关
- `/api/dashboard` - 仪表盘数据
- `/api/dashboard/trend` - 趋势数据
- `/api/contracts` - 合同管理
- `/api/qualifications` - 资质管理
- `/api/settings` - 系统设置

**可选保护的路由**:
- `/api/notices` - 标讯列表（可公开）
- `/api/search` - 搜索功能（可公开）

### 2.2 请求验证

```javascript
// 示例: requireAuth 中间件
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const token = authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

### 2.3 CORS 配置

```javascript
const corsOptions = {
  origin: [
    'http://localhost:3000',  // 本地开发
    'https://radar.leadcom.chat',  // 生产环境
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};
```

---

## 3. 输入验证

### 3.1 验证规则

- **必填字段**: 检查字段是否存在且非空
- **长度限制**: 最小长度和最大长度
- **格式验证**: 使用正则表达式验证格式
- **类型检查**: 验证数据类型

### 3.2 验证示例

```javascript
const validateInput = (input, rules) => {
  const errors = [];
  
  if (rules.required && (!input || input.trim() === '')) {
    errors.push('Field is required');
  }
  
  if (rules.minLength && input && input.length < rules.minLength) {
    errors.push(`Minimum length is ${rules.minLength}`);
  }
  
  if (rules.maxLength && input && input.length > rules.maxLength) {
    errors.push(`Maximum length is ${rules.maxLength}`);
  }
  
  if (rules.pattern && input && !rules.pattern.test(input)) {
    errors.push('Invalid format');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};
```

### 3.3 常见验证模式

- **邮箱**: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- **手机号**: `/^1[3-9]\d{9}$/`
- **密码**: `/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/`

---

## 4. 数据安全

### 4.1 数据传输

- **HTTPS**: 生产环境强制使用 HTTPS
- **请求加密**: 敏感数据使用 HTTPS 传输
- **响应头**: 设置安全响应头

### 4.2 数据存储

- **密码加密**: 使用 bcrypt 加密密码
- **Token 安全**: JWT Token 使用强密钥签名
- **敏感数据**: 避免在日志中记录敏感信息

### 4.3 数据备份

- **定期备份**: 每天自动备份数据库
- **备份加密**: 备份文件加密存储
- **备份验证**: 定期验证备份完整性

---

## 5. 错误处理

### 5.1 错误响应格式

```javascript
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {} // 可选，仅开发环境
}
```

### 5.2 常见错误码

- `400`: 请求参数错误
- `401`: 未授权
- `403`: 禁止访问
- `404`: 资源不存在
- `500`: 服务器内部错误

### 5.3 错误处理建议

- **生产环境**: 不暴露详细错误信息
- **开发环境**: 提供详细错误信息
- **日志记录**: 记录所有错误到日志系统

---

## 6. 安全审计

### 6.1 审计日志

记录以下操作:
- 用户登录/登出
- 数据修改操作
- 权限变更操作
- 敏感数据访问

### 6.2 审计格式

```javascript
{
  "timestamp": "2026-07-07T10:00:00Z",
  "userId": 1,
  "action": "LOGIN",
  "resource": "/api/auth/login",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "status": "SUCCESS"
}
```

### 6.3 审计存储

- **存储位置**: 数据库审计表
- **保留期限**: 至少保留90天
- **访问控制**: 仅管理员可查看审计日志

---

## 7. 安全测试

### 7.1 测试类型

- **单元测试**: 测试安全函数和中间件
- **集成测试**: 测试 API 路由安全性
- **渗透测试**: 定期进行安全渗透测试

### 7.2 测试用例

- 认证中间件测试
- Token 验证测试
- 输入验证测试
- CORS 配置测试
- 401 自动登出测试

### 7.3 测试工具

- **ESLint**: 代码质量检查
- **Jest**: 单元测试框架
- **OWASP ZAP**: 安全扫描工具

---

## 8. 安全更新

### 8.1 依赖更新

- **定期检查**: 每月检查依赖安全漏洞
- **及时更新**: 发现漏洞后及时更新
- **版本锁定**: 使用 package-lock.json 锁定版本

### 8.2 安全公告

- **订阅公告**: 订阅 Node.js 和 npm 安全公告
- **快速响应**: 发现漏洞后24小时内响应
- **修复流程**: 修复 -> 测试 -> 部署

---

## 9. 安全检查清单

### 9.1 开发阶段

- [ ] 输入验证完整
- [ ] 认证中间件正确使用
- [ ] 敏感数据加密
- [ ] 错误处理完善
- [ ] 日志记录完整

### 9.2 测试阶段

- [ ] 安全测试通过
- [ ] 渗透测试通过
- [ ] 代码审查通过
- [ ] 依赖安全检查通过

### 9.3 部署阶段

- [ ] HTTPS 配置正确
- [ ] CORS 配置正确
- [ ] 环境变量安全
- [ ] 日志配置正确

---

## 10. 应急响应

### 10.1 安全事件响应

1. **发现**: 发现安全事件
2. **评估**: 评估事件影响范围
3. **隔离**: 隔离受影响系统
4. **修复**: 修复安全漏洞
5. **恢复**: 恢复系统服务
6. **总结**: 总结经验教训

### 10.2 联系方式

- **安全团队**: security@leadcom.chat
- **应急响应**: 13800138000
- **报告漏洞**: security@leadcom.chat

---

## 11. 参考资源

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js 安全最佳实践](https://nodejs.org/en/docs/guides/security/)
- [Express 安全最佳实践](https://expressjs.com/en/advanced/best-practice-security.html)
- [Supabase 安全指南](https://supabase.com/docs/guides/auth)

---

## 12. 更新日志

- **v1.0** (2026-07-07): 初始版本，定义安全最佳实践和 API 安全规范
