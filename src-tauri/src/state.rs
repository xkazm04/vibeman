use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;

use crate::db::Database;
use crate::process::ProcessManager;
use crate::runtime::ExecutionRuntime;

/// Global application state managed by Tauri
pub struct AppState {
    /// Application start time
    pub started_at: chrono::DateTime<chrono::Utc>,
    /// Database connection
    pub db: Option<Database>,
    /// Legacy process manager (kept for backward compat with existing commands)
    pub process_manager: Arc<ProcessManager>,
    /// Unified execution runtime (Wave 1 — Items 19, 1, 2, 3)
    pub runtime: Arc<ExecutionRuntime>,
    /// Stdin handles for interactive CLI sessions (execution_id → ChildStdin)
    pub interactive_stdins: Arc<Mutex<HashMap<String, tokio::process::ChildStdin>>>,
}

impl AppState {
    pub fn new(db_path: Option<&str>) -> Result<Self, Box<dyn std::error::Error>> {
        let db = if let Some(path) = db_path {
            let path = std::path::Path::new(path);
            Some(Database::open(path)?)
        } else {
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
            runtime: Arc::new(ExecutionRuntime::new()),
            interactive_stdins: Arc::new(Mutex::new(HashMap::new())),
        })
    }

    pub fn db(&self) -> Result<&Database, String> {
        self.db.as_ref().ok_or_else(|| "Database not initialized".to_string())
    }
}
