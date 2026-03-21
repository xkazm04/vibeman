use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::process::{Child, Command};
use tokio::sync::Mutex;

/// Configuration for spawning a CLI process
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpawnConfig {
    /// CLI program name (e.g., "claude", "gemini")
    pub program: String,
    /// Arguments to pass
    pub args: Vec<String>,
    /// Working directory
    pub cwd: PathBuf,
    /// Environment variables to set
    pub env: HashMap<String, String>,
    /// Environment variables to remove
    pub env_remove: Vec<String>,
    /// Prompt to send via stdin
    pub stdin_input: Option<String>,
    /// Timeout in seconds
    pub timeout_secs: u64,
    /// Session ID for tracking
    pub session_id: String,
    /// Project ID for context
    pub project_id: Option<String>,
}

/// Status of a managed process
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ProcessStatus {
    Running,
    Completed { exit_code: i32 },
    Failed { error: String },
    Killed,
    TimedOut,
}

/// Handle to a running process
pub struct ProcessHandle {
    pub session_id: String,
    pub pid: u32,
    pub status: ProcessStatus,
    child: Option<Child>,
}

impl ProcessHandle {
    /// Kill the process
    pub async fn kill(&mut self) -> Result<(), String> {
        if let Some(ref mut child) = self.child {
            child.kill().await.map_err(|e| e.to_string())?;
            self.status = ProcessStatus::Killed;
        }
        Ok(())
    }

    /// Check if process is still running
    pub async fn try_wait(&mut self) -> Result<Option<ProcessStatus>, String> {
        if let Some(ref mut child) = self.child {
            match child.try_wait() {
                Ok(Some(status)) => {
                    let exit_code = status.code().unwrap_or(-1);
                    self.status = ProcessStatus::Completed { exit_code };
                    self.child = None;
                    Ok(Some(self.status.clone()))
                }
                Ok(None) => Ok(None), // Still running
                Err(e) => Err(e.to_string()),
            }
        } else {
            Ok(Some(self.status.clone()))
        }
    }
}

/// Manages all spawned CLI processes with lifecycle tracking
pub struct ProcessManager {
    processes: Arc<Mutex<HashMap<String, ProcessHandle>>>,
}

impl ProcessManager {
    pub fn new() -> Self {
        Self {
            processes: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Spawn a new CLI process
    pub async fn spawn(&self, config: SpawnConfig) -> Result<(String, u32), String> {
        let mut cmd = Command::new(&config.program);
        cmd.args(&config.args)
            .current_dir(&config.cwd)
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .stdin(std::process::Stdio::piped());

        // Set environment variables
        for (key, value) in &config.env {
            cmd.env(key, value);
        }

        // Remove environment variables
        for key in &config.env_remove {
            cmd.env_remove(key);
        }

        // On Windows, create process in a job object for cleanup
        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            // CREATE_NEW_PROCESS_GROUP to allow clean termination
            cmd.creation_flags(0x00000200);
        }

        let mut child = cmd.spawn().map_err(|e| {
            format!("Failed to spawn '{}': {}", config.program, e)
        })?;

        let pid = child.id().unwrap_or(0);

        // Send stdin input if provided
        if let Some(input) = &config.stdin_input {
            if let Some(mut stdin) = child.stdin.take() {
                use tokio::io::AsyncWriteExt;
                stdin
                    .write_all(input.as_bytes())
                    .await
                    .map_err(|e| format!("Failed to write stdin: {}", e))?;
                drop(stdin); // Close stdin to signal EOF
            }
        }

        let handle = ProcessHandle {
            session_id: config.session_id.clone(),
            pid,
            status: ProcessStatus::Running,
            child: Some(child),
        };

        let mut processes = self.processes.lock().await;
        processes.insert(config.session_id.clone(), handle);

        log::info!(
            "Spawned process '{}' (PID: {}) for session {}",
            config.program,
            pid,
            config.session_id
        );

        Ok((config.session_id, pid))
    }

    /// Kill a process by session ID
    pub async fn kill(&self, session_id: &str) -> Result<(), String> {
        let mut processes = self.processes.lock().await;
        if let Some(handle) = processes.get_mut(session_id) {
            handle.kill().await?;
            log::info!("Killed process for session {}", session_id);
        }
        Ok(())
    }

    /// Get status of a process
    pub async fn status(&self, session_id: &str) -> Option<ProcessStatus> {
        let mut processes = self.processes.lock().await;
        if let Some(handle) = processes.get_mut(session_id) {
            let _ = handle.try_wait().await;
            Some(handle.status.clone())
        } else {
            None
        }
    }

    /// List all active sessions
    pub async fn list_active(&self) -> Vec<(String, u32, ProcessStatus)> {
        let mut processes = self.processes.lock().await;
        let mut active = Vec::new();
        for (id, handle) in processes.iter_mut() {
            let _ = handle.try_wait().await;
            if matches!(handle.status, ProcessStatus::Running) {
                active.push((id.clone(), handle.pid, handle.status.clone()));
            }
        }
        active
    }

    /// Kill all running processes (for app shutdown)
    pub async fn kill_all(&self) {
        let mut processes = self.processes.lock().await;
        for (id, handle) in processes.iter_mut() {
            if matches!(handle.status, ProcessStatus::Running) {
                if let Err(e) = handle.kill().await {
                    log::warn!("Failed to kill process {}: {}", id, e);
                }
            }
        }
    }

    /// Clean up completed processes from tracking
    pub async fn cleanup_completed(&self) {
        let mut processes = self.processes.lock().await;
        processes.retain(|_, handle| matches!(handle.status, ProcessStatus::Running));
    }
}
