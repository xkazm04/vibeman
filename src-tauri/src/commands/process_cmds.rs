use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::State;

use crate::process::{ProcessStatus, SpawnConfig};
use crate::state::AppState;

/// Arguments for spawning a CLI process
#[derive(Debug, Deserialize)]
pub struct SpawnCliArgs {
    /// CLI program: "claude", "gemini", or custom
    pub program: String,
    /// Working directory (project path)
    pub cwd: String,
    /// Prompt to send via stdin
    pub prompt: Option<String>,
    /// Additional CLI arguments
    pub args: Option<Vec<String>>,
    /// Environment variables
    pub env: Option<HashMap<String, String>>,
    /// Session ID (auto-generated if not provided)
    pub session_id: Option<String>,
    /// Project ID for context
    pub project_id: Option<String>,
    /// Provider (for selecting model/CLI variant)
    pub provider: Option<String>,
    /// Timeout in seconds (default: 6000 = 100 min)
    pub timeout_secs: Option<u64>,
}

#[derive(Debug, Serialize)]
pub struct SpawnResult {
    pub session_id: String,
    pub pid: u32,
}

/// Build the spawn config based on provider and program
fn build_spawn_config(args: SpawnCliArgs) -> SpawnConfig {
    let session_id = args
        .session_id
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

    let program = match args.program.as_str() {
        "claude" => {
            if cfg!(target_os = "windows") {
                "claude.cmd".to_string()
            } else {
                "claude".to_string()
            }
        }
        other => other.to_string(),
    };

    let mut cli_args = vec![
        "-p".to_string(),
        "-".to_string(),
        "--output-format".to_string(),
        "stream-json".to_string(),
        "--verbose".to_string(),
        "--dangerously-skip-permissions".to_string(),
    ];

    // Add any extra args
    if let Some(extra) = args.args {
        cli_args.extend(extra);
    }

    let mut env = args.env.unwrap_or_default();

    // Set MCP environment variables if project_id provided
    if let Some(ref pid) = args.project_id {
        env.insert("VIBEMAN_PROJECT_ID".to_string(), pid.clone());
    }

    // Remove ANTHROPIC_API_KEY to force web subscription auth (matching Node.js behavior)
    let env_remove = vec!["ANTHROPIC_API_KEY".to_string()];

    SpawnConfig {
        program,
        args: cli_args,
        cwd: args.cwd.into(),
        env,
        env_remove,
        stdin_input: args.prompt,
        timeout_secs: args.timeout_secs.unwrap_or(6000),
        session_id,
        project_id: args.project_id,
    }
}

/// Spawn a CLI process (Claude Code, Gemini, etc.)
#[tauri::command]
pub async fn spawn_cli(
    args: SpawnCliArgs,
    state: State<'_, AppState>,
) -> Result<SpawnResult, String> {
    let config = build_spawn_config(args);
    let (session_id, pid) = state.process_manager.spawn(config).await?;
    Ok(SpawnResult { session_id, pid })
}

/// Kill a running CLI process
#[tauri::command]
pub async fn kill_process(
    session_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state.process_manager.kill(&session_id).await
}

/// Get status of a CLI process
#[tauri::command]
pub async fn process_status(
    session_id: String,
    state: State<'_, AppState>,
) -> Result<Option<ProcessStatus>, String> {
    Ok(state.process_manager.status(&session_id).await)
}

/// List all active CLI processes
#[tauri::command]
pub async fn list_processes(
    state: State<'_, AppState>,
) -> Result<Vec<(String, u32, ProcessStatus)>, String> {
    Ok(state.process_manager.list_active().await)
}
