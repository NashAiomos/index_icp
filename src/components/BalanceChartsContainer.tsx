import React from 'react';
import BalanceChart from './BalanceChart';
import { Transaction, AccountBalance } from '../types';

interface BalanceChartsContainerProps {
  transactions: Transaction[];
  likeBalance: AccountBalance | null;
  vusdBalance: AccountBalance | null;
  address: string;
  isDark: boolean;
}

const BalanceChartsContainer: React.FC<BalanceChartsContainerProps> = ({
  transactions,
  likeBalance,
  vusdBalance,
  address,
  isDark
}) => {
  return (
    <div className={`${
      isDark 
        ? 'bg-dark-card border-dark-border' 
        : 'bg-white border-gray-200 shadow-sm'
    } border rounded-lg p-6`}>
      {/* 标题 */}
      <div className="flex items-center mb-6">
        <div className="w-8 h-8 rounded bg-orange-500/10 flex items-center justify-center mr-3">
          <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Account Balance Charts
        </h2>
      </div>

      {/* LIKE Balance Chart */}
      {likeBalance && (
        <div>
          <div className="flex items-center mb-4">
            <img 
              src="/logo_like.svg" 
              alt="LIKE Logo" 
              className="w-6 h-6 mr-2"
            />
            <h3 className={`text-lg font-semibold ${
              isDark ? 'text-blue-400' : 'text-blue-600'
            }`}>
              LIKE Balance History
            </h3>
            <span className={`ml-3 text-sm ${
              isDark ? 'text-gray-400' : 'text-gray-500'
            }`}>
              Current Balance: {(parseFloat(likeBalance.balance) / Math.pow(10, likeBalance.decimals)).toLocaleString()}
            </span>
          </div>
          <BalanceChart
            transactions={transactions}
            tokenSymbol="LIKE"
            currentBalance={likeBalance.balance}
            decimals={likeBalance.decimals}
            address={address}
            isDark={isDark}
          />
        </div>
      )}

      {/* VUSD Balance Chart */}
      {vusdBalance && (
        <div>
          <div className="flex items-center mb-4">
            <img 
              src="/logo_vusd.svg" 
              alt="vUSD Logo" 
              className="w-6 h-6 mr-2"
            />
            <h3 className={`text-lg font-semibold ${
              isDark ? 'text-purple-400' : 'text-purple-600'
            }`}>
              vUSD Balance History
            </h3>
            <span className={`ml-3 text-sm ${
              isDark ? 'text-gray-400' : 'text-gray-500'
            }`}>
              Current Balance: {(parseFloat(vusdBalance.balance) / Math.pow(10, vusdBalance.decimals)).toLocaleString()}
            </span>
          </div>
          <BalanceChart
            transactions={transactions}
            tokenSymbol="VUSD"
            currentBalance={vusdBalance.balance}
            decimals={vusdBalance.decimals}
            address={address}
            isDark={isDark}
          />
        </div>
      )}

      {/* No balance data message */}
      {!likeBalance && !vusdBalance && (
        <div className={`text-center py-8 ${
          isDark ? 'text-gray-400' : 'text-gray-500'
        }`}>
          <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p>No balance data available for charts</p>
        </div>
      )}
    </div>
  );
};

export default BalanceChartsContainer; 