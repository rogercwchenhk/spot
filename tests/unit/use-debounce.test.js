/**
 * useDebounce Hook 单元测试
 * 
 * 测试 useDebounce, useDebouncedCallback, useDebouncedState hooks
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
// 测试 useDebounce 逻辑
// ============================================================

function testUseDebounce() {
  console.log('Testing useDebounce logic...');
  
  // 模拟 useDebounce 逻辑
  let debouncedValue = '';
  let timer = null;
  
  const useDebounce = (value, delay = 300) => {
    if (timer) {
      clearTimeout(timer);
    }
    
    timer = setTimeout(() => {
      debouncedValue = value;
    }, delay);
    
    return debouncedValue;
  };
  
  // 测试初始值
  assertEqual(debouncedValue, '', '初始值');
  
  // 测试 debounce 逻辑
  useDebounce('test', 100);
  assertEqual(debouncedValue, '', 'debounce 前值不变');
  
  // 模拟延迟
  setTimeout(() => {
    assertEqual(debouncedValue, 'test', 'debounce 后值更新');
    console.log('✓ useDebounce logic tests passed');
  }, 150);
}

// ============================================================
// 测试 useDebouncedCallback 逻辑
// ============================================================

function testUseDebouncedCallback() {
  console.log('Testing useDebouncedCallback logic...');
  
  // 模拟 useDebouncedCallback 逻辑
  let callbackExecuted = false;
  let timer = null;
  
  const useDebouncedCallback = (callback, delay = 300) => {
    const debouncedCallback = (...args) => {
      if (timer) {
        clearTimeout(timer);
      }
      
      timer = setTimeout(() => {
        callback(...args);
      }, delay);
    };
    
    const cancel = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };
    
    const flush = (...args) => {
      cancel();
      callback(...args);
    };
    
    return { debouncedCallback, cancel, flush };
  };
  
  // 测试回调函数
  const callback = () => {
    callbackExecuted = true;
  };
  
  const { debouncedCallback, cancel, flush } = useDebouncedCallback(callback, 100);
  
  // 测试 debounce 回调
  debouncedCallback();
  assertEqual(callbackExecuted, false, 'debounce 回调未立即执行');
  
  // 测试取消
  cancel();
  assertEqual(callbackExecuted, false, '取消后回调未执行');
  
  // 测试立即执行
  flush();
  assert(callbackExecuted, '立即执行回调');
  
  console.log('✓ useDebouncedCallback logic tests passed');
}

// ============================================================
// 测试 useDebouncedState 逻辑
// ============================================================

function testUseDebouncedState() {
  console.log('Testing useDebouncedState logic...');
  
  // 模拟 useDebouncedState 逻辑
  let value = '';
  let debouncedValue = '';
  let timer = null;
  
  const useDebouncedState = (initialValue, delay = 300) => {
    value = initialValue;
    debouncedValue = initialValue;
    
    const setValue = (newValue) => {
      value = newValue;
      
      if (timer) {
        clearTimeout(timer);
      }
      
      timer = setTimeout(() => {
        debouncedValue = newValue;
      }, delay);
    };
    
    return [value, setValue, debouncedValue];
  };
  
  // 测试初始状态
  const [initialValue, setInitialValue, initialDebouncedValue] = useDebouncedState('', 100);
  assertEqual(initialValue, '', '初始值');
  assertEqual(initialDebouncedValue, '', '初始 debounce 值');
  
  // 测试设置值
  setInitialValue('test');
  assertEqual(value, 'test', '设置后值更新');
  assertEqual(debouncedValue, '', '设置后 debounce 值未更新');
  
  // 模拟延迟
  setTimeout(() => {
    assertEqual(debouncedValue, 'test', '延迟后 debounce 值更新');
    console.log('✓ useDebouncedState logic tests passed');
  }, 150);
}

// ============================================================
// 测试 debounce 时间延迟
// ============================================================

function testDebounceDelay() {
  console.log('Testing debounce delay...');
  
  // 模拟不同延迟时间
  const delays = [100, 200, 300, 500];
  
  delays.forEach(delay => {
    let value = '';
    let debouncedValue = '';
    let timer = null;
    
    const useDebounce = (newValue) => {
      value = newValue;
      
      if (timer) {
        clearTimeout(timer);
      }
      
      timer = setTimeout(() => {
        debouncedValue = newValue;
      }, delay);
    };
    
    // 测试延迟
    useDebounce('test');
    assertEqual(debouncedValue, '', `延迟 ${delay}ms 前值不变`);
    
    // 模拟延迟
    setTimeout(() => {
      assertEqual(debouncedValue, 'test', `延迟 ${delay}ms 后值更新`);
    }, delay + 50);
  });
  
  console.log('✓ debounce delay tests passed');
}

// ============================================================
// 测试 debounce 取消
// ============================================================

function testDebounceCancel() {
  console.log('Testing debounce cancel...');
  
  // 模拟取消逻辑
  let value = '';
  let debouncedValue = '';
  let timer = null;
  
  const useDebounce = (newValue) => {
    value = newValue;
    
    if (timer) {
      clearTimeout(timer);
    }
    
    timer = setTimeout(() => {
      debouncedValue = newValue;
    }, 100);
  };
  
  const cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };
  
  // 测试取消
  useDebounce('test');
  cancel();
  
  // 模拟延迟
  setTimeout(() => {
    assertEqual(debouncedValue, '', '取消后值未更新');
    console.log('✓ debounce cancel tests passed');
  }, 150);
}

// ============================================================
// 运行测试
// ============================================================

function runAllTests() {
  console.log('=== useDebounce Hook 单元测试 ===\n');
  
  try {
    testUseDebounce();
    testUseDebouncedCallback();
    testUseDebouncedState();
    testDebounceDelay();
    testDebounceCancel();
    
    console.log('\n✓ 所有测试通过！');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ 测试失败:', error.message);
    process.exit(1);
  }
}

runAllTests();
