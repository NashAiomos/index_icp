import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCopy, FiCheckCircle } from 'react-icons/fi';
import Header from '../components/Header';
import { ApiService } from '../services/api';
import { Transaction, Token } from '../types';
import { formatDateTime, formatTokenAmount, formatAddress, accountToString } from '../utils/format';
import { useTheme } from '../hooks/useTheme';

const TransactionDetail: React.FC = () => {
  const { index } = useParams<{ index: string }>();
  const navigate = useNavigate();
  const isDark = useTheme();
  
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [token, setToken] = useState<Token | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // 根据主题设置 body 的 class
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    const fetchTransactionDetail = async () => {
      if (!index) return;
      
      try {
        setLoading(true);
        // 获取所有支持的代币
        const tokens = await ApiService.getTokens();
        
        // 尝试从每个代币获取交易（因为我们不知道这个交易属于哪个代币）
        let txData: Transaction | null = null;
        let txToken: Token | null = null;
        
        for (const t of tokens) {
          try {
            const tx = await ApiService.getTransaction(parseInt(index), t.symbol);
            txData = tx;
            txToken = t;
            break;
          } catch (err) {
            // 继续尝试下一个代币
            continue;
          }
        }
        
        if (txData && txToken) {
          setTransaction(txData);
          setToken(txToken);
        } else {
          setError('Transaction not found');
        }
      } catch (err) {
        console.error('Failed to fetch transaction:', err);
        setError('Failed to load transaction details');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactionDetail();
  }, [index]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleAddressClick = (address: string) => {
    if (address && address !== 'Unknown') {
      navigate(`/address/${address}`);
    }
  };

  const renderCopyButton = (text: string, field: string) => (
    <button
      onClick={() => copyToClipboard(text, field)}
      className={`ml-2 ${
        isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
      } transition-colors cursor-pointer`}
    >
      {copiedField === field ? (
        <FiCheckCircle className="text-green-500" />
      ) : (
        <FiCopy className="text-sm" />
      )}
    </button>
  );

  if (loading) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-dark-bg' : 'bg-gray-50'}`}>
        <Header isDark={isDark} />
        <div className="container mx-auto px-4 py-8">
          <div className={`${
            isDark 
              ? 'bg-dark-card border-dark-border' 
              : 'bg-white border-gray-200 shadow-sm'
          } border rounded-lg p-8 text-center`}>
            <div className={isDark ? 'text-gray-400' : 'text-gray-500'}>Loading transaction details...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !transaction || !token) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-dark-bg' : 'bg-gray-50'}`}>
        <Header isDark={isDark} />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg">
            {error || 'Transaction not found'}
          </div>
        </div>
      </div>
    );
  }

  const fromAddress = transaction.from 
    ? (typeof transaction.from === 'string' ? transaction.from : accountToString(transaction.from))
    : 'Unknown';
  const toAddress = transaction.to 
    ? (typeof transaction.to === 'string' ? transaction.to : accountToString(transaction.to))
    : (transaction.spender 
        ? (typeof transaction.spender === 'string' ? transaction.spender : accountToString(transaction.spender))
        : 'Unknown');
  const amount = transaction.amount ? formatTokenAmount(transaction.amount, token.decimals) : '0';
  const fee = transaction.fee ? formatTokenAmount(transaction.fee, token.decimals) : '0';

  return (
    <div className={`min-h-screen ${isDark ? 'bg-dark-bg' : 'bg-gray-50'}`}>
      <Header isDark={isDark} />
      <div className="container mx-auto px-4 py-8">
        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className={`flex items-center space-x-2 mb-6 ${
            isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
          } transition-colors`}
        >
          <FiArrowLeft />
          <span>Back to Explorer</span>
        </button>

        {/* Transaction details card */}
        <div className={`${
          isDark 
            ? 'bg-dark-card border-dark-border' 
            : 'bg-white border-gray-200 shadow-sm'
        } border rounded-lg overflow-hidden`}>
          <div className={`px-6 py-4 border-b ${isDark ? 'border-dark-border' : 'border-gray-200'}`}>
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Transactions
            </h1>
          </div>

          <div className="p-6 space-y-6">
            {/* Transaction ID */}
            <div className="flex items-center justify-between">
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Transaction:</span>
              <div className="flex items-center">
                <span className={`font-mono ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {transaction.index}
                </span>
                {renderCopyButton(transaction.index.toString(), 'tx')}
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between">
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Status:</span>
              <span className="flex items-center text-green-500">
                <FiCheckCircle className="mr-1" />
                Completed
              </span>
            </div>

            {/* Block */}
            <div className="flex items-center justify-between">
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Block:</span>
              <span className={`font-mono ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {transaction.index}
              </span>
            </div>

            {/* Timestamp */}
            <div className="flex items-center justify-between">
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Timestamp:</span>
              <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                {formatDateTime(transaction.timestamp)} UTC
              </span>
            </div>

            <div className={`border-t ${isDark ? 'border-dark-border' : 'border-gray-200'} pt-6`} />

            {/* From */}
            <div className="flex items-center justify-between">
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>From:</span>
              <div className="flex items-center">
                <span 
                  onClick={() => handleAddressClick(fromAddress)}
                  className={`font-mono text-primary-blue hover:underline cursor-pointer`}
                >
                  {formatAddress(fromAddress, 10, 10)}
                </span>
                {renderCopyButton(fromAddress, 'from')}
              </div>
            </div>

            {/* To */}
            <div className="flex items-center justify-between">
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {transaction.kind === 'approve' ? 'Spender:' : 'To:'}
              </span>
              <div className="flex items-center">
                <span 
                  onClick={() => handleAddressClick(toAddress)}
                  className={`font-mono text-primary-blue hover:underline cursor-pointer`}
                >
                  {formatAddress(toAddress, 10, 10)}
                </span>
                {renderCopyButton(toAddress, 'to')}
              </div>
            </div>

            <div className={`border-t ${isDark ? 'border-dark-border' : 'border-gray-200'} pt-6`} />

            {/* Amount */}
            <div className="flex items-center justify-between">
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Amount:</span>
              <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {amount} {token.symbol}
              </span>
            </div>

            {/* Fee */}
            <div className="flex items-center justify-between">
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Fee:</span>
              <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                {fee} {token.symbol}
              </span>
            </div>

            {/* Memo */}
            <div className="flex items-center justify-between">
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Memo:</span>
              <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                {transaction.memo || '0'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionDetail; 