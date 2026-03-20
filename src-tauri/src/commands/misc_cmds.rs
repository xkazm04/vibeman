//! Miscellaneous commands
//!
//! Replaces: /api/health/*, /api/system-status, /api/cache,
//!           /api/admin/*, /api/db/performance,
//!           /api/observability/*, /api/monitor/*,
//!           /api/generation-history, /api/hall-of-fame/*,
//!           /api/schema-intelligence/*, /api/diagnostics/*

use rusqlite::params;
use tauri::State;

use crate::state::AppState;
use super::brain_cmds::row_to_json;

// ============================================================================
// Health & System Status (replaces /api/health, /api/system-status)
// ============================================================================

#[tauri::command]
pub async fn get_system_status(
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let db_ok = state.db().is_ok();
    let uptime = (chrono::Utc::now() - state.started_at).num_seconds();

    let table_count: i64 = if let Ok(db) = state.db() {
        db.query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table'",
            &[],
            |row| row.get(0),
        )
        .unwrap_or(0)
    } else {
        0
    };

    Ok(serde_json::json!({
        "status": if db_ok { "healthy" } else { "degraded" },
        "database": db_ok,
        "uptime_seconds": uptime,
        "table_count": table_count,
        "version": env!("CARGO_PKG_VERSION"),
        "platform": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "runtime": "tauri-rust",
    }))
}

// ============================================================================
// DB Performance (replaces /api/db/performance)
// ============================================================================

#[tauri::command]
pub async fn get_db_performance(
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let db = state.db()?;

    let page_count: i64 = db
        .query_row("PRAGMA page_count", &[], |row| row.get(0))
        .unwrap_or(0);

    let page_size: i64 = db
        .query_row("PRAGMA page_size", &[], |row| row.get(0))
        .unwrap_or(0);

    let freelist_count: i64 = db
        .query_row("PRAGMA freelist_count", &[], |row| row.get(0))
        .unwrap_or(0);

    let db_size_bytes = page_count * page_size;

    Ok(serde_json::json!({
        "page_count": page_count,
        "page_size": page_size,
        "freelist_count": freelist_count,
        "db_size_bytes": db_size_bytes,
        "db_size_mb": db_size_bytes as f64 / (1024.0 * 1024.0),
        "journal_mode": "wal",
    }))
}

// ============================================================================
// Observability (replaces /api/observability/*)
// ============================================================================

#[tauri::command]
pub async fn get_observability_stats(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let db = state.db()?;

    let endpoint_count: i64 = db
        .query_row(
            "SELECT COUNT(DISTINCT endpoint) FROM obs_endpoint_stats WHERE project_id = ?1",
            params![project_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let total_calls: i64 = db
        .query_row(
            "SELECT COALESCE(SUM(call_count), 0) FROM obs_endpoint_stats WHERE project_id = ?1",
            params![project_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    Ok(serde_json::json!({
        "monitored_endpoints": endpoint_count,
        "total_calls": total_calls,
    }))
}

// ============================================================================
// Schema Intelligence (replaces /api/schema-intelligence/*)
// ============================================================================

#[tauri::command]
pub async fn get_schema_intelligence(
    state: State<'_, AppState>,
) -> Result<Vec<serde_json::Value>, String> {
    let db = state.db()?;
    db.query_map(
        "SELECT * FROM schema_intelligence_queries ORDER BY avg_duration_ms DESC LIMIT 50",
        &[],
        row_to_json,
    )
    .map_err(|e| format!("Failed to get schema intelligence: {}", e))
}

// ============================================================================
// Generation History (replaces /api/generation-history)
// ============================================================================

#[tauri::command]
pub async fn get_generation_history(
    project_id: String,
    limit: Option<i64>,
    state: State<'_, AppState>,
) -> Result<Vec<serde_json::Value>, String> {
    let db = state.db()?;
    let limit = limit.unwrap_or(50);
    db.query_map(
        "SELECT * FROM generation_history WHERE project_id = ?1 ORDER BY created_at DESC LIMIT ?2",
        params![project_id, limit],
        row_to_json,
    )
    .map_err(|e| format!("Failed to get generation history: {}", e))
}

// ============================================================================
// LLM Provider Health (replaces /api/health/llm-providers)
// ============================================================================

#[tauri::command]
pub async fn check_llm_providers() -> Result<serde_json::Value, String> {
    let anthropic = std::env::var("ANTHROPIC_API_KEY").is_ok();
    let openai = std::env::var("OPENAI_API_KEY").is_ok();
    let gemini = std::env::var("GEMINI_API_KEY").is_ok();
    let groq = std::env::var("GROQ_API_KEY").is_ok();
    let grok = std::env::var("GROK_API_KEY").is_ok() || std::env::var("XAI_API_KEY").is_ok();
    let ollama_url = std::env::var("OLLAMA_BASE_URL")
        .unwrap_or_else(|_| "http://localhost:11434".to_string());

    Ok(serde_json::json!({
        "anthropic": { "configured": anthropic },
        "openai": { "configured": openai },
        "gemini": { "configured": gemini },
        "groq": { "configured": groq },
        "grok": { "configured": grok },
        "ollama": { "url": ollama_url },
    }))
}
