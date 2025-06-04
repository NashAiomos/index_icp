import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { globalCache, GlobalCacheData, TokenStats } from '../services/globalCache';
import { Token } from '../types';

interface GlobalCacheContextType {
  data: GlobalCacheData;
  isLoading: boolean;
  getTokenStats: (symbol: string) => TokenStats | null;
  getToken: (symbol: string) => Token | null;
  forceRefresh: () => Promise<void>;
}

const GlobalCacheContext = createContext<GlobalCacheContextType | null>(null);

interface GlobalCacheProviderProps {
  children: ReactNode;
}

export const GlobalCacheProvider: React.FC<GlobalCacheProviderProps> = ({ children }) => {
  const [data, setData] = useState<GlobalCacheData>({
    tokens: [],
    tokenStats: {},
    lastUpdated: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 初始化全局缓存
    const initCache = async () => {
      setIsLoading(true);
      try {
        await globalCache.initialize();
      } catch (error) {
        console.error('Failed to initialize global cache:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initCache();

    // 订阅缓存更新
    const unsubscribe = globalCache.subscribe((newData) => {
      console.log('[GlobalCacheContext] Cache updated');
      setData(newData);
    });

    // 清理
    return () => {
      unsubscribe();
    };
  }, []);

  // 获取特定代币的统计数据
  const getTokenStats = (symbol: string): TokenStats | null => {
    return globalCache.getTokenStats(symbol);
  };

  // 获取代币信息
  const getToken = (symbol: string): Token | null => {
    return globalCache.getToken(symbol);
  };

  // 强制刷新
  const forceRefresh = async () => {
    await globalCache.forceRefresh();
  };

  const contextValue: GlobalCacheContextType = {
    data,
    isLoading,
    getTokenStats,
    getToken,
    forceRefresh
  };

  return (
    <GlobalCacheContext.Provider value={contextValue}>
      {children}
    </GlobalCacheContext.Provider>
  );
};

// 自定义 Hook 来使用全局缓存
export const useGlobalCache = () => {
  const context = useContext(GlobalCacheContext);
  if (!context) {
    throw new Error('useGlobalCache must be used within a GlobalCacheProvider');
  }
  return context;
}; 