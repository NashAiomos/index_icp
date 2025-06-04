import React, { forwardRef } from 'react';
import { Link, LinkProps } from 'react-router-dom';

interface PreloadLinkProps extends LinkProps {
  // 是否禁用预加载
  disablePreload?: boolean;
  // 自定义预加载强度
  preloadIntensity?: 'mousedown' | 'hover' | 'viewport';
  // 额外的类名
  className?: string;
  // 子元素
  children: React.ReactNode;
}

/**
 * 支持预加载的 React Router Link 组件
 * 自动与 instant.page 集成，提供丝滑的页面切换体验
 */
export const PreloadLink = forwardRef<HTMLAnchorElement, PreloadLinkProps>(
  ({ disablePreload = false, preloadIntensity, className = '', children, ...props }, ref) => {
    const linkProps: any = { ...props };

    // 如果禁用预加载，添加 data-no-instant 属性
    if (disablePreload) {
      linkProps['data-no-instant'] = '';
    }

    // 如果指定了预加载强度，添加对应的 data 属性
    if (preloadIntensity && !disablePreload) {
      linkProps['data-instant-intensity'] = preloadIntensity;
    }

    return (
      <Link
        ref={ref}
        className={`transition-colors duration-200 ${className}`}
        {...linkProps}
      >
        {children}
      </Link>
    );
  }
);

PreloadLink.displayName = 'PreloadLink';

export default PreloadLink; 