//! Execution state with bounded event ring buffer

use serde::{Deserialize, Serialize};
use std::collections::VecDeque;

pub type ExecutionId = String;

/// Status of an execution
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum ExecutionStatus {
    Running,
    Completed,
    Failed,
    Killed,
}

/// Single CLI execution with bounded event history
pub struct Execution {
    pub id: ExecutionId,
    pub pid: u32,
    pub status: ExecutionStatus,
    pub started_at: i64,
    pub session_id: Option<String>,
    pub session_name: Option<String>,
    /// Bounded ring buffer for events (max 5000)
    events: VecDeque<super::ExecutionEvent>,
}

const MAX_EVENTS: usize = 5000;

impl Execution {
    pub fn new(id: String, pid: u32) -> Self {
        Self {
            id,
            pid,
            status: ExecutionStatus::Running,
            started_at: chrono::Utc::now().timestamp(),
            session_id: None,
            session_name: None,
            events: VecDeque::with_capacity(256),
        }
    }

    /// Push event to bounded ring buffer
    pub fn push_event(&mut self, event: &super::ExecutionEvent) {
        if self.events.len() >= MAX_EVENTS {
            self.events.pop_front();
        }
        self.events.push_back(event.clone());

        // Extract session ID from system init events
        if event.event_type == "data" {
            if let Some(sid) = event.data.get("session_id").and_then(|v| v.as_str()) {
                self.session_id = Some(sid.to_string());
            }
        }
    }

    /// Get events since index (for catch-up)
    pub fn events_since(&self, index: usize) -> Vec<&super::ExecutionEvent> {
        self.events.iter().skip(index).collect()
    }

    pub fn event_count(&self) -> usize {
        self.events.len()
    }
}
