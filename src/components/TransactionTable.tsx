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
    
    // 首先检查是否是旧格式（直接在顶层的 from/to/amount）
    if (tx.from && tx.to && tx.amount) {
      // 这是旧格式，直接使用顶层的数据
      from = typeof tx.from === 'string' ? tx.from : accountToString(tx.from);
      to = typeof tx.to === 'string' ? tx.to : accountToString(tx.to);
      amount = Array.isArray(tx.amount) ? tx.amount[0] : tx.amount;
      return { from, to, amount };
    }
    
    // 处理不同的 kind 格式（可能是大写或小写）
    const kind = tx.kind?.toLowerCase();
    
    switch (kind) {
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
        // 检查是否直接存在字段数据（可能是大写的 Transfer、Burn 等）
        const txAny = tx as any;
        if (txAny['Transfer']) {
          const transfer = txAny['Transfer'];
          from = transfer.from ? accountToString(transfer.from) : 'Unknown';
          to = transfer.to ? accountToString(transfer.to) : 'Unknown';
          amount = transfer.amount && transfer.amount.length > 0 ? transfer.amount[0] : '0';
        } else if (txAny['Burn']) {
          const burn = txAny['Burn'];
          from = burn.from ? accountToString(burn.from) : 'Unknown';
          to = 'Burned';
          amount = burn.amount && burn.amount.length > 0 ? burn.amount[0] : '0';
        } else if (txAny['Mint']) {
          const mint = txAny['Mint'];
          from = 'Minted';
          to = mint.to ? accountToString(mint.to) : 'Unknown';
          amount = mint.amount && mint.amount.length > 0 ? mint.amount[0] : '0';
        } else if (txAny['Approve']) {
          const approve = txAny['Approve'];
          from = approve.from ? accountToString(approve.from) : 'Unknown';
          to = approve.spender ? accountToString(approve.spender) : 'Unknown';
          amount = approve.amount && approve.amount.length > 0 ? approve.amount[0] : '0';
        }
        // 最后的尝试：遍历对象的所有属性
        else {
          // 查找包含交易数据的属性
          for (const key of Object.keys(tx)) {
            const value = txAny[key];
            if (value && typeof value === 'object' && !Array.isArray(value)) {
              if (value.from && value.to && value.amount) {
                from = value.from ? (typeof value.from === 'string' ? value.from : accountToString(value.from)) : 'Unknown';
                to = value.to ? (typeof value.to === 'string' ? value.to : accountToString(value.to)) : 'Unknown';
                amount = value.amount ? (Array.isArray(value.amount) ? value.amount[0] : value.amount) : '0';
                break;
              }
            }
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
      'mint': 'text-purple-600',
      'Transfer': 'text-green-600',  // 添加大写版本
      'Burn': 'text-red-600',
      'Approve': 'text-blue-600',
      'Mint': 'text-purple-600'
    };
    
    // 处理大小写
    const normalizedKind = kind?.toLowerCase() || 'unknown';
    const displayKind = normalizedKind.charAt(0).toUpperCase() + normalizedKind.slice(1);
    
    return (
      <span className={`text-xs font-medium ${typeStyles[kind] || typeStyles[normalizedKind] || 'text-gray-600'}`}>
        {displayKind}
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