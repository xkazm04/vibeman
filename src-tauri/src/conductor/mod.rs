//! Conductor Pipeline Engine (Wave 3: Items 6, 7, 8)
//!
//! Rust-native pipeline orchestration with:
//! - Explicit state machine (Item 6)
//! - DAG-based parallel task scheduling (Item 7)
//! - git2-rs operations (Item 8)

mod state_machine;
mod scheduler;
mod git_ops;

pub use state_machine::{PipelineState, PauseReason, ConductorRun};
pub use scheduler::TaskScheduler;
pub use git_ops::GitOps;
