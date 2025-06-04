import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ApiService } from '../services/api';
import { AccountBalance, Transaction } from '../types';
import { useTheme } from '../hooks/useTheme';
import { formatAddress, formatNumber } from '../utils/format';
import Header from '../components/Header';
import TransactionTable from '../components/TransactionTable';
import BackToTopButton from '../components/BackToTopButton';
import { useAutoRefreshTransactions } from '../hooks/useAutoRefreshTransactions';

// 扩展 Transaction 类型，添加代币信息
interface TransactionWithToken extends Transaction {
  tokenSymbol: string;
}

interface AddressStats {
  totalTransactionCount: number;
  firstTransactionTime: number | null;
  lastTransactionTime: number | null;
  transactionCount: number;
}

const AddressDetail: React.FC = () => {
  const { address } = useParams<{ address: string }>();
  const [likeBalance, setLikeBalance] = useState<AccountBalance | null>(null);
  const [vusdBalance, setVusdBalance] = useState<AccountBalance | null>(null);
  const [addressStats, setAddressStats] = useState<AddressStats>({
    totalTransactionCount: 0,
    firstTransactionTime: null,
    lastTransactionTime: null,
    transactionCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isDark = useTheme();
  
  // 交易列表相关状态
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [vusdSkip, setVusdSkip] = useState(0);
  const [likeSkip, setLikeSkip] = useState(0);
  
  // 无限滚动相关
  const observerRef = useRef<IntersectionObserver | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  
  // 每次加载的交易数量
  const TRANSACTIONS_PER_LOAD = 50;
  
  // 代币映射表
  const tokenMap = {
    'LIKE': { symbol: 'LIKE', decimals: 6 },
    'VUSD': { symbol: 'VUSD', decimals: 6 }
  };
  
  // 获取并合并交易（用于自动刷新）
  const fetchTransactionsForRefresh = useCallback(async () => {
    if (!address) return [];
    
    try {
      // 并行获取 VUSD 和 LIKE 的最新交易
      const [vusdResult, likeResult] = await Promise.all([
        ApiService.getAccountTransactions(address, 'VUSD', TRANSACTIONS_PER_LOAD, 0),
        ApiService.getAccountTransactions(address, 'LIKE', TRANSACTIONS_PER_LOAD, 0)
      ]);
      
      // 为交易添加代币标识
      const vusdTransactions = vusdResult.transactions.map(tx => ({
        ...tx,
        _tokenSymbol: 'VUSD'
      }));
      
      const likeTransactions = likeResult.transactions.map(tx => ({
        ...tx,
        _tokenSymbol: 'LIKE'
      }));
      
      // 合并并排序
      const mergedTransactions = [...vusdTransactions, ...likeTransactions]
        .sort((a, b) => b.timestamp - a.timestamp);
      
      return mergedTransactions;
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
      return [];
    }
  }, [address]);
  
  // 使用自动刷新 hook
  const { 
    transactions, 
    setTransactions, 
    setHeaderRef,
    clearNewFlags
  } = useAutoRefreshTransactions({
    fetchFunction: fetchTransactionsForRefresh,
    interval: 20000, // 20秒
    enabled: true
  });
  
  // 获取并合并交易（用于分页加载）
  const fetchAndMergeTransactions = async (isInitial: boolean = false) => {
    if (!address) return [];
    
    try {
      // 并行获取 VUSD 和 LIKE 的交易
      const [vusdResult, likeResult] = await Promise.all([
        ApiService.getAccountTransactions(address, 'VUSD', TRANSACTIONS_PER_LOAD, isInitial ? 0 : vusdSkip),
        ApiService.getAccountTransactions(address, 'LIKE', TRANSACTIONS_PER_LOAD, isInitial ? 0 : likeSkip)
      ]);
      
      // 为交易添加代币标识
      const vusdTransactions: TransactionWithToken[] = vusdResult.transactions.map(tx => ({
        ...tx,
        tokenSymbol: 'VUSD'
      }));
      
      const likeTransactions: TransactionWithToken[] = likeResult.transactions.map(tx => ({
        ...tx,
        tokenSymbol: 'LIKE'
      }));
      
      // 更新skip值
      if (!isInitial) {
        setVusdSkip(prev => prev + vusdResult.transactions.length);
        setLikeSkip(prev => prev + likeResult.transactions.length);
      } else {
        setVusdSkip(vusdResult.transactions.length);
        setLikeSkip(likeResult.transactions.length);
      }
      
      // 如果两种代币都没有更多交易了，设置hasMore为false
      if (vusdResult.transactions.length < TRANSACTIONS_PER_LOAD && likeResult.transactions.length < TRANSACTIONS_PER_LOAD) {
        setHasMore(false);
      }
      
      // 合并交易
      return [...vusdTransactions, ...likeTransactions];
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
      return [];
    }
  };

  useEffect(() => {
    if (!address) return;

    const fetchAddressData = async () => {
      try {
        setLoading(true);
        setStatsLoading(true);
        setError(null);

        // 并行获取LIKE和VUSD余额
        const [likeBalanceData, vusdBalanceData] = await Promise.all([
          ApiService.getBalance(address, 'LIKE').catch(() => null),
          ApiService.getBalance(address, 'VUSD').catch(() => null),
        ]);

        setLikeBalance(likeBalanceData);
        setVusdBalance(vusdBalanceData);
        
        // 获取初始交易数据
        const initialTransactions = await fetchTransactionsForRefresh();
        setTransactions(initialTransactions);
        
        setLoading(false);

        // 使用获取到的交易数据计算统计信息
        if (initialTransactions.length > 0) {
          // 获取所有交易（用于统计）
          const [allVusdResult, allLikeResult] = await Promise.all([
            ApiService.getAccountTransactions(address, 'VUSD', 1000, 0).catch(() => ({ transactions: [] })),
            ApiService.getAccountTransactions(address, 'LIKE', 1000, 0).catch(() => ({ transactions: [] }))
          ]);
          
          const allTransactions = [...allVusdResult.transactions, ...allLikeResult.transactions];
          
          if (allTransactions.length > 0) {
            // 按时间戳排序
            allTransactions.sort((a, b) => a.timestamp - b.timestamp);
            
            // 计算交易统计信息
            setAddressStats({
              totalTransactionCount: allTransactions.length,
              firstTransactionTime: allTransactions[0].timestamp,
              lastTransactionTime: allTransactions[allTransactions.length - 1].timestamp,
              transactionCount: allTransactions.length
            });
          }
        } else {
          // 如果没有交易，设置默认值
          setAddressStats({
            totalTransactionCount: 0,
            firstTransactionTime: null,
            lastTransactionTime: null,
            transactionCount: 0
          });
        }
        setStatsLoading(false);
      } catch (err) {
        console.error('Failed to fetch address data:', err);
        setError('Failed to load address data');
        setLoading(false);
        setStatsLoading(false);
      }
    };

    fetchAddressData();
  }, [address, fetchTransactionsForRefresh, setTransactions]);
  
  // 加载更多交易
  const loadMoreTransactions = useCallback(async () => {
    if (loadingMore || !hasMore || !address) return;
    
    try {
      setLoadingMore(true);
      const moreTransactions = await fetchAndMergeTransactions(false);
      
      if (moreTransactions.length === 0) {
        setHasMore(false);
      } else {
        // 转换并添加新交易
        const convertedTxs = moreTransactions.map(tx => ({
          ...tx,
          _tokenSymbol: tx.tokenSymbol
        }));
        
        // 合并新交易和现有交易，然后重新排序
        const allTransactions = [...transactions, ...convertedTxs];
        const sortedTransactions = allTransactions.sort((a, b) => b.timestamp - a.timestamp);
        
        // 去重（基于交易索引和代币类型）
        const uniqueTransactions = sortedTransactions.filter((tx, index, self) => 
          index === self.findIndex(t => t.index === tx.index && t._tokenSymbol === tx._tokenSymbol)
        );
        
        setTransactions(uniqueTransactions);
      }
    } catch (err) {
      console.error('Failed to load more transactions:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [address, hasMore, loadingMore, transactions, setTransactions]);
  
  // 设置无限滚动观察器
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

  // 格式化余额显示
  const formatBalance = (balance: AccountBalance | null) => {
    if (!balance) return '0';
    const amount = parseFloat(balance.balance) / Math.pow(10, balance.decimals);
    return formatNumber(amount);
  };

  // 格式化时间差
  const formatTimeDiff = (timestamp: number | null) => {
    if (!timestamp) return 'Unknown';
    
    const now = Date.now();
    // 如果时间戳是纳秒级的，转换为毫秒；否则认为是秒，转换为毫秒
    const time = timestamp > 1e12 ? timestamp / 1e6 : timestamp * 1000;
    const diff = now - time;
    
    // 如果差值为负数，说明时间在未来
    if (diff < 0) {
      return 'Unknown';
    }
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days} Day${days > 1 ? 's' : ''} Ago`;
    } else if (hours > 0) {
      return `${hours} Hour${hours > 1 ? 's' : ''} Ago`;
    } else if (minutes > 0) {
      return `${minutes} Min${minutes > 1 ? 's' : ''} Ago`;
    } else {
      return 'Just now';
    }
  };

  // 加载动画组件
  const LoadingSpinner = () => (
    <div className="flex items-center justify-center">
      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
    </div>
  );

  return (
    <div className={`min-h-screen ${isDark ? 'bg-dark-bg' : 'bg-gray-50'}`}>
      <Header isDark={isDark} />
      
      <main className="container mx-auto" style={{ padding: '1rem 3rem' }}>
        {/* 返回按钮 */}
        <Link 
          to="/"
          className={`inline-flex items-center mb-6 ${
            isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-800'
          } transition-colors`}
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Explorer
        </Link>

        {loading ? (
          <div className={`${
            isDark 
              ? 'bg-dark-card border-dark-border' 
              : 'bg-white border-gray-200 shadow-sm'
          } border rounded-lg p-8 text-center`}>
            <div className={isDark ? 'text-gray-400' : 'text-gray-500'}>Loading...</div>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg">
            {error}
          </div>
        ) : (
          <>
            {/* 账户信息卡片 */}
            <div className={`${
              isDark 
                ? 'bg-dark-card border-dark-border' 
                : 'bg-white border-gray-200 shadow-sm'
            } border rounded-lg p-6 mb-6`}>
              <div className="flex items-center mb-6">
                <div className={`w-12 h-12 rounded-full ${
                  isDark ? 'bg-blue-500' : 'bg-blue-500'
                } flex items-center justify-center mr-4`}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Account
                  </h1>
                  <p className={`font-mono text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} flex items-center break-all`}>
                    {address || ''}
                    <button 
                      onClick={() => navigator.clipboard.writeText(address || '')}
                      className="ml-2 p-1 hover:bg-gray-100 rounded flex-shrink-0"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </p>
                </div>
              </div>

              {/* 统计信息 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V19A2 2 0 0 0 5 21H11V19H5V3H13V9H21Z"/>
                      </svg>
                    </div>
                    <div>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total number of transactions</p>
                      <p className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {statsLoading ? <LoadingSpinner /> : formatNumber(addressStats.totalTransactionCount)}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.9L16.2,16.2Z"/>
                      </svg>
                    </div>
                    <div>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>First Transaction</p>
                      <p className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {statsLoading ? <LoadingSpinner /> : formatTimeDiff(addressStats.firstTransactionTime)}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.9L16.2,16.2Z"/>
                      </svg>
                    </div>
                    <div>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Last Transaction</p>
                      <p className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {statsLoading ? <LoadingSpinner /> : formatTimeDiff(addressStats.lastTransactionTime)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 代币余额 */}
            <div className={`${
              isDark 
                ? 'bg-dark-card border-dark-border' 
                : 'bg-white border-gray-200 shadow-sm'
            } border rounded-lg p-6`}>
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 rounded bg-yellow-500/10 flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M5,9V21H1V9H5M9,21A2,2 0 0,1 7,19V9C7,8.45 7.22,7.95 7.59,7.59L14.17,1L15.23,2.06C15.5,2.33 15.67,2.7 15.67,3.11L15.64,3.43L14.69,8H21C21.53,8 22,8.21 22.39,8.6C22.78,8.99 23,9.47 23,10A1,1 0 0,1 22.83,10.17L19.05,18.05C18.65,18.88 17.86,19.45 16.95,19.45H9M13.6,7L14.5,3.43L9,8.95V19.5H16.95L20.72,11.5H13.6V7Z"/>
                  </svg>
                </div>
                <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Token Holding (2)
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* LIKE 余额 */}
                <div className={`flex items-center justify-between p-4 rounded-lg ${
                  isDark ? 'bg-blue-50/5' : 'bg-blue-50'
                }`}>
                  <div className="flex items-center">
                    <div className="w-10 h-10 flex items-center justify-center mr-3">
                      <img 
                        src="/logo_like.svg" 
                        alt="LIKE Logo" 
                        className="w-10 h-10 object-contain"
                      />
                    </div>
                    <div>
                      <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        LIKE
                      </p>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {likeBalance?.token_name || 'LIKE Token'}
                      </p>
                    </div>
                  </div>
                  <p className={`text-lg font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                    {formatBalance(likeBalance)}
                  </p>
                </div>

                {/* VUSD 余额 */}
                <div className={`flex items-center justify-between p-4 rounded-lg ${
                  isDark ? 'bg-purple-50/5' : 'bg-purple-50'
                }`}>
                  <div className="flex items-center">
                    <div className="w-10 h-10 flex items-center justify-center mr-3">
                      <img 
                        src="/logo_vusd.svg" 
                        alt="vUSD Logo" 
                        className="w-10 h-10 object-contain"
                      />
                    </div>
                    <div>
                      <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        vUSD
                      </p>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {vusdBalance?.token_name || 'Virtual USD'}
                      </p>
                    </div>
                  </div>
                  <p className={`text-lg font-bold ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                    {formatBalance(vusdBalance)}
                  </p>
                </div>
              </div>
            </div>
            
            {/* 交易列表 */}
            {transactions.length > 0 && (
              <div className="mt-6">
                <TransactionTable 
                  transactions={transactions} 
                  tokens={tokenMap} 
                  isDark={isDark}
                  headerRef={setHeaderRef}
                />
                
                {/* 加载更多指示器 */}
                <div ref={bottomRef} className="mt-8 text-center">
                  {loadingMore && (
                    <div className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                      Loading more transactions...
                    </div>
                  )}
                  {!hasMore && transactions.length >= TRANSACTIONS_PER_LOAD * 2 && (
                    <div className={isDark ? 'text-gray-500' : 'text-gray-400'}>
                      No more transactions to load
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* 如果没有交易 */}
            {!loading && transactions.length === 0 && (
              <div className={`${
                isDark 
                  ? 'bg-dark-card border-dark-border' 
                  : 'bg-white border-gray-200 shadow-sm'
              } border rounded-lg p-8 text-center mt-6`}>
                <div className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                  该地址暂无交易记录
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* 返回顶部按钮 */}
      <BackToTopButton threshold={300} isDark={isDark} />
    </div>
  );
};

export default AddressDetail; 