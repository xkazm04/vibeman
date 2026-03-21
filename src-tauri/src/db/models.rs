//! Database models matching the existing SQLite schema.
//! These structs map 1:1 to the tables created by the Node.js app.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub path: String,
    pub slug: Option<String>,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Context {
    pub id: String,
    pub project_id: String,
    pub group_id: Option<String>,
    pub name: String,
    pub description: Option<String>,
    pub file_paths: String, // JSON array
    pub has_context_file: Option<i32>,
    pub context_file_path: Option<String>,
    pub preview: Option<String>,
    pub test_scenario: Option<String>,
    pub test_updated: Option<String>,
    pub target: Option<String>,
    pub target_fulfillment: Option<String>,
    pub implemented_tasks: Option<i32>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContextGroup {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub color: String,
    pub position: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Goal {
    pub id: String,
    pub project_id: String,
    pub context_id: Option<String>,
    pub order_index: i32,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Idea {
    pub id: String,
    pub scan_id: String,
    pub project_id: String,
    pub context_id: Option<String>,
    pub scan_type: Option<String>,
    pub category: String,
    pub title: String,
    pub description: Option<String>,
    pub reasoning: Option<String>,
    pub status: String,
    pub user_feedback: Option<String>,
    pub effort: Option<i32>,
    pub impact: Option<i32>,
    pub risk: Option<i32>,
    pub requirement_id: Option<String>,
    pub goal_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub implemented_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Event {
    pub id: String,
    pub project_id: String,
    pub title: String,
    pub description: String,
    pub r#type: String,
    pub agent: Option<String>,
    pub message: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Scan {
    pub id: String,
    pub project_id: String,
    pub scan_type: String,
    pub timestamp: String,
    pub summary: Option<String>,
    pub input_tokens: Option<i64>,
    pub output_tokens: Option<i64>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImplementationLog {
    pub id: String,
    pub project_id: String,
    pub context_id: Option<String>,
    pub requirement_name: String,
    pub title: String,
    pub overview: String,
    pub overview_bullets: Option<String>,
    pub tested: Option<i32>,
    pub screenshot: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: String,
    pub project_id: String,
    pub status: String,
    pub pid: Option<i64>,
    pub claude_session_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}
