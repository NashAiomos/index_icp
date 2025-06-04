/**
 * Token详情页组件
 * 
 * 数据加载逻辑：
 * 1. 从全局缓存获取代币数据，立即显示
 * 2. 全局缓存在后台每隔1分钟自动刷新一次
 * 3. 交易列表每30秒自动刷新一次
 * 
 * 优化特性：
 * - 使用全局缓存确保数据一致性
 * - 页面切换时无需重新加载数据
 * - 后台静默更新，不显示更新状态干扰用户
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import TransactionTable from '../components/TransactionTable';
import BackToTopButton from '../components/BackToTopButton';
import RollingNumber from '../components/RollingNumber';
import { ApiService } from '../services/api';
import { Transaction } from '../types';
import { useTheme } from '../hooks/useTheme';
import { useAutoRefreshTransactions } from '../hooks/useAutoRefreshTransactions';
import { useGlobalCache } from '../contexts/GlobalCacheContext';
import { FiSearch } from 'react-icons/fi';

const TokenDetail: React.FC = () => {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const isDark = useTheme();
  const { getTokenStats, getToken, data: cacheData } = useGlobalCache();
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // 处理symbol映射：vUSD -> VUSD
  const apiSymbol = symbol === 'vUSD' ? 'VUSD' : symbol || '';

  // 从全局缓存获取数据
  const tokenStats = getTokenStats(apiSymbol);
  const token = getToken(apiSymbol);

  // 获取交易的函数
  const fetchTokenTransactions = useCallback(async () => {
    if (!apiSymbol) return [];
    
    try {
      const latestTxs = await ApiService.getLatestTransactions(50, apiSymbol);
      // 添加 _tokenSymbol 属性
      return latestTxs.map(tx => ({
        ...tx,
        _tokenSymbol: apiSymbol
      }));
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
      // 记录错误但不抛出，避免整个组件崩溃
      setError(`获取交易记录失败: ${err instanceof Error ? err.message : '未知错误'}`);
      return [];
    }
  }, [apiSymbol]);

  // 使用自动刷新 hook
  const { 
    transactions, 
    setTransactions, 
    setHeaderRef,
    clearNewFlags
  } = useAutoRefreshTransactions({
    fetchFunction: fetchTokenTransactions,
    interval: 30000, // 30秒
    enabled: true
  });

  // 添加交易加载状态
  const [transactionsLoading, setTransactionsLoading] = useState(true);

  // 监听交易数据的初始加载
  useEffect(() => {
    const loadInitialTransactions = async () => {
      setTransactionsLoading(true);
      try {
        const txs = await fetchTokenTransactions();
        setTransactions(txs);
      } finally {
        setTransactionsLoading(false);
      }
    };
    
    // 立即加载交易数据
    loadInitialTransactions();
  }, [apiSymbol, fetchTokenTransactions, setTransactions]);

  // 根据主题设置 body 的 class
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

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

  // 处理点击logo的逻辑
  const handleLogoClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    navigate('/');
  }, [navigate]);

  const handleSearch = (query: string) => {
    // TODO: 实现搜索功能
    console.log('Search query:', query);
  };

  // 根据symbol获取对应的logo路径
  const getLogoPath = (symbol: string) => {
    if (symbol === 'LIKE') {
      return '/logo_like.svg';
    } else if (symbol === 'vUSD' || symbol === 'VUSD') {
      return '/logo_vusd.svg';
    }
    return '/logo.svg'; // 默认logo
  };

  if (!symbol) {
    return <div>Invalid token</div>;
  }

  // 创建代币映射表
  const tokenMap: { [key: string]: { symbol: string; decimals: number } } = {};
  cacheData.tokens.forEach(t => {
    tokenMap[t.symbol] = { symbol: t.symbol, decimals: t.decimals };
  });

  return (
    <div className={`min-h-screen ${isDark ? 'bg-dark-bg' : 'bg-gray-50'}`}>
      <header className={`${isDark ? 'bg-dark-bg border-dark-border' : 'border-gray-200'}`}>
        <div className="container mx-auto" style={{ padding: '0 3rem' }}>
          <div className="flex items-center justify-between">
            {/* Logo with data passing */}
            <div className="flex items-center">
              <div 
                onClick={handleLogoClick}
                className="cursor-pointer no-preload"
              >
                <img 
                  src="/logo.svg" 
                  alt="Vly Explorer" 
                  style={{ height: '5rem' }} 
                  className="w-auto hover:opacity-70 transition-opacity" 
                />
              </div>
            </div>

            {/* Search Bar */}
            <form onSubmit={(e) => { e.preventDefault(); handleSearch(searchQuery); }} className="max-w-xl w-full md:w-96">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search"
                  className={`w-full ${isDark
                      ? 'bg-dark-card border-dark-border text-white placeholder-gray-500'
                      : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                    } border rounded-lg py-2.5 px-4 pl-10 focus:outline-none focus:border-primary-blue transition-colors`}
                />
                <FiSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDark ? 'text-gray-500' : 'text-gray-400'
                  } text-lg`} />
              </div>
            </form>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto" style={{ padding: '1rem 3rem' }}>
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {token && tokenStats ? (
          <>
            {/* Token Info Card */}
            <div className={`${
              isDark 
                ? 'bg-dark-card border-dark-border' 
                : 'bg-white border-gray-200 shadow-sm'
            } border rounded-lg p-6 mb-8`}>
              <div className="flex items-center mb-6">
                <div className="w-16 h-16 flex items-center justify-center">
                  <img 
                    src={getLogoPath(symbol)} 
                    alt={`${symbol} Logo`} 
                    className="w-16 h-16 object-contain"
                  />
                </div>
                <div className="ml-4">
                  <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {symbol}
                  </h1>
                  <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {token.name}
                  </p>
                </div>
              </div>

              {/* Token Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <div>
                  <div className="flex items-center mb-2">
                    <div className={`w-8 h-8 ${
                      isDark ? 'bg-gray-700' : 'bg-gray-100'
                    } rounded-lg flex items-center justify-center`}>
                      <svg className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <span className={`ml-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Total Transactions
                    </span>
                  </div>
                  <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    <RollingNumber value={tokenStats.totalTransactionCount} />
                  </p>
                </div>

                <div>
                  <div className="flex items-center mb-2">
                    <div className={`w-8 h-8 ${
                      isDark ? 'bg-gray-700' : 'bg-gray-100'
                    } rounded-lg flex items-center justify-center`}>
                      <svg className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <span className={`ml-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Total Supply
                    </span>
                  </div>
                  <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    <RollingNumber value={tokenStats.totalSupply} />
                  </p>
                </div>

                <div>
                  <div className="flex items-center mb-2">
                    <div className={`w-8 h-8 ${
                      isDark ? 'bg-gray-700' : 'bg-gray-100'
                    } rounded-lg flex items-center justify-center`}>
                      <svg className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <span className={`ml-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Holding Accounts
                    </span>
                  </div>
                  <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    <RollingNumber value={tokenStats.totalAddresses.toString()} />
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className={`${
            isDark 
              ? 'bg-dark-card border-dark-border' 
              : 'bg-white border-gray-200 shadow-sm'
          } border rounded-lg p-8 text-center`}>
            <div className={isDark ? 'text-gray-400' : 'text-gray-500'}>Loading token details...</div>
          </div>
        )}

        {/* 交易列表独立显示 */}
        {transactionsLoading ? (
          <div className={`${
            isDark 
              ? 'bg-dark-card border-dark-border' 
              : 'bg-white border-gray-200 shadow-sm'
          } border rounded-lg p-8 text-center`}>
            <div className={isDark ? 'text-gray-400' : 'text-gray-500'}>
            Loading transactions...
            </div>
          </div>
        ) : transactions.length === 0 ? (
          <div className={`${
            isDark 
              ? 'bg-dark-card border-dark-border' 
              : 'bg-white border-gray-200 shadow-sm'
          } border rounded-lg p-8 text-center`}>
            <div className={isDark ? 'text-gray-400' : 'text-gray-500'}>
            No transactions found
            </div>
            {error && (
              <div className="mt-4 text-sm text-red-500">
                {error}
              </div>
            )}
          </div>
        ) : (
          <TransactionTable 
            transactions={transactions} 
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

export default TokenDetail; 