/**
 * 响应式表格组件
 * 桌面端显示表格，移动端显示卡片
 */
import { cn } from '../lib/utils';

export function ResponsiveTable({ columns, data, isAdmin, onEdit, onDelete, renderActions }) {
  return (
    <>
      {/* 桌面端：表格视图 */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200/80 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              {columns.map((col, i) => (
                <th key={i} className={cn(
                  'px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider',
                  col.align === 'right' ? 'text-right' : 'text-left'
                )}>
                  {col.label}
                </th>
              ))}
              {isAdmin && <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">操作</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((item, i) => (
              <tr key={item.id || i} className="hover:bg-slate-50/50 transition-colors">
                {columns.map((col, j) => (
                  <td key={j} className={cn(
                    'px-4 py-3',
                    col.className || 'text-slate-600'
                  )}>
                    {col.render ? col.render(item) : item[col.key] || '-'}
                  </td>
                ))}
                {isAdmin && (
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {renderActions ? renderActions(item) : (
                      <>
                        {onEdit && (
                          <button onClick={() => onEdit(item)}
                            className="text-slate-400 hover:text-indigo-600 mr-2 transition-colors" title="编辑">
                            <Pencil size={14} />
                          </button>
                        )}
                        {onDelete && (
                          <button onClick={() => onDelete(item)}
                            className="text-slate-400 hover:text-rose-500 transition-colors" title="删除">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 移动端：卡片视图 */}
      <div className="md:hidden space-y-3">
        {data.map((item, i) => (
          <div key={item.id || i} className="bg-white rounded-xl border border-slate-200/80 p-4">
            {renderCard ? renderCard(item) : (
              <div className="space-y-2">
                {columns.slice(0, 3).map((col, j) => (
                  <div key={j} className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">{col.label}</span>
                    <span className={cn('font-medium', col.className || 'text-slate-800')}>
                      {col.render ? col.render(item) : item[col.key] || '-'}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {isAdmin && (
              <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-slate-100">
                {renderActions ? renderActions(item) : (
                  <>
                    {onEdit && (
                      <button onClick={() => onEdit(item)}
                        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 px-2 py-1 rounded hover:bg-indigo-50 transition-colors">
                        <Pencil size={12} /> 编辑
                      </button>
                    )}
                    {onDelete && (
                      <button onClick={() => onDelete(item)}
                        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-rose-500 px-2 py-1 rounded hover:bg-rose-50 transition-colors">
                        <Trash2 size={12} /> 删除
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
