//! Process Supervisor (Item 1)
//!
//! Ensures all child CLI processes are terminated when the app exits.
//! Windows: uses taskkill /T for process tree cleanup.
//! All platforms: parallel orphan reaping via tokio.

use dashmap::DashMap;
use std::sync::Arc;

/// Tracks and supervises all spawned CLI processes
pub struct ProcessSupervisor {
    /// Map of execution_id → PID for active processes
    tracked: Arc<DashMap<String, u32>>,
}

impl ProcessSupervisor {
    pub fn new() -> Self {
        Self {
            tracked: Arc::new(DashMap::new()),
        }
    }

    /// Track a process for supervision
    pub fn track(&self, execution_id: &str, pid: u32) {
        self.tracked.insert(execution_id.to_string(), pid);
        log::info!("Supervisor: tracking PID {} for {}", pid, execution_id);
    }

    /// Untrack a process (completed/killed)
    pub fn untrack(&self, execution_id: &str) {
        self.tracked.remove(execution_id);
    }

    /// Kill a specific process
    pub async fn kill(&self, execution_id: &str) -> Result<(), String> {
        if let Some((_, pid)) = self.tracked.remove(execution_id) {
            Self::kill_pid(pid).await?;
            log::info!("Supervisor: killed PID {} for {}", pid, execution_id);
        }
        Ok(())
    }

    /// Kill all tracked processes in parallel (app shutdown)
    pub async fn kill_all(&self) {
        let pids: Vec<(String, u32)> = self.tracked
            .iter()
            .map(|e| (e.key().clone(), *e.value()))
            .collect();

        let handles: Vec<_> = pids
            .into_iter()
            .map(|(id, pid)| {
                tokio::spawn(async move {
                    if let Err(e) = Self::kill_pid(pid).await {
                        log::warn!("Failed to kill PID {} ({}): {}", pid, id, e);
                    }
                })
            })
            .collect();

        for handle in handles {
            let _ = handle.await;
        }
        self.tracked.clear();
        log::info!("Supervisor: killed all tracked processes");
    }

    /// List active PIDs
    pub fn active_pids(&self) -> Vec<(String, u32)> {
        self.tracked
            .iter()
            .map(|e| (e.key().clone(), *e.value()))
            .collect()
    }

    /// Kill a process by PID (platform-specific)
    async fn kill_pid(pid: u32) -> Result<(), String> {
        #[cfg(target_os = "windows")]
        {
            // /T kills entire process tree, /F forces
            let output = tokio::process::Command::new("taskkill")
                .args(["/F", "/PID", &pid.to_string(), "/T"])
                .output()
                .await
                .map_err(|e| format!("taskkill failed: {}", e))?;

            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                // Process already exited is not an error
                if !stderr.contains("not found") {
                    return Err(format!("taskkill error: {}", stderr));
                }
            }
        }

        #[cfg(not(target_os = "windows"))]
        {
            let _ = tokio::process::Command::new("kill")
                .args(["-9", &pid.to_string()])
                .output()
                .await
                .map_err(|e| format!("kill failed: {}", e))?;
        }

        Ok(())
    }
}
