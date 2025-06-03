import React from 'react';
import { formatNumber } from '../utils/format';

interface TokenCardProps {
  symbol: string;
  name: string;
  totalTransactionCount: string;
  transactions24h: number;
  totalAddresses: number;
  color?: 'blue' | 'purple';
  isDark?: boolean;
}

const TokenCard: React.FC<TokenCardProps> = ({
  symbol,
  name,
  totalTransactionCount,
  transactions24h,
  totalAddresses,
  color = 'blue',
  isDark
}) => {
  const colorClasses = {
    blue: 'bg-primary-blue',
    purple: 'bg-primary-purple'
  };

  return (
    <div className={`${
      isDark 
        ? 'bg-dark-card border-dark-border' 
        : 'bg-white border-gray-200 shadow-sm'
    } border rounded-lg p-6 hover:border-gray-400 transition-colors cursor-pointer`}>
      <div className="flex items-center mb-6">
        <div className={`w-12 h-12 ${colorClasses[color]} rounded-full flex items-center justify-center text-white font-bold text-lg`}>
          {symbol[0]}
        </div>
        <div className="ml-4">
          <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{symbol}</h3>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{name}</p>
        </div>
      </div>

      {/* 横向布局的统计数据 */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className={`text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total number of transactions</p>
          <p className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {formatNumber(totalTransactionCount)}
          </p>
        </div>
        <div>
          <p className={`text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>24h Transactions</p>
          <p className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {formatNumber(transactions24h)}
          </p>
        </div>
        <div>
          <p className={`text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>total Addresses</p>
          <p className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {formatNumber(totalAddresses)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TokenCard; 