//! Process management module
//!
//! Handles spawning and supervising CLI processes (Claude Code, Gemini CLI, etc.)
//! with proper lifecycle management, stream parsing, and cleanup.

mod manager;
pub mod stream;

pub use manager::{ProcessManager, ProcessHandle, SpawnConfig, ProcessStatus};
pub use stream::{StreamEvent, StreamParser};
