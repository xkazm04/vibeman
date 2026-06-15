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

// ============================================================================
// Point 1: per-execution token-usage measurement
//
// The Rust stdout reader is the only place that sees the CLI's stream-json,
// so it is where we tally what each CLI invocation actually costs. Authoritative
// totals come from the final `result` event's `usage`; assistant-message usage
// is a fallback when the result event omits it. Tool-result volume (bytes/count)
// is tracked separately because that churn — not the prompt — is the dominant
// token sink we ultimately want compression to attack.
// ============================================================================

#[derive(Default)]
struct UsageAccumulator {
    // Authoritative totals (from the final `result` event)
    result_input_tokens: u64,
    result_output_tokens: u64,
    result_cache_read_tokens: u64,
    result_cache_creation_tokens: u64,
    have_result_usage: bool,
    // Fallback tallies (summed/maxed from assistant messages)
    fb_input_tokens: u64,
    fb_output_tokens: u64,
    fb_cache_read_tokens: u64,
    fb_cache_creation_tokens: u64,
    // Volume / shape signals
    tool_use_count: u64,
    tool_result_count: u64,
    tool_result_bytes: u64,
    assistant_msgs: u64,
    // Session + cost
    session_id: Option<String>,
    cost_usd: Option<f64>,
    num_turns: Option<u64>,
}

#[derive(Debug, Clone)]
struct UsageSnapshot {
    session_id: Option<String>,
    input_tokens: u64,
    output_tokens: u64,
    cache_read_tokens: u64,
    cache_creation_tokens: u64,
    tool_use_count: u64,
    tool_result_count: u64,
    tool_result_bytes: u64,
    assistant_msgs: u64,
    cost_usd: Option<f64>,
    num_turns: Option<u64>,
    estimated: bool,
}

impl UsageAccumulator {
    fn observe(&mut self, event: &StreamEvent) {
        use crate::process::stream::ContentBlock;
        match event {
            StreamEvent::System { session_id, .. } => {
                if self.session_id.is_none() {
                    if let Some(sid) = session_id {
                        self.session_id = Some(sid.clone());
                    }
                }
            }
            StreamEvent::Assistant { message } => {
                self.assistant_msgs += 1;
                for block in &message.content {
                    if let ContentBlock::ToolUse { .. } = block {
                        self.tool_use_count += 1;
                    }
                }
                if let Some(u) = &message.usage {
                    // input/cache_read are per-turn snapshots → take the max;
                    // output/cache_creation accumulate → sum.
                    self.fb_input_tokens = self.fb_input_tokens.max(u.input_tokens.unwrap_or(0));
                    self.fb_output_tokens += u.output_tokens.unwrap_or(0);
                    self.fb_cache_read_tokens =
                        self.fb_cache_read_tokens.max(u.cache_read_input_tokens.unwrap_or(0));
                    self.fb_cache_creation_tokens += u.cache_creation_input_tokens.unwrap_or(0);
                }
            }
            StreamEvent::User { message } => {
                // `user` events carry tool_result content fed back into context.
                self.tool_result_count += 1;
                self.tool_result_bytes += serde_json::to_string(message)
                    .map(|s| s.len() as u64)
                    .unwrap_or(0);
            }
            StreamEvent::Result {
                session_id,
                usage,
                cost_usd,
                num_turns,
                ..
            } => {
                if self.session_id.is_none() {
                    if let Some(sid) = session_id {
                        self.session_id = Some(sid.clone());
                    }
                }
                if let Some(c) = cost_usd {
                    self.cost_usd = Some(*c);
                }
                if let Some(n) = num_turns {
                    self.num_turns = Some(*n);
                }
                if let Some(u) = usage {
                    self.have_result_usage = true;
                    self.result_input_tokens = u.input_tokens.unwrap_or(0);
                    self.result_output_tokens = u.output_tokens.unwrap_or(0);
                    self.result_cache_read_tokens = u.cache_read_input_tokens.unwrap_or(0);
                    self.result_cache_creation_tokens = u.cache_creation_input_tokens.unwrap_or(0);
                }
            }
        }
    }

    fn snapshot(&self) -> UsageSnapshot {
        let estimated = !self.have_result_usage;
        UsageSnapshot {
            session_id: self.session_id.clone(),
            input_tokens: if self.have_result_usage { self.result_input_tokens } else { self.fb_input_tokens },
            output_tokens: if self.have_result_usage { self.result_output_tokens } else { self.fb_output_tokens },
            cache_read_tokens: if self.have_result_usage { self.result_cache_read_tokens } else { self.fb_cache_read_tokens },
            cache_creation_tokens: if self.have_result_usage { self.result_cache_creation_tokens } else { self.fb_cache_creation_tokens },
            tool_use_count: self.tool_use_count,
            tool_result_count: self.tool_result_count,
            tool_result_bytes: self.tool_result_bytes,
            assistant_msgs: self.assistant_msgs,
            cost_usd: self.cost_usd,
            num_turns: self.num_turns,
            estimated,
        }
    }

    fn summary_json(&self) -> serde_json::Value {
        let s = self.snapshot();
        serde_json::json!({
            "session_id": s.session_id,
            "input_tokens": s.input_tokens,
            "output_tokens": s.output_tokens,
            "cache_read_input_tokens": s.cache_read_tokens,
            "cache_creation_input_tokens": s.cache_creation_tokens,
            "tool_use_count": s.tool_use_count,
            "tool_result_count": s.tool_result_count,
            "tool_result_bytes": s.tool_result_bytes,
            "assistant_messages": s.assistant_msgs,
            "cost_usd": s.cost_usd,
            "num_turns": s.num_turns,
            "estimated": s.estimated,
        })
    }
}

/// Persist a per-execution token-usage row into the project's OWN goals.db.
///
/// Project-scoped by construction: we open `<project_path>/database/goals.db`,
/// so rows are physically partitioned per project and never mix. No-op when the
/// project DB or the `cli_token_usage` table is absent (migration not applied).
fn persist_token_usage_blocking(
    project_path: &str,
    project_id: Option<&str>,
    execution_id: &str,
    s: &UsageSnapshot,
) {
    let db_path = std::path::Path::new(project_path)
        .join("database")
        .join("goals.db");
    if !db_path.exists() {
        return;
    }
    let conn = match rusqlite::Connection::open(&db_path) {
        Ok(c) => c,
        Err(e) => {
            log::warn!("token_usage: open {} failed: {}", db_path.display(), e);
            return;
        }
    };
    let table_ok: bool = conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='cli_token_usage'",
            [],
            |row| row.get::<_, i64>(0),
        )
        .map(|c| c > 0)
        .unwrap_or(false);
    if !table_ok {
        return;
    }
    let id = uuid::Uuid::new_v4().to_string();
    let res = conn.execute(
        "INSERT INTO cli_token_usage \
         (id, execution_id, project_id, session_id, input_tokens, output_tokens, \
          cache_read_input_tokens, cache_creation_input_tokens, tool_use_count, \
          tool_result_count, tool_result_bytes, assistant_messages, cost_usd, num_turns, \
          estimated, created_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, datetime('now'))",
        rusqlite::params![
            id,
            execution_id,
            project_id,
            s.session_id,
            s.input_tokens as i64,
            s.output_tokens as i64,
            s.cache_read_tokens as i64,
            s.cache_creation_tokens as i64,
            s.tool_use_count as i64,
            s.tool_result_count as i64,
            s.tool_result_bytes as i64,
            s.assistant_msgs as i64,
            s.cost_usd,
            s.num_turns.map(|n| n as i64),
            if s.estimated { 1i64 } else { 0i64 },
        ],
    );
    if let Err(e) = res {
        log::warn!("token_usage: insert failed: {}", e);
    }
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
    // Project root for the token-optimization tools' per-project cache scoping.
    env.insert("VIBEMAN_PROJECT_PATH".to_string(), args.project_path.clone());
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

    let provider_for_stdout = args
        .provider
        .clone()
        .unwrap_or_else(|| "claude".to_string());

    // Point 1: capture project identity so the stdout reader can attribute
    // token usage to the right project's DB (per-project isolation).
    let project_path_for_usage = args.project_path.clone();
    let project_id_for_usage = args.project_id.clone();

    if let Some(stdout) = child.stdout.take() {
        let exec_id_stdout = exec_id.clone();
        let app_stdout = app_handle.clone();
        tokio::spawn(async move {
            let reader = BufReader::new(stdout);
            let mut lines = reader.lines();
            let mut usage = UsageAccumulator::default();

            while let Ok(Some(line)) = lines.next_line().await {
                // Try to parse provider-specific JSONL output.
                let data = if provider_for_stdout == "codex" {
                    serde_json::from_str::<serde_json::Value>(line.trim())
                        .unwrap_or_else(|_| serde_json::json!({"raw": line}))
                } else if let Some(event) = StreamEvent::parse_line(&line) {
                    usage.observe(&event);
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

            // Point 1: emit the per-execution token-usage summary for the UI...
            let _ = app_stdout.emit(
                "claude-execution-event",
                ExecutionEvent {
                    execution_id: exec_id_stdout.clone(),
                    event_type: "token_usage".to_string(),
                    data: usage.summary_json(),
                },
            );
            // ...and persist it to the project's own goals.db off the async runtime.
            {
                let pp = project_path_for_usage.clone();
                let pid = project_id_for_usage.clone();
                let exec = exec_id_stdout.clone();
                let snap = usage.snapshot();
                let _ = tokio::task::spawn_blocking(move || {
                    persist_token_usage_blocking(&pp, pid.as_deref(), &exec, &snap);
                });
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

            // Item 18: Effort level (CLI v2.1.78+)
            // Only passed when explicitly set — no default, let CLI use its own default
            // to avoid constraining quality
            if let Some(ref effort) = args.effort {
                cli_args.push("--effort".to_string());
                cli_args.push(effort.clone());
            }

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
            // Only passed when explicitly set — no default limit,
            // let the CLI run as many turns as needed for quality
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
        "codex" => {
            let program = if cfg!(target_os = "windows") {
                "codex.cmd".to_string()
            } else {
                "codex".to_string()
            };

            let mut cli_args = vec![
                "exec".to_string(),
                "--json".to_string(),
                "--sandbox".to_string(),
                "workspace-write".to_string(),
                "-c".to_string(),
                "approval_policy=\"never\"".to_string(),
                "--color".to_string(),
                "never".to_string(),
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

// ============================================================================
// Interactive session commands
// ============================================================================

/// Arguments for starting an interactive Claude session (no predefined prompt)
#[derive(Debug, Deserialize)]
pub struct StartInteractiveClaudeArgs {
    pub project_path: String,
    pub project_id: Option<String>,
    pub provider: Option<String>,
    pub model: Option<String>,
    pub session_name: Option<String>,
    pub resume_session_id: Option<String>,
    pub max_budget_usd: Option<f64>,
    pub extra_env: Option<HashMap<String, String>>,
}

/// Start an interactive Claude Code CLI session.
///
/// Unlike execute_claude, this does NOT send a prompt upfront.
/// The session waits for user input via write_to_claude.
/// Emits "input_needed" events when Claude finishes responding.
#[tauri::command]
pub async fn start_interactive_claude(
    args: StartInteractiveClaudeArgs,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<ExecuteResult, String> {
    if args.provider.as_deref() == Some("codex") {
        return Err("Interactive Codex sessions are not supported in the MVP; use automated task execution instead.".to_string());
    }

    let execution_id = uuid::Uuid::new_v4().to_string();

    let provider = args.provider.as_deref().unwrap_or("claude");
    let program = if provider == "gemini" {
        "gemini".to_string()
    } else if cfg!(target_os = "windows") {
        "claude.cmd".to_string()
    } else {
        "claude".to_string()
    };

    // Build CLI args for interactive mode (no -p flag, no --dangerously-skip-permissions)
    // Permission prompts are relayed through the UI via approval_needed events
    let mut cli_args = vec![
        "--output-format".to_string(),
        "stream-json".to_string(),
        "--verbose".to_string(),
    ];

    if let Some(ref session_id) = args.resume_session_id {
        cli_args.push("--resume".to_string());
        cli_args.push(session_id.clone());
    }
    if let Some(ref name) = args.session_name {
        cli_args.push("--name".to_string());
        cli_args.push(name.clone());
    }
    if let Some(budget) = args.max_budget_usd {
        cli_args.push("--max-budget-usd".to_string());
        cli_args.push(format!("{:.2}", budget));
    }
    if let Some(ref model) = args.model {
        cli_args.push("--model".to_string());
        cli_args.push(model.clone());
    }

    let mut cmd = Command::new(&program);
    cmd.args(&cli_args)
        .current_dir(&args.project_path)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .stdin(std::process::Stdio::piped());

    // Set environment variables
    let mut env = args.extra_env.unwrap_or_default();
    env.insert("VIBEMAN_PROJECT_PATH".to_string(), args.project_path.clone());
    if let Some(ref pid) = args.project_id {
        env.insert("VIBEMAN_PROJECT_ID".to_string(), pid.clone());
    }
    env.insert(
        "VIBEMAN_HOOK_SECRET".to_string(),
        uuid::Uuid::new_v4().to_string(),
    );
    for (key, value) in &env {
        cmd.env(key, value);
    }
    cmd.env_remove("ANTHROPIC_API_KEY");

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x00000200);
    }

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Failed to spawn {}: {}", program, e))?;

    let pid = child.id().unwrap_or(0);

    // Store stdin handle for interactive writes (don't close it)
    if let Some(stdin) = child.stdin.take() {
        let mut stdins = state.interactive_stdins.lock().await;
        stdins.insert(execution_id.clone(), stdin);
    }

    // Spawn stdout reader with input_needed + approval_needed detection
    let exec_id = execution_id.clone();
    let app_handle = app.clone();
    if let Some(stdout) = child.stdout.take() {
        let exec_id_stdout = exec_id.clone();
        let app_stdout = app_handle.clone();
        tokio::spawn(async move {
            let reader = BufReader::new(stdout);
            let mut lines = reader.lines();
            let mut expecting_input = false;
            // Track pending tool_use blocks for approval relay
            let mut pending_tool_uses: Vec<serde_json::Value> = Vec::new();

            loop {
                tokio::select! {
                    line_result = lines.next_line() => {
                        match line_result {
                            Ok(Some(line)) => {
                                expecting_input = false;
                                let parsed = StreamEvent::parse_line(&line);
                                let data = if let Some(ref event) = parsed {
                                    // Check assistant message for turn completion or tool_use
                                    if let StreamEvent::Assistant { ref message } = event {
                                        if message.stop_reason.as_deref() == Some("end_turn") {
                                            expecting_input = true;
                                            pending_tool_uses.clear();
                                        } else if message.stop_reason.as_deref() == Some("tool_use") {
                                            // Claude is proposing tool use — collect tool details
                                            expecting_input = true;
                                            pending_tool_uses.clear();
                                            for block in &message.content {
                                                if let crate::process::stream::ContentBlock::ToolUse { id, name, input } = block {
                                                    pending_tool_uses.push(serde_json::json!({
                                                        "toolUseId": id,
                                                        "toolName": name,
                                                        "toolInput": input,
                                                    }));
                                                }
                                            }
                                        }
                                    }
                                    // Result events also mean Claude is done with this turn
                                    if matches!(event, StreamEvent::Result { .. }) {
                                        expecting_input = true;
                                        pending_tool_uses.clear();
                                    }
                                    serde_json::to_value(event)
                                        .unwrap_or(serde_json::json!({"raw": line}))
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
                            Ok(None) => break, // EOF
                            Err(_) => break,
                        }
                    }
                    _ = tokio::time::sleep(std::time::Duration::from_secs(2)) => {
                        if expecting_input {
                            if !pending_tool_uses.is_empty() {
                                // Tool approval needed — relay tool details to frontend
                                let _ = app_stdout.emit(
                                    "claude-execution-event",
                                    ExecutionEvent {
                                        execution_id: exec_id_stdout.clone(),
                                        event_type: "approval_needed".to_string(),
                                        data: serde_json::json!({
                                            "tools": pending_tool_uses,
                                            "message": "Claude wants to use tools — approve or deny"
                                        }),
                                    },
                                );
                                pending_tool_uses.clear();
                            } else {
                                // Normal conversation input needed
                                let _ = app_stdout.emit(
                                    "claude-execution-event",
                                    ExecutionEvent {
                                        execution_id: exec_id_stdout.clone(),
                                        event_type: "input_needed".to_string(),
                                        data: serde_json::json!({"message": "Claude is waiting for input"}),
                                    },
                                );
                            }
                            expecting_input = false;
                        }
                    }
                }
            }

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

    // Stderr reader (same as execute_claude)
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

    // Completion waiter
    let exec_id_wait = exec_id.clone();
    let app_wait = app_handle;
    let stdins_ref = state.interactive_stdins.clone();
    tokio::spawn(async move {
        let result = child.wait().await;
        // Clean up stdin handle when process exits
        stdins_ref.lock().await.remove(&exec_id_wait);

        match result {
            Ok(exit_status) => {
                let _ = app_wait.emit(
                    "claude-execution-event",
                    ExecutionEvent {
                        execution_id: exec_id_wait,
                        event_type: "completed".to_string(),
                        data: serde_json::json!({
                            "exit_code": exit_status.code().unwrap_or(-1),
                            "success": exit_status.success(),
                        }),
                    },
                );
            }
            Err(err) => {
                let _ = app_wait.emit(
                    "claude-execution-event",
                    ExecutionEvent {
                        execution_id: exec_id_wait,
                        event_type: "error".to_string(),
                        data: serde_json::json!({"error": err.to_string()}),
                    },
                );
            }
        }
    });

    log::info!(
        "Started interactive Claude session {} (PID: {}) in {}",
        execution_id, pid, args.project_path
    );

    Ok(ExecuteResult { execution_id, pid })
}

/// Write text to an interactive Claude session's stdin
#[tauri::command]
pub async fn write_to_claude(
    execution_id: String,
    text: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut stdins = state.interactive_stdins.lock().await;
    if let Some(stdin) = stdins.get_mut(&execution_id) {
        use tokio::io::AsyncWriteExt;
        let message = if text.ends_with('\n') {
            text
        } else {
            format!("{}\n", text)
        };
        stdin
            .write_all(message.as_bytes())
            .await
            .map_err(|e| format!("Failed to write to stdin: {}", e))?;
        stdin
            .flush()
            .await
            .map_err(|e| format!("Failed to flush stdin: {}", e))?;
        Ok(())
    } else {
        Err(format!(
            "No interactive session found for execution {}",
            execution_id
        ))
    }
}

/// Check if an interactive session's process is still alive
/// (stdin handle still exists in the interactive_stdins map)
#[tauri::command]
pub async fn interactive_session_alive(
    execution_id: String,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    let stdins = state.interactive_stdins.lock().await;
    Ok(stdins.contains_key(&execution_id))
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
