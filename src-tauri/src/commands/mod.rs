//! Tauri IPC commands
//!
//! Each submodule corresponds to a domain of API routes being migrated.

mod system;
mod process_cmds;
mod fs_cmds;
mod db_cmds;
mod db_repos;
mod claude_cmds;

pub use system::*;
pub use process_cmds::*;
pub use fs_cmds::*;
pub use db_cmds::*;
pub use db_repos::*;
pub use claude_cmds::*;
