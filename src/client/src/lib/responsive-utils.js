/**
 * 响应式工具函数和常量
 * 统一移动端响应式设计
 */

// ============================================================
// 断点定义
// ============================================================

export const BREAKPOINTS = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

// ============================================================
// 响应式类名
// ============================================================

/**
 * 响应式显示/隐藏
 */
export const DISPLAY = {
  // 桌面端显示，移动端隐藏
  desktopOnly: 'hidden md:block',
  // 移动端显示，桌面端隐藏
  mobileOnly: 'md:hidden',
  // 平板端显示
  tabletOnly: 'hidden md:block lg:hidden',
};

/**
 * 响应式网格
 */
export const GRID = {
  // 1列 → 2列 → 4列
  responsive124: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  // 1列 → 2列 → 3列
  responsive123: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  // 2列 → 4列
  responsive24: 'grid grid-cols-2 lg:grid-cols-4',
  // 2列 → 5列
  responsive25: 'grid grid-cols-2 sm:grid-cols-5',
  // 3列
  fixed3: 'grid grid-cols-3',
};

/**
 * 响应式间距
 */
export const GAP = {
  // 小间距 → 大间距
  responsive: 'gap-2 sm:gap-4',
  // 固定小间距
  small: 'gap-2',
  // 固定大间距
  large: 'gap-4',
};

/**
 * 响应式内边距
 */
export const PADDING = {
  // 小内边距 → 大内边距
  responsive: 'p-3 sm:p-4',
  // 固定小内边距
  small: 'p-3',
  // 固定大内边距
  large: 'p-4',
};

/**
 * 响应式文字大小
 */
export const TEXT = {
  // 小文字
  small: 'text-xs',
  // 中文字
  medium: 'text-sm',
  // 大文字
  large: 'text-base',
};

/**
 * 响应式容器
 */
export const CONTAINER = {
  // 最大宽度限制
  maxWidth: 'max-w-7xl mx-auto',
  // 响应式内边距
  padding: 'px-4 sm:px-6 lg:px-8',
};

// ============================================================
// 工具函数
// ============================================================

/**
 * 合并响应式类名
 * @param  {...string} classes - 类名
 * @returns {string} 合并后的类名
 */
export function mergeResponsiveClasses(...classes) {
  return classes.filter(Boolean).join(' ');
}

/**
 * 获取响应式网格类名
 * @param {number} cols - 列数配置 { sm, md, lg }
 * @returns {string} 网格类名
 */
export function getResponsiveGrid(cols = {}) {
  const { sm = 1, md = 2, lg = 4 } = cols;
  return `grid grid-cols-${sm} sm:grid-cols-${md} lg:grid-cols-${lg}`;
}

/**
 * 获取响应式间距类名
 * @param {string} size - 间距大小 (small/medium/large)
 * @returns {string} 间距类名
 */
export function getResponsiveGap(size = 'medium') {
  const gaps = {
    small: 'gap-2',
    medium: 'gap-2 sm:gap-4',
    large: 'gap-4',
  };
  return gaps[size] || gaps.medium;
}

/**
 * 获取响应式内边距类名
 * @param {string} size - 内边距大小 (small/medium/large)
 * @returns {string} 内边距类名
 */
export function getResponsivePadding(size = 'medium') {
  const paddings = {
    small: 'p-3',
    medium: 'p-3 sm:p-4',
    large: 'p-4',
  };
  return paddings[size] || paddings.medium;
}

// ============================================================
// 响应式断点检测（客户端）
// ============================================================

/**
 * 检测当前断点
 * @returns {string} 当前断点 (sm/md/lg/xl/2xl)
 */
export function getCurrentBreakpoint() {
  if (typeof window === 'undefined') return 'lg';
  
  const width = window.innerWidth;
  if (width >= 1536) return '2xl';
  if (width >= 1280) return 'xl';
  if (width >= 1024) return 'lg';
  if (width >= 768) return 'md';
  if (width >= 640) return 'sm';
  return 'xs';
}

/**
 * 检测是否为移动端
 * @returns {boolean}
 */
export function isMobile() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
}

/**
 * 检测是否为平板端
 * @returns {boolean}
 */
export function isTablet() {
  if (typeof window === 'undefined') return false;
  const width = window.innerWidth;
  return width >= 768 && width < 1024;
}

/**
 * 检测是否为桌面端
 * @returns {boolean}
 */
export function isDesktop() {
  if (typeof window === 'undefined') return true;
  return window.innerWidth >= 1024;
}

export default {
  BREAKPOINTS,
  DISPLAY,
  GRID,
  GAP,
  PADDING,
  TEXT,
  CONTAINER,
  mergeResponsiveClasses,
  getResponsiveGrid,
  getResponsiveGap,
  getResponsivePadding,
  getCurrentBreakpoint,
  isMobile,
  isTablet,
  isDesktop,
};

// ============================================================
// 安全区适配
// ============================================================

/**
 * 安全区类名
 */
export const SAFE_AREA = {
  // 底部安全区内边距
  paddingBottom: 'safe-area-pb',
  // 底部安全区外边距
  marginBottom: 'safe-area-mb',
  // 顶部安全区内边距
  paddingTop: 'safe-area-pt',
  // 顶部安全区外边距
  marginTop: 'safe-area-mt',
};

/**
 * 获取安全区内边距样式
 * @param {string} direction - 方向 (top/right/bottom/left)
 * @returns {Object} 样式对象
 */
export function getSafeAreaStyle(direction = 'bottom') {
  const property = `padding${direction.charAt(0).toUpperCase() + direction.slice(1)}`;
  return {
    [property]: `env(safe-area-inset-${direction}, 0px)`,
  };
}

/**
 * 获取安全区内边距类名
 * @param {string} direction - 方向 (top/right/bottom/left)
 * @returns {string} 类名
 */
export function getSafeAreaClass(direction = 'bottom') {
  const prefix = direction === 'bottom' ? 'pb' : direction === 'top' ? 'pt' : direction === 'left' ? 'pl' : 'pr';
  return `safe-area-${prefix}`;
}

/**
 * 检测是否支持安全区
 * @returns {boolean}
 */
export function supportsSafeArea() {
  if (typeof window === 'undefined') return false;
  return CSS.supports('padding-bottom', 'env(safe-area-inset-bottom)');
}

export default {
  BREAKPOINTS,
  DISPLAY,
  GRID,
  GAP,
  PADDING,
  TEXT,
  CONTAINER,
  SAFE_AREA,
  mergeResponsiveClasses,
  getResponsiveGrid,
  getResponsiveGap,
  getResponsivePadding,
  getCurrentBreakpoint,
  isMobile,
  isTablet,
  isDesktop,
  getSafeAreaStyle,
  getSafeAreaClass,
  supportsSafeArea,
};
