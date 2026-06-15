//! Social, Integrations, Remote/Mesh commands
//!
//! Replaces: /api/social/*, /api/integrations/*, /api/remote/*

use rusqlite::params;
use serde::Deserialize;
use tauri::State;

use crate::state::AppState;
use super::brain_cmds::row_to_json;

// NOTE: get_social_configs / get_social_discoveries were removed — the
// social_configs / social_discoveries tables were dropped in the headless
// slim-down (migrations m047-m049 are now empty stubs), so the commands threw
// "no such table" at runtime and had no callers.

// ============================================================================
// Integrations (replaces /api/integrations/*)
// ============================================================================

#[tauri::command]
pub async fn get_integrations(
    state: State<'_, AppState>,
) -> Result<Vec<serde_json::Value>, String> {
    let db = state.db()?;
    db.query_map("SELECT * FROM integrations ORDER BY name", &[], row_to_json)
        .map_err(|e| format!("Failed to get integrations: {}", e))
}

#[tauri::command]
pub async fn get_integration_events(
    limit: Option<i64>,
    state: State<'_, AppState>,
) -> Result<Vec<serde_json::Value>, String> {
    let db = state.db()?;
    let limit = limit.unwrap_or(100);
    db.query_map(
        "SELECT * FROM integration_events ORDER BY created_at DESC LIMIT ?1",
        params![limit],
        row_to_json,
    )
    .map_err(|e| format!("Failed to get integration events: {}", e))
}

// ============================================================================
// Remote / Device Mesh (replaces /api/remote/*)
// ============================================================================

#[tauri::command]
pub async fn get_remote_devices(
    state: State<'_, AppState>,
) -> Result<Vec<serde_json::Value>, String> {
    let db = state.db()?;
    db.query_map("SELECT * FROM remote_devices ORDER BY last_seen DESC", &[], row_to_json)
        .map_err(|e| format!("Failed to get remote devices: {}", e))
}

#[tauri::command]
pub async fn get_remote_commands(
    device_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<serde_json::Value>, String> {
    let db = state.db()?;
    if let Some(did) = device_id {
        db.query_map(
            "SELECT * FROM remote_commands WHERE device_id = ?1 ORDER BY created_at DESC",
            params![did],
            row_to_json,
        )
    } else {
        db.query_map(
            "SELECT * FROM remote_commands ORDER BY created_at DESC LIMIT 50",
            &[],
            row_to_json,
        )
    }
    .map_err(|e| format!("Failed to get remote commands: {}", e))
}
