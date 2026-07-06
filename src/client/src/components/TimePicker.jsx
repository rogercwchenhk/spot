/**
 * 时间选择器组件
 * 支持多时间点编辑，统一按钮状态管理
 */

import { useState, useEffect } from 'react';
import { Pencil, Save, X, Trash2, Plus } from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * 时间选择器组件
 * @param {Object} props
 * @param {string} props.title - 标题
 * @param {string} props.description - 描述
 * @param {string[]} props.times - 时间列表
 * @param {Function} props.onTimesChange - 时间列表变更回调
 * @param {Function} props.onSave - 保存回调
 * @param {boolean} props.disabled - 是否禁用
 * @param {string} props.className - 自定义类名
 */
export function TimePicker({
  title,
  description,
  times = [],
  onTimesChange,
  onSave,
  disabled = false,
  className,
}) {
  const [editing, setEditing] = useState(false);
  const [localTimes, setLocalTimes] = useState(times);
  const [saving, setSaving] = useState(false);

  // 同步外部 times 变化
  useEffect(() => {
    setLocalTimes(times);
  }, [times]);

  // 进入编辑模式
  const handleEdit = () => {
    setLocalTimes(times);
    setEditing(true);
  };

  // 取消编辑
  const handleCancel = () => {
    setLocalTimes(times);
    setEditing(false);
  };

  // 保存
  const handleSave = async () => {
    if (onSave) {
      setSaving(true);
      try {
        await onSave(localTimes);
        setEditing(false);
      } catch (error) {
        console.error('保存失败:', error);
      } finally {
        setSaving(false);
      }
    }
  };

  // 添加时间
  const handleAddTime = () => {
    const newTimes = [...localTimes, '12:00'];
    setLocalTimes(newTimes);
    if (onTimesChange) {
      onTimesChange(newTimes);
    }
  };

  // 删除时间
  const handleRemoveTime = (index) => {
    const newTimes = localTimes.filter((_, i) => i !== index);
    setLocalTimes(newTimes);
    if (onTimesChange) {
      onTimesChange(newTimes);
    }
  };

  // 更新时间
  const handleTimeChange = (index, value) => {
    const newTimes = [...localTimes];
    newTimes[index] = value;
    setLocalTimes(newTimes);
    if (onTimesChange) {
      onTimesChange(newTimes);
    }
  };

  return (
    <div className={cn(
      'bg-white rounded-xl border border-slate-200/80 p-5',
      className
    )}>
      {/* 头部：标题 + 编辑按钮 */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {!editing && (
          <button
            onClick={handleEdit}
            disabled={disabled}
            className="inline-flex items-center gap-1 text-xs border border-slate-200/80 text-slate-600 px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Pencil size={12} /> 编辑
          </button>
        )}
      </div>

      {/* 描述 */}
      {description && (
        <p className="text-xs text-slate-400 mb-3">{description}</p>
      )}

      {/* 内容区域 */}
      {editing ? (
        <>
          {/* 时间输入框 */}
          <div className="flex flex-wrap gap-2 mb-3">
            {localTimes.map((t, i) => (
              <div
                key={i}
                className="inline-flex items-center gap-1 bg-indigo-50 border border-yellow-300 rounded-lg px-2 py-1"
              >
                <input
                  type="time"
                  value={t}
                  onChange={(e) => handleTimeChange(i, e.target.value)}
                  className="text-sm border-none bg-transparent focus:outline-none"
                />
                <button
                  onClick={() => handleRemoveTime(i)}
                  className="text-slate-400 hover:text-red-500"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            <button
              onClick={handleAddTime}
              className="inline-flex items-center gap-1 text-xs text-slate-600 border border-dashed border-slate-200 px-2 py-1 rounded hover:bg-slate-50"
            >
              <Plus size={12} /> 添加
            </button>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2 pt-3 border-t border-slate-100">
            <button
              onClick={handleSave}
              disabled={saving || disabled}
              className="inline-flex items-center gap-1 text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={14} /> {saving ? '保存中...' : '保存'}
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X size={14} /> 取消
            </button>
          </div>
        </>
      ) : (
        /* 显示模式 */
        <div className="flex flex-wrap gap-2">
          {times.length > 0 ? (
            times.map((t, i) => (
              <span
                key={i}
                className="inline-flex items-center bg-slate-100 text-slate-700 text-sm px-3 py-1 rounded-full"
              >
                {t}
              </span>
            ))
          ) : (
            <span className="text-sm text-slate-400">未设置</span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 时间选择器预设配置
 */
export const TIME_PICKER_PRESETS = {
  fetch: {
    title: '采集时间',
    description: '每天在以下时间自动采集标讯数据',
  },
  push: {
    title: '推送时间',
    description: '每天在以下时间推送日报到企微群',
  },
};

export default TimePicker;
