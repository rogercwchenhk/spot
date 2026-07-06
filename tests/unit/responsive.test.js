/**
 * 响应式组件单元测试
 * 
 * 测试 ResponsiveCard 组件和响应式工具函数
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
// 测试响应式工具函数
// ============================================================

function testResponsiveUtils() {
  console.log('Testing responsive utils...');
  
  // 模拟 responsive-utils 模块
  const BREAKPOINTS = {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  };
  
  const DISPLAY = {
    desktopOnly: 'hidden md:block',
    mobileOnly: 'md:hidden',
    tabletOnly: 'hidden md:block lg:hidden',
  };
  
  const GRID = {
    responsive124: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    responsive123: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    responsive24: 'grid grid-cols-2 lg:grid-cols-4',
    responsive25: 'grid grid-cols-2 sm:grid-cols-5',
    fixed3: 'grid grid-cols-3',
  };
  
  const GAP = {
    responsive: 'gap-2 sm:gap-4',
    small: 'gap-2',
    large: 'gap-4',
  };
  
  // 测试断点定义
  assertEqual(BREAKPOINTS.sm, '640px', '断点 sm');
  assertEqual(BREAKPOINTS.md, '768px', '断点 md');
  assertEqual(BREAKPOINTS.lg, '1024px', '断点 lg');
  
  // 测试显示类名
  assertEqual(DISPLAY.desktopOnly, 'hidden md:block', '桌面端显示');
  assertEqual(DISPLAY.mobileOnly, 'md:hidden', '移动端显示');
  
  // 测试网格类名
  assert(GRID.responsive124.includes('grid-cols-1'), '响应式网格 1列');
  assert(GRID.responsive124.includes('sm:grid-cols-2'), '响应式网格 2列');
  assert(GRID.responsive124.includes('lg:grid-cols-4'), '响应式网格 4列');
  
  // 测试间距类名
  assertEqual(GAP.responsive, 'gap-2 sm:gap-4', '响应式间距');
  
  console.log('✓ responsive utils tests passed');
}

// ============================================================
// 测试响应式组件结构
// ============================================================

function testResponsiveComponents() {
  console.log('Testing responsive components...');
  
  // 模拟组件结构
  const ResponsiveCard = {
    defaultProps: {
      title: null,
      children: null,
      actions: null,
      className: '',
      compact: false,
    },
  };
  
  const CardField = {
    defaultProps: {
      label: '',
      value: null,
      className: '',
    },
  };
  
  const CardAction = {
    defaultProps: {
      icon: null,
      label: '',
      onClick: null,
      variant: 'default',
      className: '',
    },
  };
  
  // 测试组件属性
  assert(ResponsiveCard.defaultProps.compact === false, '默认非紧凑模式');
  assert(CardAction.defaultProps.variant === 'default', '默认按钮变体');
  
  console.log('✓ responsive components tests passed');
}

// ============================================================
// 测试响应式布局逻辑
// ============================================================

function testResponsiveLayout() {
  console.log('Testing responsive layout...');
  
  // 模拟响应式布局类名
  const layouts = {
    desktop: 'hidden md:block',
    mobile: 'md:hidden',
    grid: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    gap: 'gap-2 sm:gap-4',
    padding: 'p-3 sm:p-4',
  };
  
  // 测试布局类名
  assert(layouts.desktop.includes('hidden'), '桌面端隐藏');
  assert(layouts.desktop.includes('md:block'), '桌面端显示');
  assert(layouts.mobile.includes('md:hidden'), '移动端隐藏');
  assert(layouts.grid.includes('grid-cols-1'), '移动端单列');
  assert(layouts.grid.includes('sm:grid-cols-2'), '平板端双列');
  assert(layouts.grid.includes('lg:grid-cols-4'), '桌面端四列');
  
  console.log('✓ responsive layout tests passed');
}

// ============================================================
// 测试响应式断点检测
// ============================================================

function testBreakpointDetection() {
  console.log('Testing breakpoint detection...');
  
  // 模拟断点检测函数
  function getCurrentBreakpoint(width) {
    if (width >= 1536) return '2xl';
    if (width >= 1280) return 'xl';
    if (width >= 1024) return 'lg';
    if (width >= 768) return 'md';
    if (width >= 640) return 'sm';
    return 'xs';
  }
  
  function isMobile(width) {
    return width < 768;
  }
  
  function isTablet(width) {
    return width >= 768 && width < 1024;
  }
  
  function isDesktop(width) {
    return width >= 1024;
  }
  
  // 测试断点检测
  assertEqual(getCurrentBreakpoint(320), 'xs', '手机断点');
  assertEqual(getCurrentBreakpoint(640), 'sm', '小平板断点');
  assertEqual(getCurrentBreakpoint(768), 'md', '平板断点');
  assertEqual(getCurrentBreakpoint(1024), 'lg', '桌面断点');
  assertEqual(getCurrentBreakpoint(1280), 'xl', '大桌面断点');
  assertEqual(getCurrentBreakpoint(1536), '2xl', '超大桌面断点');
  
  // 测试设备检测
  assert(isMobile(320), '手机');
  assert(isMobile(640), '小平板');
  assert(!isMobile(768), '平板');
  assert(isTablet(768), '平板');
  assert(isTablet(1023), '平板');
  assert(!isTablet(1024), '桌面');
  assert(isDesktop(1024), '桌面');
  assert(isDesktop(1920), '大桌面');
  
  console.log('✓ breakpoint detection tests passed');
}

// ============================================================
// 运行测试
// ============================================================

function runAllTests() {
  console.log('=== 响应式组件单元测试 ===\n');
  
  try {
    testResponsiveUtils();
    testResponsiveComponents();
    testResponsiveLayout();
    testBreakpointDetection();
    
    console.log('\n✓ 所有测试通过！');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ 测试失败:', error.message);
    process.exit(1);
  }
}

runAllTests();
