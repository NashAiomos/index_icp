import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import TokenCard from '../components/TokenCard';
import TransactionTable from '../components/TransactionTable';
import BackToTopButton from '../components/BackToTopButton';
import { ApiService } from '../services/api';
import { Transaction } from '../types';
import { useTheme } from '../hooks/useTheme';
import { useAutoRefreshTransactions } from '../hooks/useAutoRefreshTransactions';
import { useGlobalCache } from '../contexts/GlobalCacheContext';

// 扩展 Transaction 类型，添加代币信息
interface TransactionWithToken extends Transaction {
  tokenSymbol: string;
}

const HomePage: React.FC = () => {
  const { data: cacheData, isLoading: cacheLoading } = useGlobalCache();
  const [error, setError] = useState<string | null>(null);
  const isDark = useTheme();

  // 每个代币获取的交易数量（用于合并排序）
  const TRANSACTIONS_PER_TOKEN = 100;
  // 最终显示的交易数量
  const DISPLAY_TRANSACTIONS = 100;

  // 获取并合并 VUSD 和 LIKE 的交易
  const fetchAndMergeTransactions = useCallback(async (): Promise<TransactionWithToken[]> => {
    try {
      // 并行获取 VUSD 和 LIKE 各100条交易
      const [vusdTxs, likeTxs] = await Promise.all([
        ApiService.getLatestTransactions(TRANSACTIONS_PER_TOKEN, 'VUSD'),
        ApiService.getLatestTransactions(TRANSACTIONS_PER_TOKEN, 'LIKE')
      ]);

      // 为交易添加代币标识
      const vusdTransactions: TransactionWithToken[] = vusdTxs.map(tx => ({
        ...tx,
        tokenSymbol: 'VUSD'
      }));
      
      const likeTransactions: TransactionWithToken[] = likeTxs.map(tx => ({
        ...tx,
        tokenSymbol: 'LIKE'
      }));

      // 合并交易并按时间戳降序排序（最新的在前）
      const mergedTransactions = [...vusdTransactions, ...likeTransactions]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, DISPLAY_TRANSACTIONS); // 只取前100条最新的

      return mergedTransactions;
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
      throw err;
    }
  }, []);

  // 使用自动刷新 hook
  const { 
    transactions, 
    setTransactions, 
    setHeaderRef, 
    clearNewFlags 
  } = useAutoRefreshTransactions({
    fetchFunction: async () => {
      // 获取各100条交易，合并排序后只返回最新的100条
      const [vusdTxs, likeTxs] = await Promise.all([
        ApiService.getLatestTransactions(TRANSACTIONS_PER_TOKEN, 'VUSD'),
        ApiService.getLatestTransactions(TRANSACTIONS_PER_TOKEN, 'LIKE')
      ]);

      // 为交易添加代币标识
      const vusdTransactions = vusdTxs.map(tx => ({
        ...tx,
        _tokenSymbol: 'VUSD'
      }));
      
      const likeTransactions = likeTxs.map(tx => ({
        ...tx,
        _tokenSymbol: 'LIKE'
      }));

      // 合并交易并按时间戳降序排序，只取前100条
      const mergedTransactions = [...vusdTransactions, ...likeTransactions]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, DISPLAY_TRANSACTIONS);

      return mergedTransactions;
    },
    interval: 20000, // 20秒
    enabled: true
  });

  // 根据主题设置 body 的 class
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // 初始加载交易
  useEffect(() => {
    const fetchInitialTransactions = async () => {
      try {
        const initialTxs = await fetchAndMergeTransactions();
        setTransactions(initialTxs);
      } catch (err) {
        console.error('Failed to fetch transactions:', err);
        setError('Failed to load transactions');
      }
    };

    fetchInitialTransactions();
  }, [fetchAndMergeTransactions, setTransactions]);

  // 清除新交易标记（当用户滚动或点击时）
  useEffect(() => {
    const handleInteraction = () => {
      clearNewFlags();
    };

    window.addEventListener('scroll', handleInteraction);
    window.addEventListener('click', handleInteraction);

    return () => {
      window.removeEventListener('scroll', handleInteraction);
      window.removeEventListener('click', handleInteraction);
    };
  }, [clearNewFlags]);

  // 创建代币映射表
  const tokenMap: { [key: string]: { symbol: string; decimals: number } } = {};
  cacheData.tokens.forEach(token => {
    tokenMap[token.symbol] = { symbol: token.symbol, decimals: token.decimals };
  });

  // 将 TransactionWithToken[] 转换为 Transaction[]
  const transactionsForTable = transactions.map(tx => {
    return tx as Transaction & { _tokenSymbol: string };
  });

  // 从全局缓存获取代币统计数据
  const likeStats = cacheData.tokenStats.LIKE;
  const vusdStats = cacheData.tokenStats.VUSD;

  return (
    <div className={`min-h-screen ${isDark ? 'bg-dark-bg' : 'bg-gray-50'}`}>
      <Header isDark={isDark} />
      
      <main className="container mx-auto" style={{ padding: '1rem 3rem' }}>
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Token Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* LIKE Token Card */}
          {likeStats && (
            <TokenCard
              symbol="LIKE"
              name={likeStats.name}
              totalTransactionCount={likeStats.totalTransactionCount}
              totalSupply={likeStats.totalSupply}
              totalAddresses={likeStats.totalAddresses}
              color="blue"
              isDark={isDark}
              token={cacheData.tokens.find(t => t.symbol === 'LIKE')}
            />
          )}
          
          {/* vUSD Token Card */}
          {vusdStats && (
            <TokenCard
              symbol="vUSD"
              name={vusdStats.name}
              totalTransactionCount={vusdStats.totalTransactionCount}
              totalSupply={vusdStats.totalSupply}
              totalAddresses={vusdStats.totalAddresses}
              color="purple"
              isDark={isDark}
              token={cacheData.tokens.find(t => t.symbol === 'VUSD')}
            />
          )}
        </div>

        {/* Loading state for cards */}
        {cacheLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {[1, 2].map(i => (
              <div key={i} className={`${
                isDark 
                  ? 'bg-dark-card border-dark-border' 
                  : 'bg-white border-gray-200 shadow-sm'
              } border rounded-lg p-6 animate-pulse`}>
                <div className="h-12 w-12 bg-gray-300 rounded mb-4"></div>
                <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-300 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        )}

        {/* Transactions Table */}
        {transactions.length === 0 && !cacheLoading ? (
          <div className={`${
            isDark 
              ? 'bg-dark-card border-dark-border' 
              : 'bg-white border-gray-200 shadow-sm'
          } border rounded-lg p-8 text-center`}>
            <div className={isDark ? 'text-gray-400' : 'text-gray-500'}>Loading transactions...</div>
          </div>
        ) : (
          <TransactionTable 
            transactions={transactionsForTable} 
            tokens={tokenMap} 
            isDark={isDark}
            headerRef={setHeaderRef}
          />
        )}
      </main>

      {/* 返回顶部按钮 */}
      <BackToTopButton threshold={300} isDark={isDark} />
    </div>
  );
};

export default HomePage; 