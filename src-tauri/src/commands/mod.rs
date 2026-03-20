//! Tauri IPC commands — all domain modules

mod system;
mod process_cmds;
mod fs_cmds;
mod db_cmds;
mod db_repos;
mod claude_cmds;
mod brain_cmds;
mod conductor_cmds;
mod git_server_cmds;
mod social_cmds;
mod lifecycle_cmds;
mod misc_cmds;
mod ideas_cmds;
mod triage_cmds;

pub use system::*;
pub use process_cmds::*;
pub use fs_cmds::*;
pub use db_cmds::*;
pub use db_repos::*;
pub use claude_cmds::*;
pub use brain_cmds::*;
pub use conductor_cmds::*;
pub use git_server_cmds::*;
pub use social_cmds::*;
pub use lifecycle_cmds::*;
pub use misc_cmds::*;
pub use ideas_cmds::*;
pub use triage_cmds::*;
