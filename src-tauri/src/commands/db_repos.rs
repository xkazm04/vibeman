//! Typed database repository commands
//!
//! These replace the 50+ TypeScript repositories in src/app/db/repositories/
//! with strongly-typed Rust Tauri commands for each domain.
//!
//! Replaces routes: /api/projects, /api/contexts, /api/context-groups,
//!   /api/goals, /api/ideas, /api/events, /api/scans,
//!   /api/implementation-log, /api/implementation-logs

use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::state::AppState;

// ============================================================================
// Projects (replaces /api/projects)
// ============================================================================

#[tauri::command]
pub async fn get_projects(state: State<'_, AppState>) -> Result<Vec<serde_json::Value>, String> {
    let db = state.db()?;
    db.query_map(
        "SELECT * FROM projects ORDER BY updated_at DESC",
        &[],
        |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "path": row.get::<_, String>(2)?,
                "slug": row.get::<_, Option<String>>(3)?,
                "description": row.get::<_, Option<String>>(4)?,
                "created_at": row.get::<_, String>(5)?,
                "updated_at": row.get::<_, String>(6)?,
            }))
        },
    )
    .map_err(|e| format!("Failed to get projects: {}", e))
}

#[derive(Debug, Deserialize)]
pub struct CreateProjectArgs {
    pub id: String,
    pub name: String,
    pub path: String,
    pub slug: Option<String>,
    pub description: Option<String>,
}

#[tauri::command]
pub async fn create_project(
    args: CreateProjectArgs,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let db = state.db()?;
    db.execute(
        "INSERT INTO projects (id, name, path, slug, description, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'), datetime('now'))",
        params![args.id, args.name, args.path, args.slug, args.description],
    )
    .map_err(|e| format!("Failed to create project: {}", e))?;

    Ok(serde_json::json!({ "id": args.id, "success": true }))
}

// ============================================================================
// Contexts (replaces /api/contexts)
// ============================================================================

#[tauri::command]
pub async fn get_contexts(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<serde_json::Value>, String> {
    let db = state.db()?;
    db.query_map(
        "SELECT id, project_id, group_id, name, description, file_paths, has_context_file, context_file_path, preview, test_scenario, test_updated, target, target_fulfillment, implemented_tasks, created_at, updated_at FROM contexts WHERE project_id = ?1 ORDER BY name",
        params![project_id],
        |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "project_id": row.get::<_, String>(1)?,
                "group_id": row.get::<_, Option<String>>(2)?,
                "name": row.get::<_, String>(3)?,
                "description": row.get::<_, Option<String>>(4)?,
                "file_paths": row.get::<_, String>(5)?,
                "has_context_file": row.get::<_, Option<i32>>(6)?,
                "context_file_path": row.get::<_, Option<String>>(7)?,
                "preview": row.get::<_, Option<String>>(8)?,
                "test_scenario": row.get::<_, Option<String>>(9)?,
                "test_updated": row.get::<_, Option<String>>(10)?,
                "target": row.get::<_, Option<String>>(11)?,
                "target_fulfillment": row.get::<_, Option<String>>(12)?,
                "implemented_tasks": row.get::<_, Option<i32>>(13)?,
                "created_at": row.get::<_, String>(14)?,
                "updated_at": row.get::<_, String>(15)?,
            }))
        },
    )
    .map_err(|e| format!("Failed to get contexts: {}", e))
}

// ============================================================================
// Context Groups (replaces /api/context-groups)
// ============================================================================

#[tauri::command]
pub async fn get_context_groups(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<serde_json::Value>, String> {
    let db = state.db()?;
    db.query_map(
        "SELECT * FROM context_groups WHERE project_id = ?1 ORDER BY position",
        params![project_id],
        |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "project_id": row.get::<_, String>(1)?,
                "name": row.get::<_, String>(2)?,
                "color": row.get::<_, String>(3)?,
                "position": row.get::<_, i32>(4)?,
                "created_at": row.get::<_, String>(5)?,
                "updated_at": row.get::<_, String>(6)?,
            }))
        },
    )
    .map_err(|e| format!("Failed to get context groups: {}", e))
}

// ============================================================================
// Goals (replaces /api/goals)
// ============================================================================

#[tauri::command]
pub async fn get_goals(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<serde_json::Value>, String> {
    let db = state.db()?;
    db.query_map(
        "SELECT id, project_id, context_id, order_index, title, description, status, created_at, updated_at FROM goals WHERE project_id = ?1 ORDER BY order_index",
        params![project_id],
        |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "project_id": row.get::<_, String>(1)?,
                "context_id": row.get::<_, Option<String>>(2)?,
                "order_index": row.get::<_, i32>(3)?,
                "title": row.get::<_, String>(4)?,
                "description": row.get::<_, Option<String>>(5)?,
                "status": row.get::<_, String>(6)?,
                "created_at": row.get::<_, String>(7)?,
                "updated_at": row.get::<_, String>(8)?,
            }))
        },
    )
    .map_err(|e| format!("Failed to get goals: {}", e))
}

// ============================================================================
// Ideas (replaces /api/ideas)
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct GetIdeasArgs {
    pub project_id: String,
    pub status: Option<String>,
    pub context_id: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[tauri::command]
pub async fn get_ideas(
    args: GetIdeasArgs,
    state: State<'_, AppState>,
) -> Result<Vec<serde_json::Value>, String> {
    let db = state.db()?;

    let mut sql = String::from(
        "SELECT id, scan_id, project_id, context_id, scan_type, category, title, description, reasoning, status, user_feedback, effort, impact, risk, requirement_id, goal_id, created_at, updated_at, implemented_at FROM ideas WHERE project_id = ?1"
    );
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = vec![Box::new(args.project_id)];

    if let Some(ref status) = args.status {
        sql.push_str(&format!(" AND status = ?{}", param_values.len() + 1));
        param_values.push(Box::new(status.clone()));
    }
    if let Some(ref context_id) = args.context_id {
        sql.push_str(&format!(" AND context_id = ?{}", param_values.len() + 1));
        param_values.push(Box::new(context_id.clone()));
    }

    sql.push_str(" ORDER BY created_at DESC");

    if let Some(limit) = args.limit {
        sql.push_str(&format!(" LIMIT {}", limit));
    }
    if let Some(offset) = args.offset {
        sql.push_str(&format!(" OFFSET {}", offset));
    }

    let param_refs: Vec<&dyn rusqlite::types::ToSql> =
        param_values.iter().map(|p| p.as_ref()).collect();

    db.query_map(&sql, param_refs.as_slice(), |row| {
        Ok(serde_json::json!({
            "id": row.get::<_, String>(0)?,
            "scan_id": row.get::<_, String>(1)?,
            "project_id": row.get::<_, String>(2)?,
            "context_id": row.get::<_, Option<String>>(3)?,
            "scan_type": row.get::<_, Option<String>>(4)?,
            "category": row.get::<_, String>(5)?,
            "title": row.get::<_, String>(6)?,
            "description": row.get::<_, Option<String>>(7)?,
            "reasoning": row.get::<_, Option<String>>(8)?,
            "status": row.get::<_, String>(9)?,
            "user_feedback": row.get::<_, Option<String>>(10)?,
            "effort": row.get::<_, Option<i32>>(11)?,
            "impact": row.get::<_, Option<i32>>(12)?,
            "risk": row.get::<_, Option<i32>>(13)?,
            "requirement_id": row.get::<_, Option<String>>(14)?,
            "goal_id": row.get::<_, Option<String>>(15)?,
            "created_at": row.get::<_, String>(16)?,
            "updated_at": row.get::<_, String>(17)?,
            "implemented_at": row.get::<_, Option<String>>(18)?,
        }))
    })
    .map_err(|e| format!("Failed to get ideas: {}", e))
}

#[derive(Debug, Deserialize)]
pub struct UpdateIdeaStatusArgs {
    pub id: String,
    pub status: String,
}

#[tauri::command]
pub async fn update_idea_status(
    args: UpdateIdeaStatusArgs,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let db = state.db()?;
    let changes = db
        .execute(
            "UPDATE ideas SET status = ?1, updated_at = datetime('now') WHERE id = ?2",
            params![args.status, args.id],
        )
        .map_err(|e| format!("Failed to update idea: {}", e))?;

    Ok(serde_json::json!({ "changes": changes, "success": changes > 0 }))
}

// ============================================================================
// Events (replaces /api/events/stream, event creation)
// ============================================================================

#[tauri::command]
pub async fn get_events(
    project_id: String,
    limit: Option<i64>,
    state: State<'_, AppState>,
) -> Result<Vec<serde_json::Value>, String> {
    let db = state.db()?;
    let limit = limit.unwrap_or(50);

    db.query_map(
        "SELECT id, project_id, title, description, type, agent, message, created_at FROM events WHERE project_id = ?1 ORDER BY created_at DESC LIMIT ?2",
        params![project_id, limit],
        |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "project_id": row.get::<_, String>(1)?,
                "title": row.get::<_, String>(2)?,
                "description": row.get::<_, String>(3)?,
                "type": row.get::<_, String>(4)?,
                "agent": row.get::<_, Option<String>>(5)?,
                "message": row.get::<_, Option<String>>(6)?,
                "created_at": row.get::<_, String>(7)?,
            }))
        },
    )
    .map_err(|e| format!("Failed to get events: {}", e))
}

#[derive(Debug, Deserialize)]
pub struct CreateEventArgs {
    pub id: String,
    pub project_id: String,
    pub title: String,
    pub description: String,
    pub event_type: String,
    pub agent: Option<String>,
    pub message: Option<String>,
}

#[tauri::command]
pub async fn create_event(
    args: CreateEventArgs,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let db = state.db()?;
    db.execute(
        "INSERT INTO events (id, project_id, title, description, type, agent, message, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, datetime('now'))",
        params![args.id, args.project_id, args.title, args.description, args.event_type, args.agent, args.message],
    )
    .map_err(|e| format!("Failed to create event: {}", e))?;

    Ok(serde_json::json!({ "id": args.id, "success": true }))
}

// ============================================================================
// Implementation Logs (replaces /api/implementation-logs)
// ============================================================================

#[tauri::command]
pub async fn get_implementation_logs(
    project_id: String,
    untested_only: Option<bool>,
    state: State<'_, AppState>,
) -> Result<Vec<serde_json::Value>, String> {
    let db = state.db()?;

    let sql = if untested_only.unwrap_or(false) {
        "SELECT id, project_id, context_id, requirement_name, title, overview, overview_bullets, tested, screenshot, created_at FROM implementation_log WHERE project_id = ?1 AND (tested IS NULL OR tested = 0) ORDER BY created_at DESC"
    } else {
        "SELECT id, project_id, context_id, requirement_name, title, overview, overview_bullets, tested, screenshot, created_at FROM implementation_log WHERE project_id = ?1 ORDER BY created_at DESC"
    };

    db.query_map(sql, params![project_id], |row| {
        Ok(serde_json::json!({
            "id": row.get::<_, String>(0)?,
            "project_id": row.get::<_, String>(1)?,
            "context_id": row.get::<_, Option<String>>(2)?,
            "requirement_name": row.get::<_, String>(3)?,
            "title": row.get::<_, String>(4)?,
            "overview": row.get::<_, String>(5)?,
            "overview_bullets": row.get::<_, Option<String>>(6)?,
            "tested": row.get::<_, Option<i32>>(7)?,
            "screenshot": row.get::<_, Option<String>>(8)?,
            "created_at": row.get::<_, String>(9)?,
        }))
    })
    .map_err(|e| format!("Failed to get implementation logs: {}", e))
}

// ============================================================================
// Scans (replaces /api/scans)
// ============================================================================

#[tauri::command]
pub async fn get_scans(
    project_id: String,
    limit: Option<i64>,
    state: State<'_, AppState>,
) -> Result<Vec<serde_json::Value>, String> {
    let db = state.db()?;
    let limit = limit.unwrap_or(50);

    db.query_map(
        "SELECT id, project_id, scan_type, timestamp, summary, input_tokens, output_tokens, created_at FROM scans WHERE project_id = ?1 ORDER BY timestamp DESC LIMIT ?2",
        params![project_id, limit],
        |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "project_id": row.get::<_, String>(1)?,
                "scan_type": row.get::<_, String>(2)?,
                "timestamp": row.get::<_, String>(3)?,
                "summary": row.get::<_, Option<String>>(4)?,
                "input_tokens": row.get::<_, Option<i64>>(5)?,
                "output_tokens": row.get::<_, Option<i64>>(6)?,
                "created_at": row.get::<_, String>(7)?,
            }))
        },
    )
    .map_err(|e| format!("Failed to get scans: {}", e))
}
