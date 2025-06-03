// API 响应格式
export interface ApiResponse<T> {
  code: number;
  data: T | null;
  error: string | null;
}

// 代币信息
export interface Token {
  symbol: string;
  name: string;
  decimals: number;
  canister_id: string;
}

// 交易信息
export interface Transaction {
  _id?: {
    $oid: string;
  };
  index: number;
  kind: string;
  timestamp: number;
  // Transfer 类型的交易
  transfer?: {
    from: {
      owner: string;
      subaccount?: string | null;
    };
    to: {
      owner: string;
      subaccount?: string | null;
    };
    amount: string[];
    fee?: string[];
    memo?: string | null;
    created_at_time?: number | null;
    spender?: {
      owner: string;
      subaccount?: string | null;
    } | null;
  } | null;
  // Burn 类型的交易
  burn?: {
    from: {
      owner: string;
      subaccount?: string | null;
    };
    amount: string[];
    memo?: string | null;
    created_at_time?: number | null;
    spender?: {
      owner: string;
      subaccount?: string | null;
    };
  } | null;
  // Approve 类型的交易
  approve?: {
    from: {
      owner: string;
      subaccount?: string | null;
    };
    spender: {
      owner: string;
      subaccount?: string | null;
    };
    amount: string[];
    fee?: string[];
    memo?: string | null;
    created_at_time?: number | null;
    expected_allowance?: string[] | null;
    expires_at?: number | null;
  } | null;
  // Mint 类型的交易
  mint?: {
    to: {
      owner: string;
      subaccount?: string | null;
    };
    amount: string[];
    memo?: string | null;
    created_at_time?: number | null;
  } | null;
  // 为了向后兼容，保留这些字段但标记为可选
  from?: {
    owner: string;
    subaccount?: string | null;
  } | string;
  to?: {
    owner: string;
    subaccount?: string | null;
  } | string;
  amount?: string;
  fee?: string;
  memo?: string;
  created_at_time?: number;
  spender?: {
    owner: string;
    subaccount?: string | null;
  } | string;
  token?: string;
  token_name?: string;
  datetime?: string;
}

// 账户余额信息
export interface AccountBalance {
  account: string;
  balance: string;
  token: string;
  token_name: string;
  decimals: number;
}

// 交易范围查询结果
export interface TransactionRange {
  start: number;
  end: number;
  count: number;
  transactions: Transaction[];
}

// 代币统计信息（用于首页展示）
export interface TokenStats {
  symbol: string;
  name: string;
  totalTransactionCount: string;
  transactions24h: number;
  totalAddresses: number;
} 