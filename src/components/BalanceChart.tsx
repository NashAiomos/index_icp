import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Transaction } from '../types';
import { formatNumber, accountToString } from '../utils/format';

interface BalanceChartProps {
  transactions: Transaction[];
  tokenSymbol: 'LIKE' | 'VUSD';
  currentBalance: string;
  decimals: number;
  address: string;
  isDark: boolean;
  className?: string;
}

type TimeRange = '1d' | '7d' | '1m' | '6m' | '1y' | 'all';

interface ChartDataPoint {
  timestamp: number;
  balance: number;
  date: string;
  formattedBalance: string;
}

const BalanceChart: React.FC<BalanceChartProps> = ({
  transactions,
  tokenSymbol,
  currentBalance,
  decimals,
  address,
  isDark,
  className = ''
}) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('7d');

  // 时间范围配置
  const timeRangeConfig = {
    '1d': { label: '1 Day', days: 1 },
    '7d': { label: '7 Days', days: 7 },
    '1m': { label: '1 Month', days: 30 },
    '6m': { label: '6 Months', days: 180 },
    '1y': { label: '1 Year', days: 365 },
    'all': { label: 'All Time', days: Infinity }
  };

  // 判断是否为转出交易
  const isOutgoingTransaction = (from: any): boolean => {
    const fromAddress = accountToString(from);
    return fromAddress === address;
  };

  // 判断是否为转入交易
  const isIncomingTransaction = (to: any): boolean => {
    const toAddress = accountToString(to);
    return toAddress === address;
  };

  // 计算历史余额数据
  const chartData = useMemo(() => {
    // 计算时间范围
    const now = Date.now();
    const selectedRange = timeRangeConfig[selectedTimeRange];
    const startTime = selectedRange.days === Infinity 
      ? 0 
      : now - (selectedRange.days * 24 * 60 * 60 * 1000);

    // 获取当前余额（转换为数字）
    const currentBalanceNum = parseFloat(currentBalance) / Math.pow(10, decimals);
    
    // 初始化余额为当前余额（如果无效则为0）
    let runningBalance = isNaN(currentBalanceNum) ? 0 : currentBalanceNum;
    const balancePoints: ChartDataPoint[] = [];

    // 总是添加当前时间点
    balancePoints.push({
      timestamp: now,
      balance: runningBalance,
      date: new Date(now).toLocaleDateString('en-US'),
      formattedBalance: formatNumber(runningBalance)
    });
    
    if (!transactions.length) {
      // 添加一周前的相同余额点以显示平线
      const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
      balancePoints.unshift({
        timestamp: weekAgo,
        balance: runningBalance,
        date: new Date(weekAgo).toLocaleDateString('en-US'),
        formattedBalance: formatNumber(runningBalance)
      });
      return balancePoints;
    }

    // 筛选相关交易（只包含当前代币和当前地址）
    const relevantTransactions = transactions.filter(tx => {
      // 根据交易中的代币信息或者_tokenSymbol字段过滤
      const txTokenSymbol = (tx as any)._tokenSymbol || (tx as any).tokenSymbol;
      
      if (txTokenSymbol !== tokenSymbol) return false;

      // 检查交易是否与当前地址相关
      let isRelevant = false;
      
      if (tx.transfer) {
        const fromAddress = accountToString(tx.transfer.from);
        const toAddress = accountToString(tx.transfer.to);
        isRelevant = fromAddress === address || toAddress === address;
      } else if (tx.mint) {
        const toAddress = accountToString(tx.mint.to);
        isRelevant = toAddress === address;
      } else if (tx.burn) {
        const fromAddress = accountToString(tx.burn.from);
        isRelevant = fromAddress === address;
      } else {
        // 检查旧的数据格式
        if (tx.from || tx.to) {
          const fromAddress = typeof tx.from === 'string' ? tx.from : (tx.from ? accountToString(tx.from) : '');
          const toAddress = typeof tx.to === 'string' ? tx.to : (tx.to ? accountToString(tx.to) : '');
          isRelevant = fromAddress === address || toAddress === address;
        }
      }

      return isRelevant;
    });

    if (!relevantTransactions.length) {
      // 添加一周前的相同余额点以显示平线
      const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
      balancePoints.unshift({
        timestamp: weekAgo,
        balance: runningBalance,
        date: new Date(weekAgo).toLocaleDateString('en-US'),
        formattedBalance: formatNumber(runningBalance)
      });
      return balancePoints;
    }

    // 按时间戳排序（从旧到新）
    const sortedTransactions = [...relevantTransactions].sort((a, b) => a.timestamp - b.timestamp);

    // 从最新交易开始，向前推算历史余额
    for (let i = sortedTransactions.length - 1; i >= 0; i--) {
      const tx = sortedTransactions[i];
      const txTime = tx.timestamp > 1e12 ? tx.timestamp / 1e6 : tx.timestamp * 1000;
      
      // 如果交易时间超出选定范围，跳出循环
      if (txTime < startTime) {
        break;
      }

      // 根据交易类型调整余额
      let balanceChange = 0;

      if (tx.transfer) {
        const amount = parseFloat(tx.transfer.amount[0]) / Math.pow(10, decimals);
        const fee = tx.transfer.fee ? parseFloat(tx.transfer.fee[0]) / Math.pow(10, decimals) : 0;
        
        // 如果是转出交易，向前推算时需要加回金额和手续费
        if (isOutgoingTransaction(tx.transfer.from)) {
          balanceChange = amount + fee;
        } 
        // 如果是转入交易，向前推算时需要减去金额
        else if (isIncomingTransaction(tx.transfer.to)) {
          balanceChange = -amount;
        }
      } else if (tx.mint) {
        // Mint交易增加余额，向前推算时需要减去
        const amount = parseFloat(tx.mint.amount[0]) / Math.pow(10, decimals);
        if (isIncomingTransaction(tx.mint.to)) {
          balanceChange = -amount;
        }
      } else if (tx.burn) {
        // Burn交易减少余额，向前推算时需要加回
        const amount = parseFloat(tx.burn.amount[0]) / Math.pow(10, decimals);
        if (isOutgoingTransaction(tx.burn.from)) {
          balanceChange = amount;
        }
      } else if (tx.approve) {
        // Approve交易通常只消耗手续费
        const fee = tx.approve.fee ? parseFloat(tx.approve.fee[0]) / Math.pow(10, decimals) : 0;
        if (isOutgoingTransaction(tx.approve.from)) {
          balanceChange = fee;
        }
      } else {
        // 处理旧格式的交易数据
        if (tx.amount && (tx.from || tx.to)) {
          const amountStr = tx.amount.replace(/_/g, '');
          const amount = parseFloat(amountStr) / Math.pow(10, decimals);
          const feeStr = tx.fee ? tx.fee.replace(/_/g, '') : '0';
          const fee = parseFloat(feeStr) / Math.pow(10, decimals);
          
          const fromAddress = typeof tx.from === 'string' ? tx.from : (tx.from ? accountToString(tx.from) : '');
          const toAddress = typeof tx.to === 'string' ? tx.to : (tx.to ? accountToString(tx.to) : '');
          
          // 如果是转出交易，向前推算时需要加回金额和手续费
          if (fromAddress === address) {
            balanceChange = amount + fee;
          } 
          // 如果是转入交易，向前推算时需要减去金额
          else if (toAddress === address) {
            balanceChange = -amount;
          }
        }
      }

      runningBalance += balanceChange;

      balancePoints.unshift({
        timestamp: txTime,
        balance: Math.max(0, runningBalance), // Ensure balance is not negative
        date: new Date(txTime).toLocaleDateString('en-US'),
        formattedBalance: formatNumber(Math.max(0, runningBalance))
      });
    }

    // 如果选择了特定时间范围且有数据，添加起始点
    if (selectedRange.days !== Infinity && balancePoints.length > 0) {
      const firstPoint = balancePoints[0];
      if (firstPoint.timestamp > startTime) {
        balancePoints.unshift({
          timestamp: startTime,
          balance: firstPoint.balance,
          date: new Date(startTime).toLocaleDateString('en-US'),
          formattedBalance: firstPoint.formattedBalance
        });
      }
    }

    // 确保至少有当前余额点
    if (balancePoints.length === 1) {
      // 如果只有一个点（当前余额），添加一周前的相同余额点以显示平线
      const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
      balancePoints.unshift({
        timestamp: weekAgo,
        balance: runningBalance,
        date: new Date(weekAgo).toLocaleDateString('en-US'),
        formattedBalance: formatNumber(runningBalance)
      });
    }
    
    return balancePoints;
  }, [transactions, tokenSymbol, currentBalance, decimals, selectedTimeRange, address]);

  // 自定义Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className={`${
          isDark ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
        } border rounded-lg p-3 shadow-lg`}>
          <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'} text-sm`}>
            {new Date(data.timestamp).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
          <p className={`${
            tokenSymbol === 'LIKE' 
              ? 'text-blue-500' 
              : 'text-purple-500'
          } font-semibold`}>
            {tokenSymbol}: {data.formattedBalance}
          </p>
        </div>
      );
    }
    return null;
  };

  const chartColor = tokenSymbol === 'LIKE' ? '#3B82F6' : '#8B5CF6';

  return (
    <div className={`${className}`}>
      {/* 时间范围选择器 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(timeRangeConfig).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setSelectedTimeRange(key as TimeRange)}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              selectedTimeRange === key
                ? `${tokenSymbol === 'LIKE' ? 'bg-blue-500 text-white' : 'bg-purple-500 text-white'}`
                : `${
                    isDark 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`
            }`}
          >
            {config.label}
          </button>
        ))}
      </div>

      {/* 图表 */}
      <div className="h-64">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke={isDark ? '#374151' : '#E5E7EB'} 
              />
              <XAxis
                dataKey="timestamp"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric'
                })}
                stroke={isDark ? '#9CA3AF' : '#6B7280'}
                fontSize={12}
              />
              <YAxis
                tickFormatter={(value) => formatNumber(value)}
                stroke={isDark ? '#9CA3AF' : '#6B7280'}
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="balance"
                stroke={chartColor}
                strokeWidth={2}
                dot={{ fill: chartColor, strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5, stroke: chartColor, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className={`h-full flex items-center justify-center ${
            isDark ? 'text-gray-400' : 'text-gray-500'
          }`}>
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p>No {tokenSymbol} balance change data available</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BalanceChart; 