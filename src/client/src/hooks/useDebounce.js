/**
 * useDebounce Hook
 * 封装 debounce 逻辑，自动清理 unmount
 */

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useDebounce Hook
 * @param {any} value - 要 debounce 的值
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {any} debounce 后的值
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * useDebouncedCallback Hook
 * debounce 回调函数
 * @param {Function} callback - 回调函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} debounce 后的回调函数
 */
export function useDebouncedCallback(callback, delay = 300) {
  const callbackRef = useRef(callback);
  const timerRef = useRef(null);

  // 更新 callback ref
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // 清理 timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const debouncedCallback = useCallback((...args) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  }, [delay]);

  // 取消 debounce
  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // 立即执行
  const flush = useCallback((...args) => {
    cancel();
    callbackRef.current(...args);
  }, [cancel]);

  return { debouncedCallback, cancel, flush };
}

/**
 * useDebouncedState Hook
 * 带 debounce 的状态管理
 * @param {any} initialValue - 初始值
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {[any, Function, any]} [value, setValue, debouncedValue]
 */
export function useDebouncedState(initialValue, delay = 300) {
  const [value, setValue] = useState(initialValue);
  const debouncedValue = useDebounce(value, delay);

  return [value, setValue, debouncedValue];
}

export default useDebounce;
