import axios, { AxiosError } from 'axios';
import { ApiResponse, Token, Transaction, AccountBalance, TransactionRange } from '../types';

// API 基础 URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://index-service.zkid.app/api';

// 创建 axios 实例
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// 带重试的请求包装器
async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0 && axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      // 只对网络错误和5xx错误重试
      if (!axiosError.response || axiosError.response.status >= 500) {
        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, 1000));
        return withRetry(fn, retries - 1);
      }
    }
    throw error;
  }
}

// API 服务类
export class ApiService {
  // 获取支持的代币列表
  static async getTokens(): Promise<Token[]> {
    const response = await withRetry(() => 
      apiClient.get<ApiResponse<Token[]>>('/tokens')
    );
    
    if (response.data.code === 200 && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to fetch tokens');
  }

  // 获取代币总供应量
  static async getTotalSupply(token?: string): Promise<string> {
    const params = token ? { token } : {};
    const response = await withRetry(() => 
      apiClient.get<ApiResponse<string>>('/total_supply', { params })
    );
    
    if (response.data.code === 200 && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to fetch total supply');
  }

  // 获取账户余额
  static async getBalance(account: string, token?: string): Promise<AccountBalance> {
    const params = token ? { token } : {};
    const response = await withRetry(() => 
      apiClient.get<ApiResponse<AccountBalance>>(`/balance/${account}`, { params })
    );
    
    if (response.data.code === 200 && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to fetch balance');
  }

  // 获取指定索引交易的完整详情
  static async getTransaction(index: number, token?: string): Promise<Transaction> {
    const params = token ? { token } : {};
    const response = await withRetry(() => 
      apiClient.get<ApiResponse<Transaction>>(`/transaction/${index}`, { params })
    );
    
    if (response.data.code === 200 && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to fetch transaction');
  }

  // 获取最新交易 - 不缓存，因为需要实时数据
  static async getLatestTransactions(limit: number = 20, token?: string): Promise<Transaction[]> {
    const params = { limit, ...(token && { token }) };
    const response = await withRetry(() => 
      apiClient.get<ApiResponse<Transaction[]>>('/latest_transactions', { params })
    );
    
    if (response.data.code === 200 && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to fetch latest transactions');
  }

  // 获取账户数量
  static async getAccountCount(token?: string): Promise<number> {
    const params = token ? { token } : {};
    const response = await withRetry(() => 
      apiClient.get<ApiResponse<number>>('/account_count', { params })
    );
    
    if (response.data.code === 200 && response.data.data !== null) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to fetch account count');
  }

  // 获取交易数量
  static async getTxCount(token?: string): Promise<number> {
    const params = token ? { token } : {};
    const response = await withRetry(() => 
      apiClient.get<ApiResponse<{ count: number; token: string; token_name: string }>>('/tx_count', { params })
    );
    
    if (response.data.code === 200 && response.data.data !== null) {
      return response.data.data.count;
    }
    throw new Error(response.data.error || 'Failed to fetch transaction count');
  }

  // 获取指定范围的交易
  static async getTransactionsByRange(start: number, end: number, limit: number = 300, token?: string): Promise<TransactionRange> {
    const params = { limit, ...(token && { token }) };
    const response = await withRetry(() => 
      apiClient.get<ApiResponse<TransactionRange>>(`/transactions_by_range/${start}/${end}`, { params })
    );
    
    if (response.data.code === 200 && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to fetch transactions by range');
  }

  // 搜索交易
  static async searchTransactions(query: any, limit: number = 50, skip: number = 0, token?: string): Promise<Transaction[]> {
    const params = { limit, skip, ...(token && { token }) };
    const response = await withRetry(() => 
      apiClient.post<ApiResponse<Transaction[]>>('/search', query, { params })
    );
    
    if (response.data.code === 200 && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to search transactions');
  }

  // 获取账户的交易列表
  static async getAccountTransactions(account: string, token?: string, limit: number = 50, skip: number = 0): Promise<{ transactions: Transaction[] }> {
    const params = { 
      ...(token && { token }),
      limit,
      skip
    };
    const response = await withRetry(() => 
      apiClient.get<ApiResponse<{ transactions: Transaction[] }>>(`/transactions/${account}`, { params })
    );
    
    if (response.data.code === 200 && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to fetch account transactions');
  }
} 