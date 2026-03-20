//! Unified Execution Runtime (Item 19)
//!
//! Single source of truth for all CLI execution state.
//! Replaces: activeExecutions Map, executionBus EventEmitter,
//! sessionToExecution Map in cli-service.ts

mod execution;
mod supervisor;

pub use execution::{Execution, ExecutionId, ExecutionStatus};
pub use supervisor::ProcessSupervisor;

use dashmap::DashMap;
use std::sync::Arc;
use tokio::sync::broadcast;

use crate::process::stream::StreamEvent;

/// Event emitted during execution lifecycle
#[derive(Debug, Clone, serde::Serialize)]
pub struct ExecutionEvent {
    pub execution_id: String,
    pub event_type: String,
    pub data: serde_json::Value,
    pub timestamp: i64,
}

/// Core runtime managing all CLI executions
pub struct ExecutionRuntime {
    /// Lock-free concurrent map of all executions
    pub executions: Arc<DashMap<String, Execution>>,
    /// Broadcast channel for execution events (single writer, multi-reader)
    event_tx: broadcast::Sender<ExecutionEvent>,
    /// Process supervisor for child process lifecycle
    pub supervisor: Arc<ProcessSupervisor>,
}

impl ExecutionRuntime {
    pub fn new() -> Self {
        let (event_tx, _) = broadcast::channel(10000); // 10k event buffer
        Self {
            executions: Arc::new(DashMap::new()),
            event_tx,
            supervisor: Arc::new(ProcessSupervisor::new()),
        }
    }

    /// Register a new execution
    pub fn register(&self, id: &str, pid: u32) {
        let execution = Execution::new(id.to_string(), pid);
        self.executions.insert(id.to_string(), execution);
        self.supervisor.track(id, pid);
    }

    /// Emit an event for a specific execution
    pub fn emit(&self, event: ExecutionEvent) {
        // Update execution state
        if let Some(mut exec) = self.executions.get_mut(&event.execution_id) {
            exec.push_event(&event);
            if event.event_type == "completed" || event.event_type == "error" {
                exec.status = ExecutionStatus::Completed;
            }
        }
        // Broadcast to all subscribers (ignore send errors — no subscribers is OK)
        let _ = self.event_tx.send(event);
    }

    /// Subscribe to execution events
    pub fn subscribe(&self) -> broadcast::Receiver<ExecutionEvent> {
        self.event_tx.subscribe()
    }

    /// Get execution status
    pub fn get_status(&self, id: &str) -> Option<ExecutionStatus> {
        self.executions.get(id).map(|e| e.status.clone())
    }

    /// Remove completed executions older than max_age_secs
    pub fn cleanup(&self, max_age_secs: i64) {
        let now = chrono::Utc::now().timestamp();
        self.executions.retain(|_, exec| {
            if exec.status == ExecutionStatus::Completed {
                now - exec.started_at < max_age_secs
            } else {
                true // keep running executions
            }
        });
    }

    /// Kill all running processes (for app shutdown)
    pub async fn shutdown(&self) {
        self.supervisor.kill_all().await;
    }
}
