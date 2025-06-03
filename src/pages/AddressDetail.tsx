import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ApiService } from '../services/api';
import { AccountBalance, Transaction } from '../types';
import { useTheme } from '../hooks/useTheme';
import { formatAddress, formatNumber } from '../utils/format';
import Header from '../components/Header';

interface AddressStats {
  transactionVolume: number;
  firstTransactionTime: number | null;
  lastTransactionTime: number | null;
  transactionCount: number;
}

const AddressDetail: React.FC = () => {
  const { address } = useParams<{ address: string }>();
  const [likeBalance, setLikeBalance] = useState<AccountBalance | null>(null);
  const [vusdBalance, setVusdBalance] = useState<AccountBalance | null>(null);
  const [addressStats, setAddressStats] = useState<AddressStats>({
    transactionVolume: 0,
    firstTransactionTime: null,
    lastTransactionTime: null,
    transactionCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isDark = useTheme();

  useEffect(() => {
    if (!address) return;

    const fetchAddressData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 并行获取LIKE和VUSD余额以及交易数据
        const [likeBalanceData, vusdBalanceData, likeTransactions, vusdTransactions] = await Promise.all([
          ApiService.getBalance(address, 'LIKE').catch(() => null),
          ApiService.getBalance(address, 'VUSD').catch(() => null),
          ApiService.getAccountTransactions(address, 'LIKE').catch(() => ({ transactions: [] })),
          ApiService.getAccountTransactions(address, 'VUSD').catch(() => ({ transactions: [] }))
        ]);

        setLikeBalance(likeBalanceData);
        setVusdBalance(vusdBalanceData);

        // 合并所有交易并计算统计数据
        const allTransactions = [...likeTransactions.transactions, ...vusdTransactions.transactions];
        
        if (allTransactions.length > 0) {
          // 按时间戳排序
          allTransactions.sort((a, b) => a.timestamp - b.timestamp);
          
          // 计算交易量（将所有交易的amount相加）
          let totalVolume = 0;
          allTransactions.forEach(tx => {
            // 根据交易类型获取金额
            let amount = '0';
            if (tx.transfer && tx.transfer.amount) {
              amount = tx.transfer.amount[0] || '0';
            } else if (tx.burn && tx.burn.amount) {
              amount = tx.burn.amount[0] || '0';
            } else if (tx.mint && tx.mint.amount) {
              amount = tx.mint.amount[0] || '0';
            } else if (tx.approve && tx.approve.amount) {
              amount = tx.approve.amount[0] || '0';
            }
            
            // 将金额转换为数字并累加
            const numAmount = parseFloat(amount) || 0;
            totalVolume += numAmount;
          });

          setAddressStats({
            transactionVolume: totalVolume,
            firstTransactionTime: allTransactions[0].timestamp,
            lastTransactionTime: allTransactions[allTransactions.length - 1].timestamp,
            transactionCount: allTransactions.length
          });
        }
      } catch (err) {
        console.error('Failed to fetch address data:', err);
        setError('Failed to load address data');
      } finally {
        setLoading(false);
      }
    };

    fetchAddressData();
  }, [address]);

  const handleSearch = (query: string) => {
    // TODO: 实现搜索功能
    console.log('Search query:', query);
  };

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

  return (
    <div className={`min-h-screen ${isDark ? 'bg-dark-bg' : 'bg-gray-50'}`}>
      <Header onSearch={handleSearch} isDark={isDark} />
      
      <main className="container mx-auto px-4 py-8">
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
          返回首页
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
                  <p className={`font-mono text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} flex items-center`}>
                    {formatAddress(address || '')}
                    <button className="ml-2 p-1 hover:bg-gray-100 rounded">
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
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Transaction Volume</p>
                      <p className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {formatNumber(addressStats.transactionCount)}
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
                        {formatTimeDiff(addressStats.firstTransactionTime)}
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
                        {formatTimeDiff(addressStats.lastTransactionTime)}
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
              
              <div className="space-y-4">
                {/* LIKE 余额 */}
                <div className={`flex items-center justify-between p-4 rounded-lg ${
                  isDark ? 'bg-blue-50/5' : 'bg-blue-50'
                }`}>
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center mr-3">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M5,9V21H1V9H5M9,21A2,2 0 0,1 7,19V9C7,8.45 7.22,7.95 7.59,7.59L14.17,1L15.23,2.06C15.5,2.33 15.67,2.7 15.67,3.11L15.64,3.43L14.69,8H21C21.53,8 22,8.21 22.39,8.6C22.78,8.99 23,9.47 23,10A1,1 0 0,1 22.83,10.17L19.05,18.05C18.65,18.88 17.86,19.45 16.95,19.45H9M13.6,7L14.5,3.43L9,8.95V19.5H16.95L20.72,11.5H13.6V7Z"/>
                      </svg>
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
                    <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center mr-3">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M7,15H9C9,16.08 10.37,17 12,17C13.63,17 15,16.08 15,15C15,13.9 13.96,13.5 11.76,12.97C9.64,12.44 7,11.78 7,9C7,7.21 8.47,5.69 10.5,5.18V3H13.5V5.18C15.53,5.69 17,7.21 17,9H15C15,7.92 13.63,7 12,7C10.37,7 9,7.92 9,9C9,10.1 10.04,10.5 12.24,11.03C14.36,11.56 17,12.22 17,15C17,16.79 15.53,18.31 13.5,18.82V21H10.5V18.82C8.47,18.31 7,16.79 7,15Z"/>
                      </svg>
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
          </>
        )}
      </main>
    </div>
  );
};

export default AddressDetail; 