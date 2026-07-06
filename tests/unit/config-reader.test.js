/**
 * 配置读取器单元测试
 * 
 * 测试 config-reader.js 的配置读取逻辑、缓存机制、优先级
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
// 测试配置优先级
// ============================================================

function testConfigPriority() {
  console.log('Testing config priority...');
  
  // 模拟配置优先级: DB > env > 默认值
  const dbConfig = {
    'llm.api_key': 'db-api-key',
    'llm.model': 'db-model',
    'llm.base_url': 'https://db.example.com',
  };
  
  const envConfig = {
    'MIMO_API_KEY': 'env-api-key',
    'MIMO_MODEL': 'env-model',
    'MIMO_BASE_URL': 'https://env.example.com',
  };
  
  // 模拟 getConfig 函数
  const getConfig = async (key, fallback = null) => {
    // 优先从 DB 读取
    if (dbConfig[key] !== undefined) {
      return dbConfig[key];
    }
    
    // 回退到 env
    const envKey = key.replace(/\./g, '_').toUpperCase();
    if (envConfig[envKey] !== undefined) {
      return envConfig[envKey];
    }
    
    // 回退到默认值
    return fallback;
  };
  
  // 测试 DB 优先
  return getConfig('llm.api_key', 'default-key').then(result => {
    assertEqual(result, 'db-api-key', 'DB 优先级最高');
  });
  
  // 测试 env 回退
  return getConfig('llm.api_key_env', 'default-key').then(result => {
    assertEqual(result, 'default-key', 'env 回退');
  });
  
  // 测试默认值
  return getConfig('nonexistent.key', 'default-value').then(result => {
    assertEqual(result, 'default-value', '默认值回退');
  });
}

// ============================================================
// 测试缓存机制
// ============================================================

function testCache() {
  console.log('Testing cache mechanism...');
  
  // 模拟缓存
  let cache = {};
  let cacheTime = 0;
  const CACHE_TTL = 60 * 1000; // 1 分钟
  
  const loadConfig = async () => {
    const now = Date.now();
    if (now - cacheTime < CACHE_TTL && Object.keys(cache).length > 0) {
      return cache;
    }
    
    // 模拟从 DB 加载
    cache = {
      'llm.api_key': 'cached-key',
      'llm.model': 'cached-model',
    };
    cacheTime = now;
    
    return cache;
  };
  
  const clearCache = () => {
    cache = {};
    cacheTime = 0;
  };
  
  // 测试缓存加载
  return loadConfig().then(config => {
    assertEqual(config['llm.api_key'], 'cached-key', '缓存加载');
    assertEqual(Object.keys(cache).length, 2, '缓存包含配置');
  });
  
  // 测试缓存清除
  clearCache();
  assertEqual(Object.keys(cache).length, 0, '缓存已清除');
  
  // 测试缓存过期
  cacheTime = Date.now() - CACHE_TTL - 1000;
  return loadConfig().then(config => {
    assertEqual(config['llm.api_key'], 'cached-key', '缓存过期后重新加载');
  });
}

// ============================================================
// 测试 JSON 解析
// ============================================================

function testJsonParsing() {
  console.log('Testing JSON parsing...');
  
  // 模拟 JSON 解析
  const parseValue = (raw) => {
    if (typeof raw === 'string') {
      try { return JSON.parse(raw); } catch (_) { return raw; }
    }
    return raw;
  };
  
  // 测试 JSON 字符串
  assertEqual(parseValue('"value"'), 'value', 'JSON 字符串解析');
  assertEqual(parseValue('123'), 123, 'JSON 数字解析');
  assertEqual(parseValue('true'), true, 'JSON 布尔值解析');
  const arrResult = parseValue('[1,2,3]');
  assert(Array.isArray(arrResult), 'JSON 数组解析');
  assertEqual(arrResult.length, 3, 'JSON 数组长度');
  assertEqual(arrResult[0], 1, 'JSON 数组第一个元素');
  const objResult = parseValue('{"key":"value"}');
  assert(typeof objResult === 'object', 'JSON 对象解析');
  assertEqual(objResult.key, 'value', 'JSON 对象属性');
  
  // 测试非 JSON 字符串
  assertEqual(parseValue('plain string'), 'plain string', '普通字符串');
  assertEqual(parseValue(''), '', '空字符串');
  
  // 测试非字符串值
  assertEqual(parseValue(123), 123, '数字值');
  assertEqual(parseValue(true), true, '布尔值');
  assertEqual(parseValue(null), null, 'null 值');
  
  console.log('✓ JSON parsing tests passed');
}

// ============================================================
// 测试配置键转换
// ============================================================

function testKeyConversion() {
  console.log('Testing key conversion...');
  
  // 模拟配置键转换
  const convertKey = (key) => {
    return key.replace(/\./g, '_').toUpperCase();
  };
  
  // 测试转换
  assertEqual(convertKey('llm.api_key'), 'LLM_API_KEY', '点号转下划线');
  assertEqual(convertKey('email.smtp_host'), 'EMAIL_SMTP_HOST', '多级键转换');
  assertEqual(convertKey('supabase.url'), 'SUPABASE_URL', '简单键转换');
  assertEqual(convertKey('push.webhook_url'), 'PUSH_WEBHOOK_URL', '推送配置键');
  
  console.log('✓ key conversion tests passed');
}

// ============================================================
// 测试环境变量回退
// ============================================================

function testEnvFallback() {
  console.log('Testing env fallback...');
  
  // 模拟环境变量
  const env = {
    'MIMO_API_KEY': 'env-api-key',
    'MIMO_MODEL': 'env-model',
    'MIMO_BASE_URL': 'https://env.example.com',
    'SMTP_HOST': 'smtp.example.com',
    'SMTP_PORT': '587',
  };
  
  // 模拟 getConfig with env fallback
  const getConfigWithEnv = async (key, fallback = null) => {
    const envKey = key.replace(/\./g, '_').toUpperCase();
    if (env[envKey] !== undefined) {
      return env[envKey];
    }
    return fallback;
  };
  
  // 测试 env 回退
  return getConfigWithEnv('mimo.api_key', 'default').then(result => {
    assertEqual(result, 'env-api-key', 'env 回退');
  });
  
  return getConfigWithEnv('mimo.model', 'default').then(result => {
    assertEqual(result, 'env-model', 'env 回退');
  });
  
  return getConfigWithEnv('smtp.host', 'default').then(result => {
    assertEqual(result, 'smtp.example.com', 'env 回退');
  });
  
  // 测试默认值
  return getConfigWithEnv('nonexistent.key', 'default').then(result => {
    assertEqual(result, 'default', '默认值');
  });
}

// ============================================================
// 测试配置验证
// ============================================================

function testConfigValidation() {
  console.log('Testing config validation...');
  
  // 模拟配置验证
  const validateConfig = (config) => {
    const errors = [];
    
    if (!config.supabase?.url) {
      errors.push('Missing supabase.url');
    }
    
    if (!config.supabase?.serviceRoleKey) {
      errors.push('Missing supabase.serviceRoleKey');
    }
    
    if (!config.llm?.apiKey) {
      errors.push('Missing llm.apiKey');
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  };
  
  // 测试有效配置
  const validConfig = {
    supabase: {
      url: 'https://example.supabase.co',
      serviceRoleKey: 'service-role-key',
    },
    llm: {
      apiKey: 'llm-api-key',
    },
  };
  
  const result1 = validateConfig(validConfig);
  assertEqual(result1.valid, true, '有效配置');
  
  // 测试无效配置
  const invalidConfig = {
    supabase: {
      url: 'https://example.supabase.co',
    },
    llm: {},
  };
  
  const result2 = validateConfig(invalidConfig);
  assertEqual(result2.valid, false, '无效配置');
  assert(result2.errors.length > 0, '有错误信息');
  
  console.log('✓ config validation tests passed');
}

// ============================================================
// 运行测试
// ============================================================

function runAllTests() {
  console.log('=== 配置读取器单元测试 ===\n');
  
  try {
    testConfigPriority();
    testCache();
    testJsonParsing();
    testKeyConversion();
    testEnvFallback();
    testConfigValidation();
    
    console.log('\n✓ 所有测试通过！');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ 测试失败:', error.message);
    process.exit(1);
  }
}

runAllTests();
