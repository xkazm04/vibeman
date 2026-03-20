//! Claude Code CLI execution commands
//!
//! Replaces /api/claude-code/execute, /api/claude-terminal/query,
//! and /api/claude-terminal/stream with direct Tauri IPC.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::{AppHandle, Emitter, State};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::Command;

use crate::process::StreamEvent;
use crate::state::AppState;

/// Arguments matching the terminal strategy's POST body
#[derive(Debug, Deserialize)]
pub struct ExecuteClaudeArgs {
    pub project_path: String,
    pub prompt: String,
    pub resume_session_id: Option<String>,
    pub provider: Option<String>,
    pub model: Option<String>,
    pub extra_env: Option<HashMap<String, String>>,
    pub project_id: Option<String>,
    pub task_id: Option<String>,
    pub timeout_secs: Option<u64>,
    // Wave 2: CLI v2.1+ flags
    /// Item 15: Named session (--name)
    pub session_name: Option<String>,
    /// Item 15: Resume by PR (--from-pr)
    pub from_pr: Option<String>,
    /// Item 16: Structured output schema (--json-schema)
    pub json_schema: Option<String>,
    /// Item 18: Effort level (--effort low|medium|high|max), default: medium
    pub effort: Option<String>,
    /// Item 4: CLI-native worktree isolation (--worktree)
    pub use_worktree: Option<bool>,
    /// Item 17: Max budget in USD (--max-budget-usd)
    pub max_budget_usd: Option<f64>,
    /// Item 5: Max agentic turns (--max-turns)
    pub max_turns: Option<u32>,
    /// Additional --settings JSON to pass to CLI
    pub cli_settings: Option<String>,
}

/// Result returned immediately when execution starts
#[derive(Debug, Serialize)]
pub struct ExecuteResult {
    pub execution_id: String,
    pub pid: u32,
}

/// Events emitted to frontend during execution
#[derive(Debug, Clone, Serialize)]
pub struct ExecutionEvent {
    pub execution_id: String,
    pub event_type: String,
    pub data: serde_json::Value,
}

/// Start a Claude Code CLI execution with real-time event streaming.
///
/// Replaces:
/// - POST /api/claude-terminal/query (start execution)
/// - GET /api/claude-terminal/stream (SSE streaming)
///
/// Events are emitted via Tauri's event system as "claude-execution-event".
#[tauri::command]
pub async fn execute_claude(
    args: ExecuteClaudeArgs,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<ExecuteResult, String> {
    let execution_id = uuid::Uuid::new_v4().to_string();

    // Determine the CLI command based on provider
    let (program, cli_args) = build_cli_command(&args);

    let mut cmd = Command::new(&program);
    cmd.args(&cli_args)
        .current_dir(&args.project_path)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .stdin(std::process::Stdio::piped());

    // Set MCP environment variables
    let mut env = args.extra_env.unwrap_or_default();
    if let Some(ref pid) = args.project_id {
        env.insert("VIBEMAN_PROJECT_ID".to_string(), pid.clone());
    }
    if let Some(ref tid) = args.task_id {
        env.insert("VIBEMAN_TASK_ID".to_string(), tid.clone());
    }
    env.insert(
        "VIBEMAN_HOOK_SECRET".to_string(),
        uuid::Uuid::new_v4().to_string(),
    );

    for (key, value) in &env {
        cmd.env(key, value);
    }

    // Remove API key to force web subscription auth
    cmd.env_remove("ANTHROPIC_API_KEY");

    // Windows: create in new process group
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x00000200); // CREATE_NEW_PROCESS_GROUP
    }

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Failed to spawn {}: {}", program, e))?;

    let pid = child.id().unwrap_or(0);

    // Send prompt via stdin
    if let Some(mut stdin) = child.stdin.take() {
        let prompt = args.prompt.clone();
        tokio::spawn(async move {
            let _: Result<(), std::io::Error> = async {
                stdin.write_all(prompt.as_bytes()).await?;
                stdin.shutdown().await?;
                Ok(())
            }.await;
        });
    }

    // Spawn background task to read stdout and emit events
    let exec_id = execution_id.clone();
    let app_handle = app.clone();

    if let Some(stdout) = child.stdout.take() {
        let exec_id_stdout = exec_id.clone();
        let app_stdout = app_handle.clone();
        tokio::spawn(async move {
            let reader = BufReader::new(stdout);
            let mut lines = reader.lines();

            while let Ok(Some(line)) = lines.next_line().await {
                // Try to parse as stream-json
                let data = if let Some(event) = StreamEvent::parse_line(&line) {
                    serde_json::to_value(&event).unwrap_or(serde_json::json!({"raw": line}))
                } else {
                    serde_json::json!({"raw": line})
                };

                let _ = app_stdout.emit(
                    "claude-execution-event",
                    ExecutionEvent {
                        execution_id: exec_id_stdout.clone(),
                        event_type: "data".to_string(),
                        data,
                    },
                );
            }

            // Emit completion event
            let _ = app_stdout.emit(
                "claude-execution-event",
                ExecutionEvent {
                    execution_id: exec_id_stdout,
                    event_type: "stdout_end".to_string(),
                    data: serde_json::json!(null),
                },
            );
        });
    }

    // Spawn background task to read stderr
    if let Some(stderr) = child.stderr.take() {
        let exec_id_stderr = exec_id.clone();
        let app_stderr = app_handle.clone();
        tokio::spawn(async move {
            let reader = BufReader::new(stderr);
            let mut lines = reader.lines();

            while let Ok(Some(line)) = lines.next_line().await {
                let _ = app_stderr.emit(
                    "claude-execution-event",
                    ExecutionEvent {
                        execution_id: exec_id_stderr.clone(),
                        event_type: "stderr".to_string(),
                        data: serde_json::json!({"message": line}),
                    },
                );
            }
        });
    }

    // Spawn background task to wait for process completion
    let exec_id_wait = exec_id.clone();
    let app_wait = app_handle;
    tokio::spawn(async move {
        let result: Result<std::process::ExitStatus, std::io::Error> = child.wait().await;
        match result {
            Ok(exit_status) => {
                let code: i32 = exit_status.code().unwrap_or(-1);
                let success: bool = exit_status.success();
                let _ = app_wait.emit(
                    "claude-execution-event",
                    ExecutionEvent {
                        execution_id: exec_id_wait,
                        event_type: "completed".to_string(),
                        data: serde_json::json!({
                            "exit_code": code,
                            "success": success,
                        }),
                    },
                );
            }
            Err(err) => {
                let msg: String = err.to_string();
                let _ = app_wait.emit(
                    "claude-execution-event",
                    ExecutionEvent {
                        execution_id: exec_id_wait,
                        event_type: "error".to_string(),
                        data: serde_json::json!({"error": msg}),
                    },
                );
            }
        }
    });

    // Track in process manager
    log::info!(
        "Started Claude execution {} (PID: {}) in {}",
        execution_id,
        pid,
        args.project_path
    );

    Ok(ExecuteResult {
        execution_id,
        pid,
    })
}

/// Abort a running execution
#[tauri::command]
pub async fn abort_claude(
    execution_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state.process_manager.kill(&execution_id).await
}

/// Build CLI command and arguments based on provider.
/// Supports Claude Code CLI v2.1+ flags (Wave 2).
fn build_cli_command(args: &ExecuteClaudeArgs) -> (String, Vec<String>) {
    let provider = args.provider.as_deref().unwrap_or("claude");

    match provider {
        "claude" | "" => {
            let program = if cfg!(target_os = "windows") {
                "claude.cmd".to_string()
            } else {
                "claude".to_string()
            };

            let mut cli_args = vec![
                "-p".to_string(),
                "-".to_string(),
                "--output-format".to_string(),
                "stream-json".to_string(),
                "--verbose".to_string(),
                "--dangerously-skip-permissions".to_string(),
            ];

            // Session resume
            if let Some(ref session_id) = args.resume_session_id {
                cli_args.push("--resume".to_string());
                cli_args.push(session_id.clone());
            }

            // Item 15: Named session (CLI v2.1.76+)
            if let Some(ref name) = args.session_name {
                cli_args.push("--name".to_string());
                cli_args.push(name.clone());
            }

            // Item 15: Resume by PR (CLI v2.1.27+)
            if let Some(ref pr) = args.from_pr {
                cli_args.push("--from-pr".to_string());
                cli_args.push(pr.clone());
            }

            // Item 16: Structured output schema (CLI v2.1.21+)
            if let Some(ref schema) = args.json_schema {
                cli_args.push("--json-schema".to_string());
                cli_args.push(schema.clone());
            }

            // Item 18: Effort level (CLI v2.1.78+), default: medium
            let effort = args.effort.as_deref().unwrap_or("medium");
            cli_args.push("--effort".to_string());
            cli_args.push(effort.to_string());

            // Item 4: CLI-native worktree isolation (CLI v2.1.49+)
            if args.use_worktree.unwrap_or(false) {
                cli_args.push("--worktree".to_string());
            }

            // Max budget (CLI v2.1.21+)
            if let Some(budget) = args.max_budget_usd {
                cli_args.push("--max-budget-usd".to_string());
                cli_args.push(format!("{:.2}", budget));
            }

            // Max turns (CLI v2.1.21+)
            if let Some(turns) = args.max_turns {
                cli_args.push("--max-turns".to_string());
                cli_args.push(turns.to_string());
            }

            // Model override
            if let Some(ref model) = args.model {
                cli_args.push("--model".to_string());
                cli_args.push(model.clone());
            }

            // Item 17: Additional settings (for hooks config)
            if let Some(ref settings) = args.cli_settings {
                cli_args.push("--settings".to_string());
                cli_args.push(settings.clone());
            }

            (program, cli_args)
        }
        "gemini" => {
            let program = "gemini".to_string();
            let mut cli_args = vec![
                "-p".to_string(),
                "-".to_string(),
            ];

            if let Some(ref model) = args.model {
                cli_args.push("--model".to_string());
                cli_args.push(model.clone());
            }

            (program, cli_args)
        }
        other => {
            (other.to_string(), vec!["-p".to_string(), "-".to_string()])
        }
    }
}

/// Get execution status by checking if process is still running
#[tauri::command]
pub async fn claude_execution_status(
    execution_id: String,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let status = state.process_manager.status(&execution_id).await;
    Ok(serde_json::json!({
        "execution_id": execution_id,
        "status": status,
    }))
}
