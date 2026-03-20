//! Conductor, TaskRunner, Cross-Task, Scan Queue commands
//!
//! Replaces: /api/conductor/*, /api/taskrunner, /api/cross-task/*,
//!           /api/scan-queue/*, /api/cli-task-registry

use rusqlite::params;
use serde::Deserialize;
use tauri::State;

use crate::state::AppState;
use super::brain_cmds::row_to_json;

// ============================================================================
// Conductor (replaces /api/conductor/*)
// ============================================================================

#[tauri::command]
pub async fn get_conductor_runs(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<serde_json::Value>, String> {
    let db = state.db()?;
    db.query_map(
        "SELECT * FROM conductor_runs WHERE project_id = ?1 ORDER BY created_at DESC",
        params![project_id],
        row_to_json,
    )
    .map_err(|e| format!("Failed to get conductor runs: {}", e))
}

#[tauri::command]
pub async fn get_conductor_status(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let db = state.db()?;

    let active_runs: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM conductor_runs WHERE project_id = ?1 AND status IN ('running', 'pending')",
            params![project_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let total_runs: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM conductor_runs WHERE project_id = ?1",
            params![project_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    Ok(serde_json::json!({
        "active_runs": active_runs,
        "total_runs": total_runs,
    }))
}

// ============================================================================
// Scan Queue (replaces /api/scan-queue/*)
// ============================================================================

#[tauri::command]
pub async fn get_scan_queue(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<serde_json::Value>, String> {
    let db = state.db()?;
    db.query_map(
        "SELECT * FROM scan_queue WHERE project_id = ?1 ORDER BY priority DESC, created_at ASC",
        params![project_id],
        row_to_json,
    )
    .map_err(|e| format!("Failed to get scan queue: {}", e))
}

#[derive(Debug, Deserialize)]
pub struct UpdateScanQueueArgs {
    pub id: String,
    pub status: String,
    pub progress: Option<i32>,
    pub progress_message: Option<String>,
}

#[tauri::command]
pub async fn update_scan_queue_item(
    args: UpdateScanQueueArgs,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let db = state.db()?;
    db.execute(
        "UPDATE scan_queue SET status = ?1, progress = ?2, progress_message = ?3, updated_at = datetime('now') WHERE id = ?4",
        params![args.status, args.progress.unwrap_or(0), args.progress_message, args.id],
    )
    .map_err(|e| format!("Failed to update scan queue: {}", e))?;

    Ok(serde_json::json!({ "success": true }))
}

// ============================================================================
// Cross-Task (replaces /api/cross-task/*)
// ============================================================================

#[tauri::command]
pub async fn get_cross_tasks(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<serde_json::Value>, String> {
    let db = state.db()?;
    db.query_map(
        "SELECT * FROM cross_tasks WHERE project_id = ?1 ORDER BY created_at DESC",
        params![project_id],
        row_to_json,
    )
    .map_err(|e| format!("Failed to get cross tasks: {}", e))
}

// ============================================================================
// Scan Notifications (replaces /api/scan-queue/notifications)
// ============================================================================

#[tauri::command]
pub async fn get_scan_notifications(
    project_id: String,
    unread_only: Option<bool>,
    state: State<'_, AppState>,
) -> Result<Vec<serde_json::Value>, String> {
    let db = state.db()?;

    let sql = if unread_only.unwrap_or(false) {
        "SELECT * FROM scan_notifications WHERE project_id = ?1 AND read = 0 ORDER BY created_at DESC"
    } else {
        "SELECT * FROM scan_notifications WHERE project_id = ?1 ORDER BY created_at DESC LIMIT 50"
    };

    db.query_map(sql, params![project_id], row_to_json)
        .map_err(|e| format!("Failed to get notifications: {}", e))
}
