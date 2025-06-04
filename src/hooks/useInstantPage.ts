import { useEffect } from 'react';

interface InstantPageConfig {
  // 预加载触发时机：'hover' | 'mousedown' | 'viewport'
  intensity?: 'mousedown' | 'hover' | 'viewport';
  // 鼠标悬停延迟时间（毫秒）
  delay?: number;
  // 是否允许外部链接预加载
  allowExternalLinks?: boolean;
  // 是否允许查询参数
  allowQueryString?: boolean;
  // 需要排除的选择器
  excludeSelectors?: string[];
}

export const useInstantPage = (config: InstantPageConfig = {}) => {
  useEffect(() => {
    // 检查是否已加载 instant.page
    if (typeof (window as any).instantpage === 'undefined') {
      console.warn('instant.page 尚未加载完成');
      return;
    }

    // 应用配置
    const instantPageConfig = {
      intensity: config.intensity || 'mousedown',
      delay: config.delay || 65,
      allowExternalLinks: config.allowExternalLinks || false,
      allowQueryString: config.allowQueryString || true,
      ...config
    };

    // 设置 instant.page 配置
    try {
      // 为链接添加 data-instant 属性来控制预加载行为
      document.querySelectorAll('a').forEach((link) => {
        const href = link.getAttribute('href');
        
        // 跳过空链接和锚点链接
        if (!href || href.startsWith('#') || href.startsWith('javascript:')) {
          link.setAttribute('data-no-instant', '');
          return;
        }

        // 处理外部链接
        if (href.startsWith('http') && !href.includes(window.location.hostname)) {
          if (!instantPageConfig.allowExternalLinks) {
            link.setAttribute('data-no-instant', '');
          }
          return;
        }

        // 检查是否需要排除
        if (instantPageConfig.excludeSelectors) {
          const shouldExclude = instantPageConfig.excludeSelectors.some(selector => 
            link.matches(selector)
          );
          if (shouldExclude) {
            link.setAttribute('data-no-instant', '');
          }
        }
      });

      console.log('instant.page 配置已应用:', instantPageConfig);
    } catch (error) {
      console.error('配置 instant.page 时出错:', error);
    }
  }, [config]);

  // 手动预加载指定URL
  const preloadUrl = (url: string) => {
    try {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      document.head.appendChild(link);
    } catch (error) {
      console.error('预加载URL失败:', error);
    }
  };

  return { preloadUrl };
};

export default useInstantPage; 