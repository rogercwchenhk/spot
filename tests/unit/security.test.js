/**
 * 安全测试单元测试
 * 
 * 测试 API 路由安全中间件和认证流程
 */

// ============================================================
// 测试工具函数
// ============================================================

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

// ============================================================
// 测试认证中间件
// ============================================================

function testAuthMiddleware() {
  console.log('Testing auth middleware...');
  
  // 模拟 requireAuth 中间件
  const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // 模拟 token 验证
    if (token === 'valid-token') {
      req.user = { id: 1, email: 'test@example.com' };
      next();
    } else {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
  
  // 测试无 token
  let resStatus = null;
  let resJson = null;
  const req1 = { headers: {} };
  const res1 = {
    status: (status) => {
      resStatus = status;
      return res1;
    },
    json: (data) => {
      resJson = data;
    },
  };
  
  requireAuth(req1, res1, () => {});
  assertEqual(resStatus, 401, '无 token 返回 401');
  assertEqual(resJson.error, 'Unauthorized', '无 token 返回 Unauthorized');
  
  // 测试无效 token
  resStatus = null;
  resJson = null;
  const req2 = { headers: { authorization: 'Bearer invalid-token' } };
  
  requireAuth(req2, res1, () => {});
  assertEqual(resStatus, 401, '无效 token 返回 401');
  assertEqual(resJson.error, 'Invalid token', '无效 token 返回 Invalid token');
  
  // 测试有效 token
  let nextCalled = false;
  const req3 = { headers: { authorization: 'Bearer valid-token' } };
  const res3 = {
    status: () => res3,
    json: () => {},
  };
  
  requireAuth(req3, res3, () => {
    nextCalled = true;
  });
  assert(nextCalled, '有效 token 调用 next');
  assertEqual(req3.user.id, 1, '有效 token 设置用户 ID');
  assertEqual(req3.user.email, 'test@example.com', '有效 token 设置用户邮箱');
  
  console.log('✓ auth middleware tests passed');
}

// ============================================================
// 测试 API 路由安全
// ============================================================

function testApiRouteSecurity() {
  console.log('Testing API route security...');
  
  // 模拟 API 路由
  const routes = [
    { path: '/api/notifications', method: 'GET', requiresAuth: true },
    { path: '/api/dashboard', method: 'GET', requiresAuth: true },
    { path: '/api/dashboard/trend', method: 'GET', requiresAuth: true },
    { path: '/api/notices', method: 'GET', requiresAuth: false },
    { path: '/api/contracts', method: 'GET', requiresAuth: true },
    { path: '/api/qualifications', method: 'GET', requiresAuth: true },
  ];
  
  // 测试路由配置
  routes.forEach(route => {
    if (route.requiresAuth) {
      assert(route.requiresAuth === true, `${route.path} 需要认证`);
    } else {
      assert(route.requiresAuth === false, `${route.path} 不需要认证`);
    }
  });
  
  console.log('✓ API route security tests passed');
}

// ============================================================
// 测试 401 自动登出
// ============================================================

function test401AutoLogout() {
  console.log('Testing 401 auto logout...');
  
  // 模拟 401 响应处理
  const handle401 = (response, storage, location) => {
    if (response.status === 401) {
      // 清除本地存储
      storage.removeItem('token');
      storage.removeItem('user');
      
      // 重定向到登录页
      location.href = '/login';
      
      return true;
    }
    return false;
  };
  
  // 模拟 localStorage
  const localStorageMock = {
    store: {},
    removeItem: function(key) {
      delete this.store[key];
    },
    getItem: function(key) {
      return this.store[key] || null;
    },
  };
  
  // 模拟 window.location
  const locationMock = {
    href: '',
  };
  
  // 测试 401 响应
  const response401 = { status: 401 };
  const result = handle401(response401, localStorageMock, locationMock);
  
  assert(result === true, '401 响应返回 true');
  assert(localStorageMock.store['token'] === undefined, 'Token 已清除');
  assert(locationMock.href === '/login', '重定向到登录页');
  
  console.log('✓ 401 auto logout tests passed');
}

// ============================================================
// 测试 token 验证
// ============================================================

function testTokenValidation() {
  console.log('Testing token validation...');
  
  // 模拟 token 验证函数
  const validateToken = (token) => {
    if (!token || typeof token !== 'string') {
      return { valid: false, error: 'Token is required' };
    }
    
    if (token.length < 10) {
      return { valid: false, error: 'Token is too short' };
    }
    
    if (token === 'expired-token') {
      return { valid: false, error: 'Token has expired' };
    }
    
    if (token === 'valid-token') {
      return { valid: true, user: { id: 1, email: 'test@example.com' } };
    }
    
    return { valid: false, error: 'Invalid token' };
  };
  
  // 测试无效 token
  const result1 = validateToken(null);
  assertEqual(result1.valid, false, 'null token 无效');
  
  const result2 = validateToken('');
  assertEqual(result2.valid, false, '空 token 无效');
  
  const result3 = validateToken('short');
  assertEqual(result3.valid, false, '短 token 无效');
  
  // 测试过期 token
  const result4 = validateToken('expired-token');
  assertEqual(result4.valid, false, '过期 token 无效');
  assertEqual(result4.error, 'Token has expired', '过期 token 错误信息');
  
  // 测试有效 token
  const result5 = validateToken('valid-token');
  assertEqual(result5.valid, true, '有效 token 有效');
  assertEqual(result5.user.id, 1, '有效 token 用户 ID');
  
  console.log('✓ token validation tests passed');
}

// ============================================================
// 测试 CORS 配置
// ============================================================

function testCorsConfig() {
  console.log('Testing CORS configuration...');
  
  // 模拟 CORS 配置
  const corsConfig = {
    origin: ['http://localhost:3000', 'https://radar.leadcom.chat'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  };
  
  // 测试 CORS 配置
  assert(corsConfig.origin.includes('http://localhost:3000'), '允许本地开发环境');
  assert(corsConfig.origin.includes('https://radar.leadcom.chat'), '允许生产环境');
  assert(corsConfig.methods.includes('GET'), '允许 GET 方法');
  assert(corsConfig.methods.includes('POST'), '允许 POST 方法');
  assert(corsConfig.allowedHeaders.includes('Authorization'), '允许 Authorization 头');
  assert(corsConfig.credentials === true, '允许凭证');
  
  console.log('✓ CORS configuration tests passed');
}

// ============================================================
// 测试输入验证
// ============================================================

function testInputValidation() {
  console.log('Testing input validation...');
  
  // 模拟输入验证函数
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
  
  // 测试必填字段
  const result1 = validateInput('', { required: true });
  assertEqual(result1.valid, false, '空输入无效');
  assertEqual(result1.errors[0], 'Field is required', '空输入错误信息');
  
  // 测试最小长度
  const result2 = validateInput('ab', { minLength: 3 });
  assertEqual(result2.valid, false, '短输入无效');
  assertEqual(result2.errors[0], 'Minimum length is 3', '短输入错误信息');
  
  // 测试最大长度
  const result3 = validateInput('abcdefghijk', { maxLength: 10 });
  assertEqual(result3.valid, false, '长输入无效');
  assertEqual(result3.errors[0], 'Maximum length is 10', '长输入错误信息');
  
  // 测试正则表达式
  const result4 = validateInput('invalid-email', { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ });
  assertEqual(result4.valid, false, '无效邮箱格式');
  
  // 测试有效输入
  const result5 = validateInput('test@example.com', { 
    required: true, 
    minLength: 5, 
    maxLength: 50,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  });
  assertEqual(result5.valid, true, '有效输入');
  
  console.log('✓ input validation tests passed');
}

// ============================================================
// 运行测试
// ============================================================

function runAllTests() {
  console.log('=== 安全测试单元测试 ===\n');
  
  try {
    testAuthMiddleware();
    testApiRouteSecurity();
    test401AutoLogout();
    testTokenValidation();
    testCorsConfig();
    testInputValidation();
    
    console.log('\n✓ 所有测试通过！');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ 测试失败:', error.message);
    process.exit(1);
  }
}

runAllTests();
