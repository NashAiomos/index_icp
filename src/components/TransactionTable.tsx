import React from 'react';
import { FiArrowRight, FiCopy } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { Transaction } from '../types';
import { formatAddress, formatDateTime, formatTokenAmount, accountToString } from '../utils/format';

interface TransactionTableProps {
  transactions: Transaction[];
  tokens: { [key: string]: { symbol: string; decimals: number } };
  isDark?: boolean;
}

const TransactionTable: React.FC<TransactionTableProps> = ({ transactions, tokens, isDark }) => {
  const navigate = useNavigate();
  
  const getTransactionHash = (tx: Transaction): string => {
    return tx.index.toString();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };
  
  const handleTransactionClick = (index: number) => {
    navigate(`/transaction/${index}`);
  };

  const handleAddressClick = (address: string) => {
    if (address && address !== 'Unknown' && address !== 'Minted' && address !== 'Burned') {
      navigate(`/address/${address}`);
    }
  };

  const getTokenInfo = (tx: Transaction) => {
    // 检查交易是否包含代币信息
    const txWithToken = tx as Transaction & { _tokenSymbol?: string };
    
    if (txWithToken._tokenSymbol) {
      // 如果交易包含代币符号，使用它
      const tokenSymbol = txWithToken._tokenSymbol === 'VUSD' ? 'VUSD' : txWithToken._tokenSymbol;
      return tokens[tokenSymbol] || { symbol: tokenSymbol, decimals: 6 };
    }
    
    // 默认返回 LIKE 代币信息
    return tokens['LIKE'] || { symbol: 'LIKE', decimals: 6 };
  };

  // 从交易中提取 from、to 和 amount 信息
  const extractTransactionData = (tx: Transaction) => {
    let from = 'Unknown';
    let to = 'Unknown';
    let amount = '0';
    
    switch (tx.kind) {
      case 'transfer':
        if (tx.transfer) {
          from = tx.transfer.from ? accountToString(tx.transfer.from) : 'Unknown';
          to = tx.transfer.to ? accountToString(tx.transfer.to) : 'Unknown';
          amount = tx.transfer.amount && tx.transfer.amount.length > 0 ? tx.transfer.amount[0] : '0';
        }
        break;
      
      case 'burn':
        if (tx.burn) {
          from = tx.burn.from ? accountToString(tx.burn.from) : 'Unknown';
          to = 'Burned';
          amount = tx.burn.amount && tx.burn.amount.length > 0 ? tx.burn.amount[0] : '0';
        }
        break;
      
      case 'approve':
        if (tx.approve) {
          from = tx.approve.from ? accountToString(tx.approve.from) : 'Unknown';
          to = tx.approve.spender ? accountToString(tx.approve.spender) : 'Unknown';
          amount = tx.approve.amount && tx.approve.amount.length > 0 ? tx.approve.amount[0] : '0';
        }
        break;
      
      case 'mint':
        if (tx.mint) {
          from = 'Minted';
          to = tx.mint.to ? accountToString(tx.mint.to) : 'Unknown';
          amount = tx.mint.amount && tx.mint.amount.length > 0 ? tx.mint.amount[0] : '0';
        }
        break;
      
      default:
        // 向后兼容：尝试使用旧的字段格式
        if (tx.from) {
          from = typeof tx.from === 'string' ? tx.from : accountToString(tx.from);
        }
        if (tx.to) {
          to = typeof tx.to === 'string' ? tx.to : accountToString(tx.to);
        }
        if (tx.amount) {
          // 处理 amount 可能是数组的情况
          if (Array.isArray(tx.amount)) {
            amount = tx.amount.length > 0 ? tx.amount[0] : '0';
          } else {
            amount = tx.amount;
          }
        }
        break;
    }
    
    return { from, to, amount };
  };

  const renderTokenBadge = (symbol: string) => {
    const colors: { [key: string]: string } = {
      'LIKE': 'bg-primary-blue text-white',
      'vUSD': 'bg-primary-purple text-white',
      'VUSD': 'bg-primary-purple text-white',
      'ICP': 'bg-green-600 text-white'
    };
    
    // 确保 VUSD 显示为 vUSD
    const displaySymbol = symbol === 'VUSD' ? 'vUSD' : symbol;
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[symbol] || 'bg-gray-600 text-white'}`}>
        {displaySymbol}
      </span>
    );
  };

  const renderTransactionType = (kind: string) => {
    const typeStyles: { [key: string]: string } = {
      'transfer': 'text-green-600',
      'burn': 'text-red-600',
      'approve': 'text-blue-600',
      'mint': 'text-purple-600'
    };
    
    return (
      <span className={`text-xs font-medium ${typeStyles[kind] || 'text-gray-600'}`}>
        {kind.charAt(0).toUpperCase() + kind.slice(1)}
      </span>
    );
  };

  return (
    <div className={`${
      isDark 
        ? 'bg-dark-card border-dark-border' 
        : 'bg-white border-gray-200 shadow-sm'
    } border rounded-lg overflow-hidden`}>
      <div className={`px-6 py-4 border-b ${isDark ? 'border-dark-border' : 'border-gray-200'}`}>
        <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Latest Transactions</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className={`border-b ${isDark ? 'border-dark-border' : 'border-gray-200'}`}>
              <th className={`text-left px-6 py-3 text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Transactions Index
              </th>
              <th className={`text-left px-6 py-3 text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Type
              </th>
              <th className={`text-left px-6 py-3 text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Time
              </th>
              <th className={`text-left px-6 py-3 text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                From
              </th>
              <th className="text-center px-6 py-3 text-sm font-medium"></th>
              <th className={`text-left px-6 py-3 text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                To
              </th>
              <th className={`text-right px-6 py-3 text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Value
              </th>
              <th className={`text-center px-6 py-3 text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Token
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => {
              const tokenInfo = getTokenInfo(tx);
              const { from, to, amount } = extractTransactionData(tx);
              const displayAmount = formatTokenAmount(amount, tokenInfo.decimals);

              return (
                <tr key={`${tx.index}-${(tx as any)._tokenSymbol || 'default'}`} className={`border-b ${
                  isDark 
                    ? 'border-dark-border hover:bg-dark-border/30' 
                    : 'border-gray-100 hover:bg-gray-50'
                } transition-colors`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <span 
                        onClick={() => handleTransactionClick(tx.index)}
                        className="text-primary-blue hover:underline cursor-pointer"
                      >
                        {getTransactionHash(tx)}
                      </span>
                      <button
                        onClick={() => copyToClipboard(tx.index.toString())}
                        className={`${
                          isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
                        } transition-colors cursor-pointer`}
                      >
                        <FiCopy className="text-sm" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {renderTransactionType(tx.kind)}
                  </td>
                  <td className={`px-6 py-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {formatDateTime(tx.timestamp)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <span 
                        onClick={() => handleAddressClick(from)}
                        className={`${
                          isDark ? 'text-gray-300' : 'text-gray-700'
                        } hover:text-primary-blue cursor-pointer ${
                          from === 'Minted' ? 'italic' : ''
                        }`}>
                        {formatAddress(from)}
                      </span>
                      {from !== 'Minted' && from !== 'Unknown' && (
                        <button
                          onClick={() => copyToClipboard(from)}
                          className={`${
                            isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
                          } transition-colors cursor-pointer`}
                        >
                          <FiCopy className="text-sm" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <FiArrowRight className={isDark ? 'text-gray-500' : 'text-gray-400'} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <span 
                        onClick={() => handleAddressClick(to)}
                        className={`${
                          isDark ? 'text-gray-300' : 'text-gray-700'
                        } hover:text-primary-blue cursor-pointer ${
                          to === 'Burned' ? 'italic text-red-600' : ''
                        }`}>
                        {formatAddress(to)}
                      </span>
                      {to !== 'Burned' && to !== 'Unknown' && (
                        <button
                          onClick={() => copyToClipboard(to)}
                          className={`${
                            isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
                          } transition-colors cursor-pointer`}
                        >
                          <FiCopy className="text-sm" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className={`px-6 py-4 text-right font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {displayAmount}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {renderTokenBadge(tokenInfo.symbol)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionTable; 