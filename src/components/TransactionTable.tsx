import React, { useMemo, useCallback } from 'react';
import { FiArrowRight, FiCopy } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { Transaction } from '../types';
import { formatAddress, formatDateTime, formatTokenAmount, accountToString } from '../utils/format';

// 将样式提取到组件外，避免重复创建
const transactionTableStyles = `
  @keyframes slideInFromTop {
    0% {
      opacity: 0;
      transform: translateY(-10px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes glow {
    0% {
      background-color: rgba(59, 130, 246, 0.15);
    }
    100% {
      background-color: transparent;
    }
  }

  .transaction-row-new {
    animation: slideInFromTop 0.3s ease-out, glow 1.5s ease-out;
  }
`;

interface TransactionTableProps {
  transactions: Transaction[];
  tokens: { [key: string]: { symbol: string; decimals: number } };
  isDark?: boolean;
  headerRef?: React.RefCallback<HTMLDivElement>;
}

// 提取 TransactionRow 为独立组件，使用 React.memo 优化
interface TransactionRowProps {
  tx: Transaction;
  tokenInfo: { symbol: string; decimals: number };
  isDark?: boolean;
  onTransactionClick: (index: number) => void;
  onAddressClick: (address: string) => void;
  onCopy: (text: string) => void;
}

const TransactionRow = React.memo<TransactionRowProps>(({ 
  tx, 
  tokenInfo, 
  isDark, 
  onTransactionClick, 
  onAddressClick,
  onCopy 
}) => {
  // 使用 useMemo 缓存交易数据的提取
  const { from, to, amount, displayAmount } = useMemo(() => {
    let from = 'Unknown';
    let to = 'Unknown';
    let amount = '0';
    
    // 处理API返回的直接格式（字段在顶层）
    if (tx.from && tx.amount) {
      from = typeof tx.from === 'string' ? tx.from : accountToString(tx.from);
      amount = Array.isArray(tx.amount) ? tx.amount[0] : tx.amount;
      
      // 根据kind类型确定to字段
      const kind = tx.kind?.toLowerCase();
      switch (kind) {
        case 'burn':
          to = 'Burned';
          break;
        case 'approve':
          if ((tx as any).spender) {
            to = typeof (tx as any).spender === 'string' ? (tx as any).spender : accountToString((tx as any).spender);
          }
          break;
        case 'transfer':
          if (tx.to) {
            to = typeof tx.to === 'string' ? tx.to : accountToString(tx.to);
          }
          break;
        case 'mint':
          from = 'Minted';
          if (tx.to) {
            to = typeof tx.to === 'string' ? tx.to : accountToString(tx.to);
          }
          break;
        default:
          if (tx.to) {
            to = typeof tx.to === 'string' ? tx.to : accountToString(tx.to);
          }
          break;
      }
    } else {
      // 处理嵌套格式（向后兼容）
      const kind = tx.kind?.toLowerCase();
      const txAny = tx as any;
      
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
      }
    }
    
    const displayAmount = formatTokenAmount(amount, tokenInfo.decimals);
    return { from, to, amount, displayAmount };
  }, [tx, tokenInfo.decimals]);

  const isNew = (tx as any).isNew;

  // 渲染交易类型
  const transactionType = useMemo(() => {
    const typeStyles: { [key: string]: string } = {
      'transfer': 'text-green-600',
      'burn': 'text-red-600',
      'approve': 'text-blue-600',
      'mint': 'text-purple-600'
    };
    
    const normalizedKind = tx.kind?.toLowerCase() || 'unknown';
    const displayKind = normalizedKind.charAt(0).toUpperCase() + normalizedKind.slice(1);
    
    return (
      <span className={`text-xs font-medium ${typeStyles[normalizedKind] || 'text-gray-600'}`}>
        {displayKind}
      </span>
    );
  }, [tx.kind]);

  // 渲染代币标签
  const tokenBadge = useMemo(() => {
    const colors: { [key: string]: string } = {
      'LIKE': 'bg-primary-blue text-white',
      'vUSD': 'bg-primary-purple text-white',
      'VUSD': 'bg-primary-purple text-white',
      'ICP': 'bg-green-600 text-white'
    };
    
    const displaySymbol = tokenInfo.symbol === 'VUSD' ? 'vUSD' : tokenInfo.symbol;
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[tokenInfo.symbol] || 'bg-gray-600 text-white'}`}>
        {displaySymbol}
      </span>
    );
  }, [tokenInfo.symbol]);

  return (
    <tr 
      className={`border-b ${
        isDark 
          ? 'border-dark-border hover:bg-dark-border/30' 
          : 'border-gray-100 hover:bg-gray-50'
      } transition-colors ${isNew ? 'transaction-row-new' : ''}`}
    >
      <td className="px-6 py-4">
        <div className="flex items-center space-x-2">
          <span 
            onClick={() => onTransactionClick(tx.index)}
            className="text-primary-blue hover:underline cursor-pointer"
          >
            {tx.index}
          </span>
          <button
            onClick={() => onCopy(tx.index.toString())}
            className={`${
              isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
            } transition-colors cursor-pointer`}
          >
            <FiCopy className="text-sm" />
          </button>
        </div>
      </td>
      <td className="px-6 py-4">
        {transactionType}
      </td>
      <td className={`px-6 py-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        {formatDateTime(tx.timestamp)}
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center space-x-2">
          <span 
            onClick={() => onAddressClick(from)}
            className={`${
              isDark ? 'text-gray-300' : 'text-gray-700'
            } hover:text-primary-blue cursor-pointer ${
              from === 'Minted' ? 'italic' : ''
            }`}>
            {formatAddress(from)}
          </span>
          {from !== 'Minted' && from !== 'Unknown' && (
            <button
              onClick={() => onCopy(from)}
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
            onClick={() => onAddressClick(to)}
            className={`${
              isDark ? 'text-gray-300' : 'text-gray-700'
            } hover:text-primary-blue cursor-pointer ${
              to === 'Burned' ? 'italic text-red-600' : ''
            }`}>
            {formatAddress(to)}
          </span>
          {to !== 'Burned' && to !== 'Unknown' && (
            <button
              onClick={() => onCopy(to)}
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
        {tokenBadge}
      </td>
    </tr>
  );
});

TransactionRow.displayName = 'TransactionRow';

const TransactionTable: React.FC<TransactionTableProps> = ({ transactions, tokens, isDark, headerRef }) => {
  const navigate = useNavigate();

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);
  
  const handleTransactionClick = useCallback((index: number) => {
    navigate(`/transaction/${index}`);
  }, [navigate]);

  const handleAddressClick = useCallback((address: string) => {
    if (address && address !== 'Unknown' && address !== 'Minted' && address !== 'Burned') {
      navigate(`/address/${address}`);
    }
  }, [navigate]);

  // 使用 useMemo 缓存 token 信息的获取函数
  const getTokenInfo = useCallback((tx: Transaction) => {
    // 首先检查API返回的直接格式中的token字段
    if (tx.token) {
      const tokenSymbol = tx.token === 'VUSD' ? 'VUSD' : tx.token;
      return tokens[tokenSymbol] || { symbol: tokenSymbol, decimals: 6 };
    }
    
    // 检查交易是否包含代币信息（用于自动刷新添加的字段）
    const txWithToken = tx as Transaction & { _tokenSymbol?: string };
    
    if (txWithToken._tokenSymbol) {
      // 如果交易包含代币符号，使用它
      const tokenSymbol = txWithToken._tokenSymbol === 'VUSD' ? 'VUSD' : txWithToken._tokenSymbol;
      return tokens[tokenSymbol] || { symbol: tokenSymbol, decimals: 6 };
    }
    
    // 默认返回 LIKE 代币信息
    return tokens['LIKE'] || { symbol: 'LIKE', decimals: 6 };
  }, [tokens]);

  return (
    <>
      <style>{transactionTableStyles}</style>
      <div className={`${
        isDark 
          ? 'bg-dark-card border-dark-border' 
          : 'bg-white border-gray-200 shadow-sm'
      } border rounded-lg overflow-hidden`}>
        <div 
          ref={headerRef}
          className={`px-6 py-4 border-b ${isDark ? 'border-dark-border' : 'border-gray-200'}`}
        >
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
                return (
                  <TransactionRow
                    key={`${tx.index}-${(tx as any)._tokenSymbol || 'default'}`}
                    tx={tx}
                    tokenInfo={tokenInfo}
                    isDark={isDark}
                    onTransactionClick={handleTransactionClick}
                    onAddressClick={handleAddressClick}
                    onCopy={copyToClipboard}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default React.memo(TransactionTable); 