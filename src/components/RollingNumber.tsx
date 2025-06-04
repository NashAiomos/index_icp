import React, { useEffect, useState, useRef } from 'react';
import { formatNumber } from '../utils/format';

interface RollingNumberProps {
  value: string | number;
  className?: string;
  duration?: number; // 动画持续时间（毫秒）
  format?: boolean; // 是否格式化数字
}

const RollingNumber: React.FC<RollingNumberProps> = ({ 
  value, 
  className = '',
  duration = 800,
  format = true,
}) => {
  // 获取初始格式化的值
  const getFormattedValue = (val: string | number): string => {
    if (!format) return val.toString();
    
    // 移除可能的下划线并格式化
    const cleanValue = val.toString().replace(/_/g, '');
    return formatNumber(cleanValue);
  };

  const [displayValue, setDisplayValue] = useState(getFormattedValue(value));
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValueRef = useRef(value);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    // 如果值没有变化，不执行动画
    if (prevValueRef.current === value) return;

    // 转换为数字进行比较
    const prevNum = typeof prevValueRef.current === 'string' 
      ? parseFloat(prevValueRef.current.toString().replace(/[,_]/g, '')) 
      : prevValueRef.current;
    const nextNum = typeof value === 'string' 
      ? parseFloat(value.toString().replace(/[,_]/g, '')) 
      : value;

    // 如果无法转换为数字，直接更新
    if (isNaN(prevNum) || isNaN(nextNum)) {
      setDisplayValue(getFormattedValue(value));
      prevValueRef.current = value;
      return;
    }

    // 启动动画
    setIsAnimating(true);
    const startTime = Date.now();
    const diff = nextNum - prevNum;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // 使用缓动函数
      const easedProgress = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      const currentValue = prevNum + (diff * easedProgress);

      // 根据原始值的格式决定小数位数
      const decimalPlaces = value.toString().includes('.') 
        ? value.toString().split('.')[1]?.length || 0 
        : 0;
      
      const formattedValue = format 
        ? formatNumber(currentValue.toFixed(decimalPlaces))
        : currentValue.toFixed(decimalPlaces);
      
      setDisplayValue(formattedValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
        setDisplayValue(getFormattedValue(value));
        prevValueRef.current = value;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration, format]);

  return (
    <span className={`inline-block transition-all ${isAnimating ? 'scale-105' : ''} ${className}`}>
      {displayValue}
    </span>
  );
};

export default RollingNumber; 