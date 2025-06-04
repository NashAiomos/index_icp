import { format } from 'date-fns';

// 格式化数字，添加千位分隔符
export const formatNumber = (num: number | string): string => {
  if (num === null || num === undefined || num === '') {
    return '0';
  }
  
  // 如果是字符串，先移除下划线和逗号分隔符
  let cleanedNum = num.toString();
  cleanedNum = cleanedNum.replace(/[_,]/g, '');
  
  // 检查是否是有效的数字字符串
  if (!/^\d+(\.\d+)?$/.test(cleanedNum)) {
    return '0';
  }
  
  // 分离整数部分和小数部分
  const parts = cleanedNum.split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];
  
  // 从右到左添加千位分隔符
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  // 如果有小数部分，拼接起来
  return decimalPart !== undefined ? `${formattedInteger}.${decimalPart}` : formattedInteger;
};

// 格式化代币数量（考虑精度）
export const formatTokenAmount = (amount: any, decimals: number): string => {
  // 处理各种可能的输入类型
  let amountStr: string;
  
  if (!amount) {
    return '0';
  }
  
  if (Array.isArray(amount)) {
    // 如果是数组，取第一个元素
    amountStr = amount.length > 0 ? String(amount[0]) : '0';
  } else if (typeof amount === 'object') {
    // 如果是对象，尝试转换为字符串
    amountStr = amount.toString ? amount.toString() : '0';
  } else {
    // 其他情况，转换为字符串
    amountStr = String(amount);
  }
  
  // 移除字符串中的下划线（如果有的话）
  const cleanedAmount = amountStr.replace(/_/g, '');
  
  try {
    const value = BigInt(cleanedAmount);
    const divisor = BigInt(10 ** decimals);
    const integerPart = value / divisor;
    const fractionalPart = value % divisor;
    
    const integerStr = formatNumber(integerPart.toString());
    
    if (fractionalPart === BigInt(0)) {
      return integerStr;
    }
    
    const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
    const trimmedFractional = fractionalStr.replace(/0+$/, '');
    
    return `${integerStr}.${trimmedFractional}`;
  } catch (error) {
    console.error('Error formatting token amount:', error, 'Input:', amount);
    return '0';
  }
};

// 格式化地址，显示前后部分
export const formatAddress = (address: string, startLength: number = 12, endLength: number = 10): string => {
  if (!address) {
    return 'Unknown';
  }
  
  if (address.length <= startLength + endLength) {
    return address;
  }
  return `${address.slice(0, startLength)} ... ${address.slice(-endLength)}`;
};

// 格式化日期时间
export const formatDateTime = (timestamp: number): string => {
  // 如果时间戳是纳秒级的，转换为毫秒
  const date = timestamp > 1e12 ? new Date(timestamp / 1e6) : new Date(timestamp * 1000);
  return format(date, 'MMM d, yyyy HH:mm');
};

// 格式化相对时间
export const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const time = timestamp > 1e12 ? timestamp / 1e6 : timestamp * 1000;
  const diff = now - time;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else {
    return `${seconds} second${seconds > 1 ? 's' : ''} ago`;
  }
};

// 将账户对象转换为字符串
export const accountToString = (account: { owner: string; subaccount?: string | number[] | null }): string => {
  if (account.subaccount && account.subaccount !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
    // 处理数组格式的子账户
    if (Array.isArray(account.subaccount)) {
      const hasNonZero = account.subaccount.some(part => part !== 0 && String(part) !== '0');
      
      if (!hasNonZero) {
        return account.owner;
      }
      
      // 如果包含非零值，转换数组为字符串并返回完整地址
      const subaccountStr = account.subaccount.join(',');
      return `${account.owner}:${subaccountStr}`;
    }
    
    // 处理字符串格式的子账户
    if (typeof account.subaccount === 'string') {
      // 检查子账户是否为逗号分隔的格式
      if (account.subaccount.includes(',')) {
        // 分割子账户并检查是否全为0
        const subParts = account.subaccount.split(',');
        const hasNonZero = subParts.some(part => part !== '0' && part.trim() !== '');
        
        // 如果全为0，则只返回主地址
        if (!hasNonZero) {
          return account.owner;
        }
        
        // 如果包含非零值，返回完整地址
        return `${account.owner}:${account.subaccount}`;
      }
      
      // 原有的十六进制格式处理
      return `${account.owner}:${account.subaccount}`;
    }
  }
  
  return account.owner;
}; 