/**
 * 文件描述: 余额历史记录管理模块
 * 功能概述:
 * - 记录每个账户的余额变化历史
 * - 查询账户余额变化记录
 * - 支持按时间范围和分页查询
 */

use std::error::Error;
use mongodb::{Collection};
use mongodb::bson::{doc, Document};
use mongodb::options::{FindOptions, IndexOptions, FindOneOptions};
use log::{info, error, debug};
use crate::models::BalanceHistory;
use crate::utils::create_error;
use candid::Nat;

/// 保存余额变化记录
pub async fn save_balance_history(
    history_col: &Collection<Document>,
    account: &str,
    tx_index: u64,
    tx_type: &str,
    balance_before: &Nat,
    balance_after: &Nat,
    timestamp: u64,
) -> Result<(), Box<dyn Error>> {
    // 计算余额变化量
    let balance_change = if balance_after >= balance_before {
        // 余额增加，变化量为正
        let change = balance_after.clone() - balance_before.clone();
        format!("+{}", change.0)
    } else {
        // 余额减少，变化量为负
        let change = balance_before.clone() - balance_after.clone();
        format!("-{}", change.0)
    };
    
    let history = BalanceHistory {
        account: account.to_string(),
        tx_index,
        tx_type: tx_type.to_string(),
        balance_before: balance_before.0.to_string(),
        balance_after: balance_after.0.to_string(),
        balance_change,
        timestamp,
        created_at: chrono::Utc::now().timestamp(),
    };
    
    let history_doc = mongodb::bson::to_document(&history)?;
    
    match history_col.insert_one(history_doc, None).await {
        Ok(_) => {
            debug!("已记录账户 {} 的余额变化 (交易索引: {})", account, tx_index);
            Ok(())
        },
        Err(e) => {
            error!("保存余额历史记录失败: {}", e);
            Err(create_error(&format!("保存余额历史记录失败: {}", e)))
        }
    }
}

/// 查询账户余额历史记录
pub async fn get_balance_history(
    history_col: &Collection<Document>,
    account: &str,
    start_time: Option<u64>,
    end_time: Option<u64>,
    limit: Option<i64>,
    skip: Option<i64>,
    sort_order: Option<&str>,
) -> Result<Vec<Document>, Box<dyn Error>> {
    let mut filter = doc! { "account": account };
    
    // 添加时间范围过滤
    if start_time.is_some() || end_time.is_some() {
        let mut time_filter = Document::new();
        if let Some(start) = start_time {
            time_filter.insert("$gte", start as i64);
        }
        if let Some(end) = end_time {
            time_filter.insert("$lte", end as i64);
        }
        filter.insert("timestamp", time_filter);
    }
    
    // 设置查询选项
    let sort = match sort_order {
        Some("asc") => doc! { "timestamp": 1 },
        _ => doc! { "timestamp": -1 }, // 默认按时间倒序
    };
    
    let options = FindOptions::builder()
        .sort(sort)
        .limit(limit.unwrap_or(100))
        .skip(skip.unwrap_or(0) as u64)
        .build();
    
    let mut cursor = history_col.find(filter, options).await?;
    let mut results = Vec::new();
    
    while cursor.advance().await? {
        let doc = cursor.current();
        // 将RawDocumentBuf转换为Document
        let document = Document::try_from(doc.to_owned())?;
        results.push(document);
    }
    
    Ok(results)
}

/// 获取账户最新的余额记录
#[allow(dead_code)]
pub async fn get_latest_balance_record(
    history_col: &Collection<Document>,
    account: &str,
) -> Result<Option<Document>, Box<dyn Error>> {
    let filter = doc! { "account": account };
    let options = FindOneOptions::builder()
        .sort(doc! { "timestamp": -1 })
        .build();
    
    history_col.find_one(filter, options).await
        .map_err(|e| create_error(&format!("查询最新余额记录失败: {}", e)))
}

/// 创建余额历史集合的索引
pub async fn create_balance_history_indexes(
    history_col: &Collection<Document>,
) -> Result<(), Box<dyn Error>> {
    // 为账户创建索引
    let account_index = mongodb::IndexModel::builder()
        .keys(doc! { "account": 1 })
        .options(IndexOptions::builder().build())
        .build();
    
    // 为时间戳创建索引
    let timestamp_index = mongodb::IndexModel::builder()
        .keys(doc! { "timestamp": -1 })
        .options(IndexOptions::builder().build())
        .build();
    
    // 为账户和时间戳创建复合索引
    let compound_index = mongodb::IndexModel::builder()
        .keys(doc! { "account": 1, "timestamp": -1 })
        .options(IndexOptions::builder().build())
        .build();
    
    // 为交易索引创建索引
    let tx_index = mongodb::IndexModel::builder()
        .keys(doc! { "tx_index": 1 })
        .options(IndexOptions::builder().build())
        .build();
    
    match history_col.create_indexes(vec![
        account_index,
        timestamp_index,
        compound_index,
        tx_index,
    ], None).await {
        Ok(_) => {
            info!("余额历史集合索引创建成功");
            Ok(())
        },
        Err(e) => {
            error!("创建余额历史索引失败: {}", e);
            Err(create_error(&format!("创建余额历史索引失败: {}", e)))
        }
    }
}

/// 获取账户余额历史统计信息
pub async fn get_balance_history_stats(
    history_col: &Collection<Document>,
    account: &str,
) -> Result<Document, Box<dyn Error>> {
    // 获取记录总数
    let count = history_col.count_documents(doc! { "account": account }, None).await?;
    
    // 获取第一条记录
    let first_record = history_col.find_one(
        doc! { "account": account },
        FindOneOptions::builder()
            .sort(doc! { "timestamp": 1 })
            .build()
    ).await?;
    
    // 获取最后一条记录
    let last_record = history_col.find_one(
        doc! { "account": account },
        FindOneOptions::builder()
            .sort(doc! { "timestamp": -1 })
            .build()
    ).await?;
    
    let mut stats = doc! {
        "total_records": count as i64,
    };
    
    if let Some(first) = first_record {
        if let Ok(timestamp) = first.get_i64("timestamp") {
            stats.insert("first_record_time", timestamp);
        }
        if let Ok(balance) = first.get_str("balance_after") {
            stats.insert("initial_balance", balance);
        }
    }
    
    if let Some(last) = last_record {
        if let Ok(timestamp) = last.get_i64("timestamp") {
            stats.insert("last_record_time", timestamp);
        }
        if let Ok(balance) = last.get_str("balance_after") {
            stats.insert("current_balance", balance);
        }
    }
    
    Ok(stats)
}

/// 清空余额历史集合
pub async fn clear_balance_history(history_col: &Collection<Document>) -> Result<u64, Box<dyn Error>> {
    match history_col.delete_many(doc! {}, None).await {
        Ok(result) => {
            info!("已清除 {} 条余额历史记录", result.deleted_count);
            Ok(result.deleted_count)
        },
        Err(e) => {
            // 检查是否是命名空间不存在的错误
            if e.to_string().contains("NamespaceNotFound") || e.to_string().contains("ns not found") {
                info!("余额历史集合不存在，跳过清除操作");
                Ok(0)
            } else {
                error!("清除余额历史集合失败: {}", e);
                Err(create_error(&format!("清除余额历史集合失败: {}", e)))
            }
        }
    }
} 