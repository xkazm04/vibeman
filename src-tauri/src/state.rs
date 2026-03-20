use std::sync::Arc;

use crate::db::Database;
use crate::process::ProcessManager;

/// Global application state managed by Tauri
pub struct AppState {
    /// Application start time
    pub started_at: chrono::DateTime<chrono::Utc>,
    /// Database connection
    pub db: Option<Database>,
    /// Process manager for CLI sessions
    pub process_manager: Arc<ProcessManager>,
}

impl AppState {
    pub fn new(db_path: Option<&str>) -> Result<Self, Box<dyn std::error::Error>> {
        let db = if let Some(path) = db_path {
            let path = std::path::Path::new(path);
            Some(Database::open(path)?)
        } else {
            // Try default path: ./database/goals.db relative to CWD
            let default_path = std::env::current_dir()
                .unwrap_or_default()
                .join("database")
                .join("goals.db");
            if default_path.exists() {
                Some(Database::open(&default_path)?)
            } else {
                log::warn!("No database found at {:?}, running without DB", default_path);
                None
            }
        };

        Ok(Self {
            started_at: chrono::Utc::now(),
            db,
            process_manager: Arc::new(ProcessManager::new()),
        })
    }

    /// Get database reference, returning error if not initialized
    pub fn db(&self) -> Result<&Database, String> {
        self.db.as_ref().ok_or_else(|| "Database not initialized".to_string())
    }
}
