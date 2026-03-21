//! Brain, Directions, Questions, Reflector, Collective Memory commands
//!
//! Replaces: /api/brain/*, /api/directions/*, /api/questions/*,
//!           /api/reflector/*, /api/collective-memory, /api/knowledge-base/*

use rusqlite::params;
use serde::Deserialize;
use tauri::State;

use crate::state::AppState;

// ============================================================================
// Brain (replaces /api/brain/*)
// ============================================================================

#[tauri::command]
pub async fn get_brain_dashboard(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let db = state.db()?;

    let signal_count: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM brain_signals WHERE project_id = ?1",
            params![project_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let insight_count: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM brain_insights WHERE project_id = ?1",
            params![project_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let anomaly_count: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM brain_anomalies WHERE project_id = ?1 AND status = 'active'",
            params![project_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    Ok(serde_json::json!({
        "signals": signal_count,
        "insights": insight_count,
        "active_anomalies": anomaly_count,
    }))
}

#[tauri::command]
pub async fn get_brain_signals(
    project_id: String,
    limit: Option<i64>,
    state: State<'_, AppState>,
) -> Result<Vec<serde_json::Value>, String> {
    let db = state.db()?;
    let limit = limit.unwrap_or(100);

    db.query_map(
        "SELECT * FROM brain_signals WHERE project_id = ?1 ORDER BY created_at DESC LIMIT ?2",
        params![project_id, limit],
        row_to_json,
    )
    .map_err(|e| format!("Failed to get signals: {}", e))
}

#[tauri::command]
pub async fn get_brain_insights(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<serde_json::Value>, String> {
    let db = state.db()?;
    db.query_map(
        "SELECT * FROM brain_insights WHERE project_id = ?1 ORDER BY created_at DESC",
        params![project_id],
        row_to_json,
    )
    .map_err(|e| format!("Failed to get insights: {}", e))
}

// ============================================================================
// Directions (replaces /api/directions/*)
// ============================================================================

#[tauri::command]
pub async fn get_directions(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<serde_json::Value>, String> {
    let db = state.db()?;
    db.query_map(
        "SELECT * FROM directions WHERE project_id = ?1 ORDER BY created_at DESC",
        params![project_id],
        row_to_json,
    )
    .map_err(|e| format!("Failed to get directions: {}", e))
}

#[tauri::command]
pub async fn get_direction_stats(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let db = state.db()?;

    let total: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM directions WHERE project_id = ?1",
            params![project_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let accepted: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM directions WHERE project_id = ?1 AND status = 'accepted'",
            params![project_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    Ok(serde_json::json!({
        "total": total,
        "accepted": accepted,
        "pending": total - accepted,
    }))
}

// ============================================================================
// Questions (replaces /api/questions/*)
// ============================================================================

#[tauri::command]
pub async fn get_questions(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<serde_json::Value>, String> {
    let db = state.db()?;
    db.query_map(
        "SELECT * FROM questions WHERE project_id = ?1 ORDER BY created_at DESC",
        params![project_id],
        row_to_json,
    )
    .map_err(|e| format!("Failed to get questions: {}", e))
}

// ============================================================================
// Collective Memory (replaces /api/collective-memory)
// ============================================================================

#[tauri::command]
pub async fn get_collective_memory(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<serde_json::Value>, String> {
    let db = state.db()?;
    db.query_map(
        "SELECT * FROM collective_memory WHERE project_id = ?1 ORDER BY created_at DESC",
        params![project_id],
        row_to_json,
    )
    .map_err(|e| format!("Failed to get collective memory: {}", e))
}

// ============================================================================
// Helper: convert any row to JSON dynamically
// ============================================================================

pub(super) fn row_to_json(row: &rusqlite::Row<'_>) -> rusqlite::Result<serde_json::Value> {
    let count = row.as_ref().column_count();
    let mut obj = serde_json::Map::new();
    for i in 0..count {
        let col_name = row.as_ref().column_name(i).unwrap_or("?").to_string();
        let value: serde_json::Value = match row.get_ref(i) {
            Ok(rusqlite::types::ValueRef::Null) => serde_json::Value::Null,
            Ok(rusqlite::types::ValueRef::Integer(n)) => serde_json::json!(n),
            Ok(rusqlite::types::ValueRef::Real(f)) => serde_json::json!(f),
            Ok(rusqlite::types::ValueRef::Text(s)) => {
                serde_json::Value::String(String::from_utf8_lossy(s).to_string())
            }
            Ok(rusqlite::types::ValueRef::Blob(b)) => {
                serde_json::Value::String(format!("<blob:{}>", b.len()))
            }
            Err(_) => serde_json::Value::Null,
        };
        obj.insert(col_name, value);
    }
    Ok(serde_json::Value::Object(obj))
}
