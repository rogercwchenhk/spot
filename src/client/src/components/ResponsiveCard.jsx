/**
 * 响应式卡片组件
 * 统一移动端卡片样式和布局
 */

import { cn } from '../lib/utils';

/**
 * 响应式卡片组件
 * @param {Object} props
 * @param {string} props.title - 卡片标题
 * @param {React.ReactNode} props.children - 卡片内容
 * @param {React.ReactNode} props.actions - 操作按钮
 * @param {string} props.className - 自定义类名
 * @param {boolean} props.compact - 紧凑模式
 */
export function ResponsiveCard({ title, children, actions, className, compact = false }) {
  return (
    <div className={cn(
      'bg-white rounded-xl border border-slate-200/80',
      compact ? 'p-3' : 'p-4',
      className
    )}>
      {title && (
        <h3 className={cn(
          'font-medium text-slate-800',
          compact ? 'text-xs' : 'text-sm'
        )}>
          {title}
        </h3>
      )}
      
      <div className={cn(
        'grid grid-cols-2 gap-2',
        compact ? 'mt-2 text-xs' : 'mt-3 text-xs'
      )}>
        {children}
      </div>
      
      {actions && (
        <div className={cn(
          'flex items-center justify-end gap-2 border-t border-slate-100',
          compact ? 'mt-2 pt-2' : 'mt-3 pt-3'
        )}>
          {actions}
        </div>
      )}
    </div>
  );
}

/**
 * 卡片字段组件
 * @param {Object} props
 * @param {string} props.label - 字段标签
 * @param {React.ReactNode} props.value - 字段值
 * @param {string} props.className - 自定义类名
 */
export function CardField({ label, value, className }) {
  return (
    <div className={className}>
      <span className="text-slate-500">{label}:</span>{' '}
      <span className="text-slate-700">{value || '-'}</span>
    </div>
  );
}

/**
 * 卡片操作按钮组件
 * @param {Object} props
 * @param {React.ReactNode} props.icon - 图标
 * @param {string} props.label - 按钮标签
 * @param {Function} props.onClick - 点击事件
 * @param {string} props.variant - 按钮变体 (default/primary/danger)
 * @param {string} props.className - 自定义类名
 */
export function CardAction({ icon, label, onClick, variant = 'default', className }) {
  const variantStyles = {
    default: 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50',
    primary: 'text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50',
    danger: 'text-slate-500 hover:text-rose-500 hover:bg-rose-50',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors',
        variantStyles[variant],
        className
      )}
    >
      {icon}
      {label}
    </button>
  );
}

/**
 * 响应式表格容器
 * @param {Object} props
 * @param {React.ReactNode} props.children - 表格内容
 * @param {string} props.className - 自定义类名
 */
export function ResponsiveTableContainer({ children, className }) {
  return (
    <div className={cn(
      'hidden md:block bg-white rounded-xl border border-slate-200/80 overflow-hidden',
      className
    )}>
      {children}
    </div>
  );
}

/**
 * 响应式卡片列表容器
 * @param {Object} props
 * @param {React.ReactNode} props.children - 卡片内容
 * @param {string} props.className - 自定义类名
 */
export function ResponsiveCardList({ children, className }) {
  return (
    <div className={cn(
      'md:hidden space-y-3',
      className
    )}>
      {children}
    </div>
  );
}

export default ResponsiveCard;
