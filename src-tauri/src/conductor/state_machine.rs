//! Pipeline State Machine (Item 6)
//!
//! Explicit state transitions with atomic operations.
//! Replaces: AbortController map, DB polling for pause status,
//! scattered status updates in conductorV3.ts

use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicU8, Ordering};

/// Pipeline execution states
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum PipelineState {
    Initializing,
    Planning,
    Dispatching { batch: usize, parallel: usize },
    Reflecting { cycle: usize },
    Paused { reason: PauseReason },
    Resuming,
    Completed { cycles: usize, tasks_done: usize },
    Failed { error: String, cycle: usize },
    Aborted,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum PauseReason {
    UserRequested,
    NeedsInput { questions: Vec<String> },
    RateLimit { retry_after_ms: u64 },
}

/// Metrics tracked during pipeline execution
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct PipelineMetrics {
    pub tasks_planned: u32,
    pub tasks_completed: u32,
    pub tasks_failed: u32,
    pub llm_call_count: u32,
    pub total_cycles: u32,
    pub total_duration_ms: u64,
    pub worktrees_created: u32,
    pub merge_conflicts: u32,
}

/// A single conductor pipeline run
pub struct ConductorRun {
    pub id: String,
    pub project_id: String,
    pub goal: String,
    state: PipelineState,
    pub metrics: PipelineMetrics,
    pub created_at: i64,
}

impl ConductorRun {
    pub fn new(id: String, project_id: String, goal: String) -> Self {
        Self {
            id,
            project_id,
            goal,
            state: PipelineState::Initializing,
            metrics: PipelineMetrics::default(),
            created_at: chrono::Utc::now().timestamp(),
        }
    }

    pub fn state(&self) -> &PipelineState {
        &self.state
    }

    /// Transition to a new state. Returns Err if transition is invalid.
    pub fn transition(&mut self, new_state: PipelineState) -> Result<(), String> {
        let valid = match (&self.state, &new_state) {
            // Valid transitions
            (PipelineState::Initializing, PipelineState::Planning) => true,
            (PipelineState::Planning, PipelineState::Dispatching { .. }) => true,
            (PipelineState::Dispatching { .. }, PipelineState::Reflecting { .. }) => true,
            (PipelineState::Reflecting { .. }, PipelineState::Planning) => true, // next cycle
            (PipelineState::Reflecting { .. }, PipelineState::Completed { .. }) => true,
            (PipelineState::Reflecting { .. }, PipelineState::Paused { .. }) => true,
            // Pause/resume from any active state
            (PipelineState::Planning, PipelineState::Paused { .. }) => true,
            (PipelineState::Dispatching { .. }, PipelineState::Paused { .. }) => true,
            (PipelineState::Paused { .. }, PipelineState::Resuming) => true,
            (PipelineState::Resuming, PipelineState::Planning) => true,
            (PipelineState::Resuming, PipelineState::Dispatching { .. }) => true,
            // Abort from any non-terminal state
            (s, PipelineState::Aborted) if !Self::is_terminal(s) => true,
            // Fail from any non-terminal state
            (s, PipelineState::Failed { .. }) if !Self::is_terminal(s) => true,
            _ => false,
        };

        if valid {
            log::info!(
                "Pipeline {}: {:?} -> {:?}",
                self.id,
                self.state,
                new_state
            );
            self.state = new_state;
            Ok(())
        } else {
            Err(format!(
                "Invalid transition: {:?} -> {:?}",
                self.state, new_state
            ))
        }
    }

    fn is_terminal(state: &PipelineState) -> bool {
        matches!(
            state,
            PipelineState::Completed { .. }
                | PipelineState::Failed { .. }
                | PipelineState::Aborted
        )
    }

    pub fn is_active(&self) -> bool {
        !Self::is_terminal(&self.state)
    }
}
