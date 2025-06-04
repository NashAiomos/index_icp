import React, { useState, useEffect } from 'react';

interface BackToTopButtonProps {
  threshold?: number; // 显示按钮的滚动阈值，默认400px
  className?: string; // 自定义样式类名
  isDark?: boolean; // 深色主题支持
}

const BackToTopButton: React.FC<BackToTopButtonProps> = ({ 
  threshold = 400, 
  className = '',
  isDark = false
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // 监听滚动事件
  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > threshold) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);

    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, [threshold]);

  // 返回顶部函数
  const scrollToTop = () => {
    setIsAnimating(true);
    
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });

    // 动画结束后重置状态
    setTimeout(() => {
      setIsAnimating(false);
    }, 600);
  };

  return (
    <div 
      className={`fixed bottom-6 right-4 z-50 ${className}`}
    >
      <button
        onClick={scrollToTop}
        className={`
          relative w-14 h-14 rounded-full shadow-lg hover:shadow-xl
          transition-all duration-300 ease-in-out
          transform hover:scale-110 active:scale-95
          ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0'}
          ${isAnimating ? 'animate-pulse' : ''}
          group overflow-hidden
          ${isDark 
            ? 'bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-500 hover:to-purple-600' 
            : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500'
          }
          text-white
        `}
        aria-label="返回顶部"
        style={{
          transform: `${isVisible ? 'translateY(0)' : 'translateY(64px)'} ${isAnimating ? 'scale(1.05)' : 'scale(1)'}`,
          opacity: isVisible ? 1 : 0,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* 背景光晕效果 */}
        <div className={`
          absolute inset-0 rounded-full opacity-0 group-hover:opacity-75 
          transition-opacity duration-300 blur-sm scale-110
          ${isDark 
            ? 'bg-gradient-to-r from-indigo-400 to-purple-500' 
            : 'bg-gradient-to-r from-blue-400 to-purple-500'
          }
        `}></div>
        
        {/* 内容容器 */}
        <div className="relative flex items-center justify-center w-full h-full">
          {/* 箭头图标 */}
          <svg
            className={`w-7 h-7 transition-transform duration-300 ${
              isAnimating 
                ? 'animate-bounce' 
                : 'group-hover:-translate-y-1 group-hover:scale-110'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
        </div>

        {/* 点击波纹效果 */}
        <div className="absolute inset-0 rounded-full opacity-0 group-active:opacity-100 bg-white bg-opacity-20 transition-opacity duration-150"></div>
        
        {/* 旋转的装饰圆环 */}
        <div className={`
          absolute inset-0 rounded-full border-2 border-dashed opacity-0 
          group-hover:opacity-30 transition-all duration-500
          ${isDark ? 'border-white' : 'border-white'}
          ${isAnimating ? 'animate-spin' : 'group-hover:rotate-45'}
        `}></div>
      </button>
    </div>
  );
};

export default BackToTopButton; 