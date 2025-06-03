import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from '../components/Header';
import TokenCard from '../components/TokenCard';
import TransactionTable from '../components/TransactionTable';
import { ApiService } from '../services/api';
import { Token, Transaction } from '../types';
import { useTheme } from '../hooks/useTheme';

// 扩展 Transaction 类型，添加代币信息
interface TransactionWithToken extends Transaction {
  tokenSymbol: string;
}

const HomePage: React.FC = () => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [transactions, setTransactions] = useState<TransactionWithToken[]>([]);
  const [tokenStats, setTokenStats] = useState<{ [key: string]: any }>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const isDark = useTheme();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // 每次加载的交易数量
  const TRANSACTIONS_PER_LOAD = 50;

  // 根据主题设置 body 的 class
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // 获取代币列表
  useEffect(() => {
    const fetchTokens = async () => {
      try {
        const tokenList = await ApiService.getTokens();
        setTokens(tokenList);
        
        // 创建代币映射表
        const tokenMap: { [key: string]: { symbol: string; decimals: number } } = {};
        tokenList.forEach(token => {
          tokenMap[token.symbol] = { symbol: token.symbol, decimals: token.decimals };
        });
        
        // 获取每个代币的统计信息
        const stats: { [key: string]: any } = {};
        for (const token of tokenList) {
          try {
            const [accountCount, txCount] = await Promise.all([
              ApiService.getAccountCount(token.symbol),
              ApiService.getTxCount(token.symbol)
            ]);
            
            stats[token.symbol] = {
              name: token.name,
              totalTransactionCount: txCount.toString(),
              transactions24h: txCount, // 暂时使用总交易数
              totalAddresses: accountCount
            };
          } catch (err) {
            console.error(`Failed to fetch stats for ${token.symbol}:`, err);
          }
        }
        setTokenStats(stats);
      } catch (err) {
        console.error('Failed to fetch tokens:', err);
        setError('Failed to load token data');
      }
    };

    fetchTokens();
  }, []);

  // 获取并合并 VUSD 和 LIKE 的交易
  const fetchAndMergeTransactions = async (page: number = 0): Promise<TransactionWithToken[]> => {
    try {
      // 并行获取 VUSD 和 LIKE 的交易
      const [vusdTxs, likeTxs] = await Promise.all([
        ApiService.getLatestTransactions(TRANSACTIONS_PER_LOAD + page * TRANSACTIONS_PER_LOAD, 'VUSD'),
        ApiService.getLatestTransactions(TRANSACTIONS_PER_LOAD + page * TRANSACTIONS_PER_LOAD, 'LIKE')
      ]);

      // 为交易添加代币标识
      const vusdTransactions: TransactionWithToken[] = vusdTxs.slice(page * TRANSACTIONS_PER_LOAD).map(tx => ({
        ...tx,
        tokenSymbol: 'VUSD'
      }));
      
      const likeTransactions: TransactionWithToken[] = likeTxs.slice(page * TRANSACTIONS_PER_LOAD).map(tx => ({
        ...tx,
        tokenSymbol: 'LIKE'
      }));

      // 合并交易并按时间戳降序排序（最新的在前）
      const mergedTransactions = [...vusdTransactions, ...likeTransactions]
        .sort((a, b) => b.timestamp - a.timestamp);

      return mergedTransactions;
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
      throw err;
    }
  };

  // 初始加载交易
  useEffect(() => {
    const fetchInitialTransactions = async () => {
      try {
        setLoading(true);
        const initialTxs = await fetchAndMergeTransactions(0);
        setTransactions(initialTxs);
        setCurrentPage(1);
        // 如果获取的交易数量少于预期，说明没有更多数据了
        if (initialTxs.length < TRANSACTIONS_PER_LOAD * 2) {
          setHasMore(false);
        }
      } catch (err) {
        console.error('Failed to fetch transactions:', err);
        setError('Failed to load transactions');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialTransactions();
  }, []);

  // 加载更多交易
  const loadMoreTransactions = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    try {
      setLoadingMore(true);
      const moreTxs = await fetchAndMergeTransactions(currentPage);
      
      if (moreTxs.length === 0) {
        setHasMore(false);
      } else {
        // 过滤掉可能的重复交易
        const existingIndexes = new Set(transactions.map(tx => `${tx.index}-${tx.tokenSymbol}`));
        const newTxs = moreTxs.filter(tx => !existingIndexes.has(`${tx.index}-${tx.tokenSymbol}`));
        
        setTransactions(prev => [...prev, ...newTxs]);
        setCurrentPage(prev => prev + 1);
        
        // 如果新交易数量少于预期，说明快没有更多数据了
        if (newTxs.length < TRANSACTIONS_PER_LOAD * 2) {
          setHasMore(false);
        }
      }
    } catch (err) {
      console.error('Failed to load more transactions:', err);
      setError('Failed to load more transactions');
    } finally {
      setLoadingMore(false);
    }
  }, [currentPage, hasMore, loadingMore, transactions]);

  // 设置 Intersection Observer 监听滚动到底部
  useEffect(() => {
    const options = {
      root: null,
      rootMargin: '100px',
      threshold: 0.1
    };

    observerRef.current = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMore && !loadingMore) {
        loadMoreTransactions();
      }
    }, options);

    if (bottomRef.current) {
      observerRef.current.observe(bottomRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loadingMore, loadMoreTransactions]);

  const handleSearch = (query: string) => {
    // TODO: 实现搜索功能
    console.log('Search query:', query);
  };

  // 创建增强的代币映射表，包含代币符号
  const tokenMap: { [key: string]: { symbol: string; decimals: number } } = {};
  tokens.forEach(token => {
    tokenMap[token.symbol] = { symbol: token.symbol, decimals: token.decimals };
  });

  // 将 TransactionWithToken[] 转换为 Transaction[]，并通过 tokenMap 传递代币信息
  const transactionsForTable = transactions.map(tx => {
    const { tokenSymbol, ...transaction } = tx;
    // 在交易对象中添加一个额外的属性来标识代币类型
    return {
      ...transaction,
      _tokenSymbol: tokenSymbol
    } as Transaction & { _tokenSymbol: string };
  });

  return (
    <div className={`min-h-screen ${isDark ? 'bg-dark-bg' : 'bg-gray-50'}`}>
      <Header onSearch={handleSearch} isDark={isDark} />
      
      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Token Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* LIKE Token Card */}
          {tokenStats['LIKE'] && (
            <TokenCard
              symbol="LIKE"
              name={tokenStats['LIKE'].name}
              totalTransactionCount={tokenStats['LIKE'].totalTransactionCount}
              transactions24h={tokenStats['LIKE'].transactions24h}
              totalAddresses={tokenStats['LIKE'].totalAddresses}
              color="blue"
              isDark={isDark}
            />
          )}
          
          {/* vUSD Token Card */}
          {tokenStats['VUSD'] && (
            <TokenCard
              symbol="vUSD"
              name={tokenStats['VUSD'].name}
              totalTransactionCount={tokenStats['VUSD'].totalTransactionCount}
              transactions24h={tokenStats['VUSD'].transactions24h}
              totalAddresses={tokenStats['VUSD'].totalAddresses}
              color="purple"
              isDark={isDark}
            />
          )}
        </div>

        {/* Transactions Table */}
        {loading ? (
          <div className={`${
            isDark 
              ? 'bg-dark-card border-dark-border' 
              : 'bg-white border-gray-200 shadow-sm'
          } border rounded-lg p-8 text-center`}>
            <div className={isDark ? 'text-gray-400' : 'text-gray-500'}>Loading transactions...</div>
          </div>
        ) : (
          <>
            <TransactionTable transactions={transactionsForTable} tokens={tokenMap} isDark={isDark} />
            
            {/* 加载更多指示器 */}
            <div ref={bottomRef} className="mt-8 text-center">
              {loadingMore && (
                <div className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                  Loading more transactions...
                </div>
              )}
              {!hasMore && transactions.length > 0 && (
                <div className={isDark ? 'text-gray-500' : 'text-gray-400'}>
                  No more transactions to load
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default HomePage; 