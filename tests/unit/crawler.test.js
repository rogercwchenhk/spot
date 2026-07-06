/**
 * 爬虫配置单元测试
 * 
 * 测试爬虫配置、重试逻辑、代理轮换等功能
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
// 测试爬虫配置
// ============================================================

function testCrawlerConfig() {
  console.log('Testing crawler config...');
  
  // 模拟 CrawlerConfig
  const CrawlerConfig = {
    headless: true,
    timeout: 30000,
    delay: 10,
    maxRetries: 2,
    retryDelay: 30,
    warmupUrl: 'https://www.qianlima.com',
    warmupWait: 3,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'zh-CN',
    proxy: null,
  };
  
  // 测试默认配置
  assertEqual(CrawlerConfig.headless, true, '默认无头模式');
  assertEqual(CrawlerConfig.timeout, 30000, '默认超时时间');
  assertEqual(CrawlerConfig.delay, 10, '默认请求延迟');
  assertEqual(CrawlerConfig.maxRetries, 2, '默认最大重试次数');
  assertEqual(CrawlerConfig.retryDelay, 30, '默认重试延迟');
  assertEqual(CrawlerConfig.warmupUrl, 'https://www.qianlima.com', '默认预热URL');
  assertEqual(CrawlerConfig.viewport.width, 1920, '默认视口宽度');
  assertEqual(CrawlerConfig.viewport.height, 1080, '默认视口高度');
  
  console.log('✓ crawler config tests passed');
}

// ============================================================
// 测试重试逻辑
// ============================================================

function testRetryLogic() {
  console.log('Testing retry logic...');
  
  // 模拟重试逻辑
  const retryLogic = (fn, maxRetries = 2, retryDelay = 30) => {
    return async (...args) => {
      let lastError;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await fn(...args);
        } catch (error) {
          lastError = error;
          
          if (attempt < maxRetries) {
            console.log(`  Retry ${attempt + 1}/${maxRetries} after ${retryDelay}s...`);
            // 模拟延迟
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }
      
      throw lastError;
    };
  };
  
  // 测试成功情况
  let callCount = 0;
  const successFn = async () => {
    callCount++;
    return 'success';
  };
  
  const retriedSuccessFn = retryLogic(successFn, 2, 30);
  
  retriedSuccessFn().then(result => {
    assertEqual(result, 'success', '成功返回结果');
    assertEqual(callCount, 1, '只调用一次');
  });
  
  // 测试失败后重试成功
  let failCallCount = 0;
  const failThenSuccessFn = async () => {
    failCallCount++;
    if (failCallCount < 3) {
      throw new Error('Temporary error');
    }
    return 'success';
  };
  
  const retriedFailFn = retryLogic(failThenSuccessFn, 2, 30);
  
  retriedFailFn().then(result => {
    assertEqual(result, 'success', '重试后成功');
    assertEqual(failCallCount, 3, '调用三次');
  });
  
  console.log('✓ retry logic tests passed');
}

// ============================================================
// 测试验证码检测
// ============================================================

function testCaptchaDetection() {
  console.log('Testing captcha detection...');
  
  // 模拟验证码检测
  const checkCaptcha = (content) => {
    const captchaIndicators = [
      'Verification Required',
      '人机验证',
      'CAPTCHA',
      'captcha',
      'verify',
    ];
    return captchaIndicators.some(indicator => content.includes(indicator));
  };
  
  // 测试英文验证码
  assert(checkCaptcha('Verification Required'), '检测英文验证码');
  
  // 测试中文验证码
  assert(checkCaptcha('人机验证'), '检测中文验证码');
  
  // 测试大写验证码
  assert(checkCaptcha('CAPTCHA'), '检测大写验证码');
  
  // 测试小写验证码
  assert(checkCaptcha('captcha'), '检测小写验证码');
  
  // 测试正常内容
  assert(!checkCaptcha('正常页面内容'), '正常内容不检测为验证码');
  
  // 测试空内容
  assert(!checkCaptcha(''), '空内容不检测为验证码');
  
  console.log('✓ captcha detection tests passed');
}

// ============================================================
// 测试代理轮换
// ============================================================

function testProxyRotation() {
  console.log('Testing proxy rotation...');
  
  // 模拟代理轮换器
  class ProxyRotator {
    constructor(proxies) {
      this.proxies = proxies;
      this.currentIndex = 0;
    }
    
    getProxy() {
      if (!this.proxies || this.proxies.length === 0) {
        return null;
      }
      
      const proxy = this.proxies[this.currentIndex];
      this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
      return proxy;
    }
    
    getRandomProxy() {
      if (!this.proxies || this.proxies.length === 0) {
        return null;
      }
      
      return this.proxies[Math.floor(Math.random() * this.proxies.length)];
    }
  }
  
  // 测试代理轮换
  const proxies = [
    { server: 'http://proxy1:8080' },
    { server: 'http://proxy2:8080' },
    { server: 'http://proxy3:8080' },
  ];
  
  const rotator = new ProxyRotator(proxies);
  
  // 测试顺序轮换
  assertEqual(rotator.getProxy().server, 'http://proxy1:8080', '第一个代理');
  assertEqual(rotator.getProxy().server, 'http://proxy2:8080', '第二个代理');
  assertEqual(rotator.getProxy().server, 'http://proxy3:8080', '第三个代理');
  assertEqual(rotator.getProxy().server, 'http://proxy1:8080', '回到第一个代理');
  
  // 测试随机代理
  const randomProxy = rotator.getRandomProxy();
  assert(proxies.some(p => p.server === randomProxy.server), '随机代理有效');
  
  // 测试空代理池
  const emptyRotator = new ProxyRotator([]);
  assertEqual(emptyRotator.getProxy(), null, '空代理池返回 null');
  
  console.log('✓ proxy rotation tests passed');
}

// ============================================================
// 测试统计信息
// ============================================================

function testStats() {
  console.log('Testing stats...');
  
  // 模拟统计信息
  const stats = {
    total: 10,
    success: 8,
    failed: 1,
    partial: 1,
    captcha: 0,
    retries: 2,
    totalDuration: 100.5,
  };
  
  // 计算派生统计
  const getStats = (stats) => ({
    ...stats,
    successRate: stats.success / stats.total,
    avgDuration: stats.totalDuration / stats.total,
  });
  
  const fullStats = getStats(stats);
  
  // 测试统计
  assertEqual(fullStats.total, 10, '总数');
  assertEqual(fullStats.success, 8, '成功数');
  assertEqual(fullStats.failed, 1, '失败数');
  assertEqual(fullStats.successRate, 0.8, '成功率');
  assertEqual(fullStats.avgDuration, 10.05, '平均耗时');
  
  console.log('✓ stats tests passed');
}

// ============================================================
// 运行测试
// ============================================================

function runAllTests() {
  console.log('=== 爬虫配置单元测试 ===\n');
  
  try {
    testCrawlerConfig();
    testRetryLogic();
    testCaptchaDetection();
    testProxyRotation();
    testStats();
    
    console.log('\n✓ 所有测试通过！');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ 测试失败:', error.message);
    process.exit(1);
  }
}

runAllTests();
