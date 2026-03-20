//! Lifecycle, Standup, Group Health, Context Management commands
//!
//! Replaces: /api/lifecycle/*, /api/standup/*, /api/group-health-scan/*,
//!           /api/context-generation/*, /api/context-files/*,
//!           /api/context-map/*, /api/context-group-relationships,
//!           /api/tinder/*, /api/workspaces/*, /api/external-requirements/*

use rusqlite::params;
use serde::Deserialize;
use tauri::State;

use crate::state::AppState;
use super::brain_cmds::row_to_json;

// ============================================================================
// Standup (replaces /api/standup/*)
// ============================================================================

#[tauri::command]
pub async fn get_standups(
    project_id: String,
    limit: Option<i64>,
    state: State<'_, AppState>,
) -> Result<Vec<serde_json::Value>, String> {
    let db = state.db()?;
    let limit = limit.unwrap_or(30);
    db.query_map(
        "SELECT * FROM standups WHERE project_id = ?1 ORDER BY created_at DESC LIMIT ?2",
        params![project_id, limit],
        row_to_json,
    )
    .map_err(|e| format!("Failed to get standups: {}", e))
}

// ============================================================================
// Group Health Scan (replaces /api/group-health-scan/*)
// ============================================================================

#[tauri::command]
pub async fn get_group_health_scans(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<serde_json::Value>, String> {
    let db = state.db()?;
    db.query_map(
        "SELECT * FROM group_health_scans WHERE project_id = ?1 ORDER BY created_at DESC",
        params![project_id],
        row_to_json,
    )
    .map_err(|e| format!("Failed to get health scans: {}", e))
}

// ============================================================================
// Context Group Relationships (replaces /api/context-group-relationships)
// ============================================================================

#[tauri::command]
pub async fn get_context_group_relationships(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<serde_json::Value>, String> {
    let db = state.db()?;
    db.query_map(
        "SELECT * FROM context_group_relationships WHERE project_id = ?1",
        params![project_id],
        row_to_json,
    )
    .map_err(|e| format!("Failed to get relationships: {}", e))
}

// ============================================================================
// External Requirements (replaces /api/external-requirements/*)
// ============================================================================

#[tauri::command]
pub async fn get_external_requirements(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<serde_json::Value>, String> {
    let db = state.db()?;
    db.query_map(
        "SELECT * FROM external_requirements WHERE project_id = ?1 ORDER BY created_at DESC",
        params![project_id],
        row_to_json,
    )
    .map_err(|e| format!("Failed to get external requirements: {}", e))
}

// ============================================================================
// Workspaces (replaces /api/workspaces/*)
// ============================================================================

#[tauri::command]
pub async fn get_workspaces(
    state: State<'_, AppState>,
) -> Result<Vec<serde_json::Value>, String> {
    let db = state.db()?;
    db.query_map("SELECT * FROM workspaces ORDER BY name", &[], row_to_json)
        .map_err(|e| format!("Failed to get workspaces: {}", e))
}

// ============================================================================
// Tinder/Idea Evaluation (replaces /api/tinder/*)
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct TinderActionArgs {
    pub idea_id: String,
    pub action: String, // "accept", "reject", "skip"
    pub feedback: Option<String>,
}

#[tauri::command]
pub async fn tinder_action(
    args: TinderActionArgs,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let db = state.db()?;

    let new_status = match args.action.as_str() {
        "accept" => "accepted",
        "reject" => "rejected",
        _ => return Ok(serde_json::json!({ "success": true, "skipped": true })),
    };

    let mut changes = db
        .execute(
            "UPDATE ideas SET status = ?1, updated_at = datetime('now') WHERE id = ?2",
            params![new_status, args.idea_id],
        )
        .map_err(|e| format!("Failed to update idea: {}", e))?;

    if let Some(feedback) = &args.feedback {
        let _ = db.execute(
            "UPDATE ideas SET user_feedback = ?1 WHERE id = ?2",
            params![feedback, args.idea_id],
        );
    }

    Ok(serde_json::json!({ "success": changes > 0, "status": new_status }))
}

#[tauri::command]
pub async fn get_tinder_items(
    project_id: String,
    context_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<serde_json::Value>, String> {
    let db = state.db()?;

    if let Some(cid) = context_id {
        db.query_map(
            "SELECT * FROM ideas WHERE project_id = ?1 AND context_id = ?2 AND status = 'pending' ORDER BY RANDOM() LIMIT 20",
            params![project_id, cid],
            row_to_json,
        )
    } else {
        db.query_map(
            "SELECT * FROM ideas WHERE project_id = ?1 AND status = 'pending' ORDER BY RANDOM() LIMIT 20",
            params![project_id],
            row_to_json,
        )
    }
    .map_err(|e| format!("Failed to get tinder items: {}", e))
}

// ============================================================================
// Dependency Scans (replaces /api/dependencies/*)
// ============================================================================

#[tauri::command]
pub async fn get_dependency_scans(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<serde_json::Value>, String> {
    let db = state.db()?;
    db.query_map(
        "SELECT * FROM dependency_scans WHERE project_id = ?1 ORDER BY created_at DESC",
        params![project_id],
        row_to_json,
    )
    .map_err(|e| format!("Failed to get dependency scans: {}", e))
}

// ============================================================================
// Template Discovery (replaces /api/template-discovery/*)
// ============================================================================

#[tauri::command]
pub async fn get_discovered_templates(
    project_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<serde_json::Value>, String> {
    let db = state.db()?;
    if let Some(pid) = project_id {
        db.query_map(
            "SELECT * FROM discovered_templates WHERE source_project_path LIKE ?1 AND stale = 0 ORDER BY template_name",
            params![format!("%{}%", pid)],
            row_to_json,
        )
    } else {
        db.query_map(
            "SELECT * FROM discovered_templates WHERE stale = 0 ORDER BY template_name",
            &[],
            row_to_json,
        )
    }
    .map_err(|e| format!("Failed to get templates: {}", e))
}
