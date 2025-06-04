import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import TransactionTable from '../components/TransactionTable';
import BackToTopButton from '../components/BackToTopButton';
import { ApiService } from '../services/api';
import { Transaction, Token } from '../types';
import { useTheme } from '../hooks/useTheme';
import { formatNumber } from '../utils/format';

interface TokenDetailStats {
  accountCount: number;
  totalSupply: string;
  totalTransactions: number;
}

const TokenDetail: React.FC = () => {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const isDark = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<Token | null>(null);
  const [stats, setStats] = useState<TokenDetailStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tokenList, setTokenList] = useState<Token[]>([]);

  // 根据主题设置 body 的 class
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // 获取代币列表和详情
  useEffect(() => {
    const fetchData = async () => {
      if (!symbol) return;
      
      try {
        setLoading(true);
        setError(null);

        // 获取代币列表
        const tokens = await ApiService.getTokens();
        setTokenList(tokens);
        
        // 处理symbol映射：vUSD -> VUSD
        const apiSymbol = symbol === 'vUSD' ? 'VUSD' : symbol;
        
        // 找到当前代币信息
        const currentToken = tokens.find(t => t.symbol === apiSymbol);
        if (!currentToken) {
          setError('Token not found');
          return;
        }
        setToken(currentToken);

        // 并行获取账户数量、总供应量、交易计数和最新交易
        const [accountCount, totalSupply, txCount, latestTxs] = await Promise.all([
          ApiService.getAccountCount(apiSymbol),
          ApiService.getTotalSupply(apiSymbol),
          ApiService.getTxCount(apiSymbol),
          ApiService.getLatestTransactions(50, apiSymbol)
        ]);

        console.log('API返回的数据:', {
          symbol: apiSymbol,
          accountCount,
          totalSupply,
          txCount
        });

        setStats({
          accountCount: accountCount || 0,
          totalSupply: totalSupply || '0',
          totalTransactions: txCount || 0
        });

        setTransactions(latestTxs);
      } catch (err) {
        console.error('Failed to fetch token details:', err);
        setError('Failed to load token details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol]);

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
  tokenList.forEach(t => {
    tokenMap[t.symbol] = { symbol: t.symbol, decimals: t.decimals };
  });

  return (
    <div className={`min-h-screen ${isDark ? 'bg-dark-bg' : 'bg-gray-50'}`}>
      <Header onSearch={handleSearch} isDark={isDark} />
      
      <main className="container mx-auto" style={{ padding: '1rem 3rem' }}>
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className={`${
            isDark 
              ? 'bg-dark-card border-dark-border' 
              : 'bg-white border-gray-200 shadow-sm'
          } border rounded-lg p-8 text-center`}>
            <div className={isDark ? 'text-gray-400' : 'text-gray-500'}>Loading token details...</div>
          </div>
        ) : token && stats ? (
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
                    {formatNumber(stats.totalTransactions)}
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
                    {formatNumber(stats.totalSupply)}
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
                    {formatNumber(stats.accountCount)}
                  </p>
                </div>
              </div>
            </div>

            {/* Latest Transactions */}
            <div className="mb-4">
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Latest Transactions
              </h2>
            </div>
            <TransactionTable 
              transactions={transactions} 
              tokens={tokenMap} 
              isDark={isDark}
            />
          </>
        ) : null}
      </main>

      {/* 返回顶部按钮 */}
      <BackToTopButton threshold={300} isDark={isDark} />
    </div>
  );
};

export default TokenDetail; 