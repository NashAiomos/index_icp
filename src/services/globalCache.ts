import { ApiService } from './api';
import { Token } from '../types';

export interface TokenStats {
  symbol: string;
  name: string;
  totalTransactionCount: string;
  totalSupply: string;
  totalAddresses: number;
  decimals: number;
}

export interface GlobalCacheData {
  tokens: Token[];
  tokenStats: {
    LIKE?: TokenStats;
    VUSD?: TokenStats;
  };
  lastUpdated: number;
}

class GlobalCache {
  private data: GlobalCacheData = {
    tokens: [],
    tokenStats: {},
    lastUpdated: 0
  };
  
  private listeners: Set<(data: GlobalCacheData) => void> = new Set();
  private updateInterval: NodeJS.Timer | null = null;
  private isInitialized = false;
  private updatePromise: Promise<void> | null = null;

  // 初始化缓存
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log('[GlobalCache] Initializing...');
    this.isInitialized = true;
    
    // 立即加载数据
    await this.refreshData();
    
    // 设置定时更新（每1分钟）
    this.updateInterval = setInterval(() => {
      this.refreshData();
    }, 60000);
    
    console.log('[GlobalCache] Initialized successfully');
  }

  // 刷新所有数据
  private async refreshData(): Promise<void> {
    // 如果正在更新，等待更新完成
    if (this.updatePromise) {
      return this.updatePromise;
    }

    this.updatePromise = this.doRefresh();
    
    try {
      await this.updatePromise;
    } finally {
      this.updatePromise = null;
    }
  }

  private async doRefresh(): Promise<void> {
    console.log('[GlobalCache] Refreshing data...');
    
    try {
      // 获取代币列表
      const tokens = await ApiService.getTokens();
      
      // 并行获取 LIKE 和 VUSD 的统计数据
      const [likeStats, vusdStats] = await Promise.all([
        this.fetchTokenStats('LIKE', tokens),
        this.fetchTokenStats('VUSD', tokens)
      ]);

      // 更新缓存数据
      this.data = {
        tokens,
        tokenStats: {
          ...(likeStats && { LIKE: likeStats }),
          ...(vusdStats && { VUSD: vusdStats })
        },
        lastUpdated: Date.now()
      };

      // 通知所有监听器
      this.notifyListeners();
      
      console.log('[GlobalCache] Data refreshed successfully');
    } catch (error) {
      console.error('[GlobalCache] Failed to refresh data:', error);
    }
  }

  // 获取单个代币的统计信息
  private async fetchTokenStats(symbol: string, tokens: Token[]): Promise<TokenStats | null> {
    try {
      const token = tokens.find(t => t.symbol === symbol);
      if (!token) return null;

      // 并行获取所有统计数据
      const [accountCount, txCount, totalSupply] = await Promise.all([
        ApiService.getAccountCount(symbol),
        ApiService.getTxCount(symbol),
        ApiService.getTotalSupply(symbol)
      ]);

      return {
        symbol,
        name: token.name,
        totalTransactionCount: txCount.toString(),
        totalSupply: totalSupply.replace(/_/g, ''),
        totalAddresses: accountCount,
        decimals: token.decimals
      };
    } catch (error) {
      console.error(`[GlobalCache] Failed to fetch stats for ${symbol}:`, error);
      return null;
    }
  }

  // 获取缓存数据
  getData(): GlobalCacheData {
    return { ...this.data };
  }

  // 获取特定代币的统计数据
  getTokenStats(symbol: string): TokenStats | null {
    const stats = this.data.tokenStats[symbol as keyof typeof this.data.tokenStats];
    return stats || null;
  }

  // 获取代币信息
  getToken(symbol: string): Token | null {
    return this.data.tokens.find(t => t.symbol === symbol) || null;
  }

  // 订阅数据更新
  subscribe(listener: (data: GlobalCacheData) => void): () => void {
    this.listeners.add(listener);
    
    // 立即通知当前数据
    if (this.data.lastUpdated > 0) {
      listener(this.getData());
    }
    
    // 返回取消订阅函数
    return () => {
      this.listeners.delete(listener);
    };
  }

  // 通知所有监听器
  private notifyListeners(): void {
    const data = this.getData();
    this.listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error('[GlobalCache] Listener error:', error);
      }
    });
  }

  // 强制刷新数据
  async forceRefresh(): Promise<void> {
    console.log('[GlobalCache] Force refresh requested');
    await this.refreshData();
  }

  // 清理资源
  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.listeners.clear();
    this.isInitialized = false;
    console.log('[GlobalCache] Destroyed');
  }
}

// 导出单例
export const globalCache = new GlobalCache(); 