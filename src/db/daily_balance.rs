/**
 * 文件描述: 每日余额聚合模块
 * 功能概述:
 * - 按天聚合账户余额变化
 * - 记录每天的最高、最低、结束余额
 * - 记录每天包含的交易信息
 * - 支持按时间范围和分页查询
 */

use std::error::Error;
use std::collections::HashMap;
use mongodb::{Collection};
use mongodb::bson::{doc, Document};
use mongodb::options::{FindOptions, IndexOptions, FindOneOptions, ReplaceOptions};
use log::{info, error, debug, warn};
use candid::Nat;
use chrono::{DateTime, NaiveDate};
use crate::models::{DailyBalanceRecord, Config, Transaction};
use crate::utils::create_error;

/// 从Unix时间戳（纳秒）获取UTC日期字符串
pub fn get_date_from_timestamp(timestamp_nanos: u64) -> String {
    let timestamp_secs = (timestamp_nanos / 1_000_000_000) as i64;
    match DateTime::from_timestamp(timestamp_secs, 0) {
        Some(dt) => dt.format("%Y-%m-%d").to_string(),
        None => {
            warn!("无效的时间戳: {}", timestamp_nanos);
            // 回退到默认日期
            "1970-01-01".to_string()
        }
    }
}

/// 解析日期字符串为NaiveDate
pub fn parse_date(date_str: &str) -> Result<NaiveDate, Box<dyn Error>> {
    NaiveDate::parse_from_str(date_str, "%Y-%m-%d")
        .map_err(|e| create_error(&format!("日期格式错误: {}", e)))
}

/// 验证日期字符串格式是否正确
pub fn validate_date_format(date_str: &str) -> bool {
    parse_date(date_str).is_ok()
}

/// 为账户在指定日期更新或创建每日余额记录
pub async fn update_daily_balance_record(
    daily_balance_col: &Collection<Document>,
    config: &Config,
    account: &str,
    date: &str,
    transactions_on_date: &[(u64, &Nat)], // (交易索引, 交易后余额)
) -> Result<(), Box<dyn Error>> {
    // 检查是否启用每日余额聚合功能
    if let Some(daily_balance_config) = &config.daily_balance {
        if !daily_balance_config.enabled {
            debug!("每日余额聚合功能已禁用，跳过记录账户 {} 的日期 {}", account, date);
            return Ok(());
        }
    } else {
        // 如果没有配置，默认启用
        debug!("未找到每日余额聚合配置，使用默认启用");
    }

    if transactions_on_date.is_empty() {
        debug!("账户 {} 在日期 {} 没有交易，跳过记录", account, date);
        return Ok(());
    }

    // 计算这一天的统计信息
    let mut min_balance = transactions_on_date[0].1.clone();
    let mut max_balance = transactions_on_date[0].1.clone();
    let mut min_balance_tx_index = transactions_on_date[0].0;
    let mut max_balance_tx_index = transactions_on_date[0].0;
    let end_balance = transactions_on_date.last().unwrap().1.clone();
    
    let mut transaction_indices = Vec::new();
    
    for &(tx_index, balance) in transactions_on_date {
        transaction_indices.push(tx_index);
        
        if balance < &min_balance {
            min_balance = balance.clone();
            min_balance_tx_index = tx_index;
        }
        if balance > &max_balance {
            max_balance = balance.clone();
            max_balance_tx_index = tx_index;
        }
    }
    
    // 判断余额最多的交易是否在余额最少的交易之前
    let max_before_min = max_balance_tx_index < min_balance_tx_index;
    
    let now = chrono::Utc::now().timestamp();
    
    let daily_record = DailyBalanceRecord {
        account: account.to_string(),
        date: date.to_string(),
        max_balance: max_balance.0.to_string(),
        min_balance: min_balance.0.to_string(),
        end_balance: end_balance.0.to_string(),
        max_before_min,
        transaction_indices,
        transaction_count: transactions_on_date.len() as u32,
        created_at: now,
        updated_at: now,
    };
    
    let record_doc = mongodb::bson::to_document(&daily_record)?;
    
    // 使用 upsert 更新或插入记录
    let filter = doc! {
        "account": account,
        "date": date
    };
    
    let options = ReplaceOptions::builder().upsert(true).build();
    
    match daily_balance_col.replace_one(filter, record_doc, options).await {
        Ok(_) => {
            info!("已更新账户 {} 在 {} 的每日余额记录: 包含 {} 笔交易，最高余额: {}，最低余额: {}，结束余额: {}", 
                  account, date, transactions_on_date.len(), max_balance.0, min_balance.0, end_balance.0);
            Ok(())
        },
        Err(e) => {
            error!("保存每日余额记录失败: {}", e);
            Err(create_error(&format!("保存每日余额记录失败: {}", e)))
        }
    }
}

/// 查询账户的每日余额记录
pub async fn get_daily_balance_records(
    daily_balance_col: &Collection<Document>,
    config: &Config,
    account: &str,
    start_date: Option<&str>,
    end_date: Option<&str>,
    limit: Option<i64>,
    skip: Option<i64>,
    sort_order: Option<&str>,
) -> Result<Vec<Document>, Box<dyn Error>> {
    // 检查是否启用每日余额聚合功能
    if let Some(daily_balance_config) = &config.daily_balance {
        if !daily_balance_config.enabled {
            warn!("每日余额聚合功能已禁用，返回空结果");
            return Ok(Vec::new());
        }
    }

    let mut filter = doc! { "account": account };
    
    // 添加日期范围过滤
    if start_date.is_some() || end_date.is_some() {
        let mut date_filter = Document::new();
        if let Some(start) = start_date {
            date_filter.insert("$gte", start);
        }
        if let Some(end) = end_date {
            date_filter.insert("$lte", end);
        }
        filter.insert("date", date_filter);
    }
    
    // 设置查询选项
    let sort = match sort_order {
        Some("asc") => doc! { "date": 1 },
        _ => doc! { "date": -1 }, // 默认按日期倒序
    };
    
    let options = FindOptions::builder()
        .sort(sort)
        .limit(limit.unwrap_or(100))
        .skip(skip.unwrap_or(0) as u64)
        .build();
    
    let mut cursor = daily_balance_col.find(filter, options).await?;
    let mut results = Vec::new();
    
    while cursor.advance().await? {
        let doc = cursor.current();
        let document = Document::try_from(doc.to_owned())?;
        results.push(document);
    }
    
    Ok(results)
}

/// 获取账户的每日余额统计信息
pub async fn get_daily_balance_stats(
    daily_balance_col: &Collection<Document>,
    config: &Config,
    account: &str,
) -> Result<Document, Box<dyn Error>> {
    // 检查是否启用每日余额聚合功能
    if let Some(daily_balance_config) = &config.daily_balance {
        if !daily_balance_config.enabled {
            warn!("每日余额聚合功能已禁用，返回空统计信息");
            return Ok(doc! {
                "total_days": 0i64,
                "message": "每日余额聚合功能已禁用"
            });
        }
    }

    // 获取记录总数
    let count = daily_balance_col.count_documents(doc! { "account": account }, None).await?;
    
    // 获取第一条记录（最早日期）
    let first_record = daily_balance_col.find_one(
        doc! { "account": account },
        FindOneOptions::builder()
            .sort(doc! { "date": 1 })
            .build()
    ).await?;
    
    // 获取最后一条记录（最晚日期）
    let last_record = daily_balance_col.find_one(
        doc! { "account": account },
        FindOneOptions::builder()
            .sort(doc! { "date": -1 })
            .build()
    ).await?;
    
    let mut stats = doc! {
        "total_days": count as i64,
    };
    
    if let Some(first) = first_record {
        if let Ok(date) = first.get_str("date") {
            stats.insert("first_date", date);
        }
        if let Ok(balance) = first.get_str("end_balance") {
            stats.insert("first_day_end_balance", balance);
        }
    }
    
    if let Some(last) = last_record {
        if let Ok(date) = last.get_str("date") {
            stats.insert("last_date", date);
        }
        if let Ok(balance) = last.get_str("end_balance") {
            stats.insert("last_day_end_balance", balance);
        }
    }
    
    Ok(stats)
}

/// 创建每日余额集合的索引
pub async fn create_daily_balance_indexes(
    daily_balance_col: &Collection<Document>,
    config: &Config,
) -> Result<(), Box<dyn Error>> {
    // 检查是否启用每日余额聚合功能
    if let Some(daily_balance_config) = &config.daily_balance {
        if !daily_balance_config.enabled {
            info!("每日余额聚合功能已禁用，跳过创建索引");
            return Ok(());
        }
    }

    // 为账户创建索引
    let account_index = mongodb::IndexModel::builder()
        .keys(doc! { "account": 1 })
        .options(IndexOptions::builder().build())
        .build();
    
    // 为日期创建索引
    let date_index = mongodb::IndexModel::builder()
        .keys(doc! { "date": -1 })
        .options(IndexOptions::builder().build())
        .build();
    
    // 为账户和日期创建复合唯一索引
    let compound_index = mongodb::IndexModel::builder()
        .keys(doc! { "account": 1, "date": 1 })
        .options(IndexOptions::builder().unique(true).build())
        .build();
    
    match daily_balance_col.create_indexes(vec![
        account_index,
        date_index,
        compound_index,
    ], None).await {
        Ok(_) => {
            info!("每日余额集合索引创建成功");
            Ok(())
        },
        Err(e) => {
            error!("创建每日余额索引失败: {}", e);
            Err(create_error(&format!("创建每日余额索引失败: {}", e)))
        }
    }
}

/// 清空每日余额集合
pub async fn clear_daily_balance(daily_balance_col: &Collection<Document>) -> Result<u64, Box<dyn Error>> {
    match daily_balance_col.delete_many(doc! {}, None).await {
        Ok(result) => {
            info!("已清除 {} 条每日余额记录", result.deleted_count);
            Ok(result.deleted_count)
        },
        Err(e) => {
            // 检查是否是命名空间不存在的错误
            if e.to_string().contains("NamespaceNotFound") || e.to_string().contains("ns not found") {
                info!("每日余额集合不存在，跳过清除操作");
                Ok(0)
            } else {
                error!("清除每日余额集合失败: {}", e);
                Err(create_error(&format!("清除每日余额集合失败: {}", e)))
            }
        }
    }
}

/// 重新计算账户的所有每日余额记录
/// 用于全量重建或修复数据
pub async fn recalculate_account_daily_balances(
    daily_balance_col: &Collection<Document>,
    tx_col: &Collection<Document>,
    config: &Config,
    account: &str,
    tx_indices: &[i64],
) -> Result<(), Box<dyn Error>> {
    info!("开始计算账户 {} 的每日余额记录，共 {} 笔交易", account, tx_indices.len());
    
    if tx_indices.is_empty() {
        debug!("账户 {} 没有交易记录，跳过每日余额计算", account);
        return Ok(());
    }

    // 首先清空该账户的现有每日余额记录
    let delete_result = daily_balance_col.delete_many(
        doc! { "account": account },
        None
    ).await?;
    
    if delete_result.deleted_count > 0 {
        info!("已清除账户 {} 的 {} 条现有每日余额记录", account, delete_result.deleted_count);
    }

    // 获取该账户的所有交易，按索引排序
    let filter = doc! { 
        "index": { "$in": tx_indices }
    };
    
    let options = FindOptions::builder()
        .sort(doc! { "index": 1 })
        .build();
    
    let mut tx_cursor = tx_col.find(filter, options).await?;
    
    // 按日期分组交易，同时计算每笔交易后的余额
    let mut daily_transactions: HashMap<String, Vec<(u64, Nat)>> = HashMap::new();
    let mut current_balance = Nat::from(0u64);
    let normalized_account = crate::db::balances::normalize_account_id(account);
    
    while tx_cursor.advance().await? {
        let doc = tx_cursor.current();
        let document = Document::try_from(doc.to_owned())?;
        let transaction: Transaction = mongodb::bson::from_document(document)?;
        
        if let Some(tx_index) = transaction.index {
            let date = get_date_from_timestamp(transaction.timestamp);
            
            // 根据交易类型计算余额变化
            let mut balance_changed = false;
            
            match transaction.kind.as_str() {
                "transfer" => {
                    if let Some(transfer) = &transaction.transfer {
                        let from_account = crate::db::balances::normalize_account_id(&transfer.from.to_string());
                        let to_account = crate::db::balances::normalize_account_id(&transfer.to.to_string());
                        
                        // 如果是发送方，减少余额
                        if from_account == normalized_account {
                            // 减去转账金额
                            if current_balance >= transfer.amount {
                                current_balance = current_balance.clone() - transfer.amount.clone();
                            } else {
                                warn!("账户 {} 余额不足，转账金额 {} 大于当前余额 {}", 
                                      normalized_account, transfer.amount, current_balance);
                                current_balance = Nat::from(0u64);
                            }
                            balance_changed = true;
                            
                            // 减去手续费
                            if let Some(fee) = &transfer.fee {
                                if current_balance >= *fee {
                                    current_balance = current_balance.clone() - fee.clone();
                                } else {
                                    warn!("账户 {} 余额不足支付手续费 {}", normalized_account, fee);
                                    current_balance = Nat::from(0u64);
                                }
                            }
                        }
                        
                        // 如果是接收方，增加余额
                        if to_account == normalized_account {
                            current_balance = current_balance.clone() + transfer.amount.clone();
                            balance_changed = true;
                        }
                    }
                },
                "mint" => {
                    if let Some(mint) = &transaction.mint {
                        let to_account = crate::db::balances::normalize_account_id(&mint.to.to_string());
                        
                        if to_account == normalized_account {
                            current_balance = current_balance.clone() + mint.amount.clone();
                            balance_changed = true;
                        }
                    }
                },
                "burn" => {
                    if let Some(burn) = &transaction.burn {
                        let from_account = crate::db::balances::normalize_account_id(&burn.from.to_string());
                        
                        if from_account == normalized_account {
                            if current_balance >= burn.amount {
                                current_balance = current_balance.clone() - burn.amount.clone();
                            } else {
                                warn!("账户 {} 余额不足，销毁金额 {} 大于当前余额 {}", 
                                      normalized_account, burn.amount, current_balance);
                                current_balance = Nat::from(0u64);
                            }
                            balance_changed = true;
                        }
                    }
                },
                "approve" => {
                    if let Some(approve) = &transaction.approve {
                        let from_account = crate::db::balances::normalize_account_id(&approve.from.to_string());
                        
                        if from_account == normalized_account {
                            // 授权交易只影响手续费
                            if let Some(fee) = &approve.fee {
                                if current_balance >= *fee {
                                    current_balance = current_balance.clone() - fee.clone();
                                } else {
                                    warn!("账户 {} 余额不足支付授权手续费 {}", normalized_account, fee);
                                    current_balance = Nat::from(0u64);
                                }
                                balance_changed = true;
                            }
                        }
                    }
                },
                _ => {
                    // 其他交易类型，暂时跳过
                    debug!("跳过未知交易类型: {} (索引: {})", transaction.kind, tx_index);
                }
            }
            
            // 如果余额发生变化，记录到对应日期
            if balance_changed {
                daily_transactions
                    .entry(date)
                    .or_insert_with(Vec::new)
                    .push((tx_index, current_balance.clone()));
            }
        }
    }
    
    // 为每一天创建或更新记录
    let mut processed_days = 0;
    let mut processed_transactions = 0;
    
    info!("开始处理账户 {} 的每日余额记录，共 {} 天有交易", account, daily_transactions.len());
    
    for (date, transactions) in daily_transactions {
        if !transactions.is_empty() {
            let transactions_ref: Vec<(u64, &Nat)> = transactions.iter()
                .map(|(idx, balance)| (*idx, balance))
                .collect();
            
            match update_daily_balance_record(
                daily_balance_col,
                config,
                account,
                &date,
                &transactions_ref,
            ).await {
                Ok(_) => {
                    processed_days += 1;
                    processed_transactions += transactions.len();
                    debug!("已更新账户 {} 日期 {} 的每日余额记录，包含 {} 笔交易", 
                           account, date, transactions.len());
                },
                Err(e) => {
                    error!("更新账户 {} 日期 {} 的每日余额记录失败: {}", account, date, e);
                    return Err(e);
                }
            }
        }
    }
    
    info!("完成账户 {} 的每日余额记录计算: 处理 {} 天，共 {} 笔交易", account, processed_days, processed_transactions);
    Ok(())
} 