//! Filesystem utilities module
//!
//! Provides file scanning, watching, and analysis capabilities
//! that replace chokidar, ts-morph, and custom Node.js fs operations.

mod scanner;
mod watcher;

pub use scanner::{FileScanner, ScannedFile};
pub use watcher::FileWatcher;
