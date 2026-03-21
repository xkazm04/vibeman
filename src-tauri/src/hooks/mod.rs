//! HTTP Hooks Server for Claude Code CLI bidirectional communication (Item 17)
//!
//! Starts a lightweight HTTP server that Claude Code CLI POSTs hook events to.
//! Replaces the MCP server for basic lifecycle signaling (Stop, StopFailure, PreToolUse).

use axum::{extract::State as AxumState, routing::post, Json, Router};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::sync::broadcast;

/// Hook event received from Claude Code CLI
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct HookEvent {
    pub hook_type: Option<String>,
    pub event: Option<String>,
    pub session_id: Option<String>,
    pub execution_id: Option<String>,
    pub tool_name: Option<String>,
    pub tool_input: Option<serde_json::Value>,
    pub exit_code: Option<i32>,
    pub error: Option<String>,
    pub last_assistant_message: Option<String>,
    #[serde(flatten)]
    pub extra: serde_json::Map<String, serde_json::Value>,
}

/// Response sent back to Claude Code CLI
#[derive(Debug, Serialize)]
pub struct HookResponse {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub additional_context: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub decision: Option<String>,
}

struct HookServerState {
    event_tx: broadcast::Sender<HookEvent>,
}

/// Start the hooks HTTP server on a random available port.
/// Returns the port number to pass to CLI via --settings.
pub async fn start_hook_server(
    event_tx: broadcast::Sender<HookEvent>,
) -> Result<u16, String> {
    let state = Arc::new(HookServerState { event_tx });

    let app = Router::new()
        .route("/hook", post(handle_hook))
        .with_state(state);

    // Bind to random available port
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .map_err(|e| format!("Failed to bind hook server: {}", e))?;

    let port = listener
        .local_addr()
        .map_err(|e| format!("Failed to get local addr: {}", e))?
        .port();

    // Spawn server in background
    tokio::spawn(async move {
        if let Err(e) = axum::serve(listener, app).await {
            log::error!("Hook server error: {}", e);
        }
    });

    log::info!("Hook server started on port {}", port);
    Ok(port)
}

/// Build CLI --settings JSON with hook configuration
pub fn build_hook_settings(port: u16) -> String {
    serde_json::json!({
        "hooks": {
            "Stop": [{
                "type": "http",
                "url": format!("http://127.0.0.1:{}/hook", port)
            }],
            "StopFailure": [{
                "type": "http",
                "url": format!("http://127.0.0.1:{}/hook", port)
            }],
            "PreToolUse": [{
                "type": "http",
                "url": format!("http://127.0.0.1:{}/hook", port)
            }]
        }
    })
    .to_string()
}

async fn handle_hook(
    AxumState(state): AxumState<Arc<HookServerState>>,
    Json(event): Json<HookEvent>,
) -> Json<HookResponse> {
    log::debug!("Hook received: {:?}", event.event);

    // Broadcast event to subscribers
    let _ = state.event_tx.send(event.clone());

    // Default response — no additional context
    let response = HookResponse {
        additional_context: None,
        decision: None,
    };

    Json(response)
}
