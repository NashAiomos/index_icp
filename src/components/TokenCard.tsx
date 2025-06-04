import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatNumber } from '../utils/format';
import RollingNumber from './RollingNumber';
import { Token } from '../types';

interface TokenCardProps {
  symbol: string;
  name: string;
  totalTransactionCount: string;
  totalSupply: string;
  totalAddresses: number;
  color?: 'blue' | 'purple';
  isDark?: boolean;
  token?: Token;
}

const TokenCard: React.FC<TokenCardProps> = ({
  symbol,
  name,
  totalTransactionCount,
  totalSupply,
  totalAddresses,
  color = 'blue',
  isDark,
  token
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    // 简化导航，不再传递数据
    navigate(`/token/${symbol}`);
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

  return (
    <div 
      onClick={handleClick}
      className={`${
        isDark 
          ? 'bg-dark-card border-dark-border' 
          : 'bg-white border-gray-200 shadow-sm'
      } border rounded-lg p-6 hover:border-gray-400 transition-colors cursor-pointer`}>
      <div className="flex items-center mb-6">
        <div className="w-12 h-12 flex items-center justify-center">
          <img 
            src={getLogoPath(symbol)} 
            alt={`${symbol} Logo`} 
            className="w-12 h-12 object-contain"
          />
        </div>
        <div className="ml-4">
          <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{symbol}</h3>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{name}</p>
        </div>
      </div>

      {/* 横向布局的统计数据 */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className={`text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Transactions</p>
          <p className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <RollingNumber value={totalTransactionCount} />
          </p>
        </div>
        <div>
          <p className={`text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Supply</p>
          <p className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <RollingNumber value={totalSupply} />
          </p>
        </div>
        <div>
          <p className={`text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Holding Accounts</p>
          <p className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <RollingNumber value={totalAddresses.toString()} />
          </p>
        </div>
      </div>
    </div>
  );
};

export default TokenCard; 