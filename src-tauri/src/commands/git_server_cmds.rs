//! Git and Server management commands
//!
//! Replaces: /api/git/*, /api/server/*, /api/hooks/*

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tokio::process::Command;

// ============================================================================
// Git operations (replaces /api/git/*)
// ============================================================================

#[derive(Debug, Serialize)]
pub struct GitBranchInfo {
    pub branch: String,
    pub dirty: bool,
}

#[tauri::command]
pub async fn git_get_branch(project_path: String) -> Result<GitBranchInfo, String> {
    let output = Command::new("git")
        .args(["rev-parse", "--abbrev-ref", "HEAD"])
        .current_dir(&project_path)
        .output()
        .await
        .map_err(|e| format!("Failed to run git: {}", e))?;

    let branch = String::from_utf8_lossy(&output.stdout).trim().to_string();

    let dirty_output = Command::new("git")
        .args(["status", "--porcelain"])
        .current_dir(&project_path)
        .output()
        .await
        .map_err(|e| format!("Failed to run git status: {}", e))?;

    let dirty = !String::from_utf8_lossy(&dirty_output.stdout)
        .trim()
        .is_empty();

    Ok(GitBranchInfo { branch, dirty })
}

#[derive(Debug, Deserialize)]
pub struct GitCommitArgs {
    pub project_path: String,
    pub message: String,
    pub files: Option<Vec<String>>,
}

#[tauri::command]
pub async fn git_commit_and_push(args: GitCommitArgs) -> Result<serde_json::Value, String> {
    // Stage files
    let add_args = if let Some(ref files) = args.files {
        let mut a = vec!["add".to_string()];
        a.extend(files.clone());
        a
    } else {
        vec!["add".to_string(), ".".to_string()]
    };

    let add_output = Command::new("git")
        .args(&add_args)
        .current_dir(&args.project_path)
        .output()
        .await
        .map_err(|e| format!("git add failed: {}", e))?;

    if !add_output.status.success() {
        return Err(format!(
            "git add failed: {}",
            String::from_utf8_lossy(&add_output.stderr)
        ));
    }

    // Commit
    let commit_output = Command::new("git")
        .args(["commit", "-m", &args.message])
        .current_dir(&args.project_path)
        .output()
        .await
        .map_err(|e| format!("git commit failed: {}", e))?;

    if !commit_output.status.success() {
        let stderr = String::from_utf8_lossy(&commit_output.stderr).to_string();
        if stderr.contains("nothing to commit") {
            return Ok(serde_json::json!({ "success": true, "message": "Nothing to commit" }));
        }
        return Err(format!("git commit failed: {}", stderr));
    }

    // Push
    let push_output = Command::new("git")
        .args(["push"])
        .current_dir(&args.project_path)
        .output()
        .await
        .map_err(|e| format!("git push failed: {}", e))?;

    Ok(serde_json::json!({
        "success": push_output.status.success(),
        "commit_output": String::from_utf8_lossy(&commit_output.stdout).to_string(),
        "push_output": String::from_utf8_lossy(&push_output.stdout).to_string(),
    }))
}

#[tauri::command]
pub async fn git_status(project_path: String) -> Result<serde_json::Value, String> {
    let output = Command::new("git")
        .args(["status", "--porcelain", "-b"])
        .current_dir(&project_path)
        .output()
        .await
        .map_err(|e| format!("git status failed: {}", e))?;

    let status_text = String::from_utf8_lossy(&output.stdout).to_string();
    let lines: Vec<&str> = status_text.lines().collect();

    let branch = lines
        .first()
        .map(|l| l.trim_start_matches("## ").to_string())
        .unwrap_or_default();

    let changed_files: Vec<String> = lines
        .iter()
        .skip(1)
        .filter(|l| !l.is_empty())
        .map(|l| l.to_string())
        .collect();

    Ok(serde_json::json!({
        "branch": branch,
        "changed_files": changed_files,
        "is_clean": changed_files.is_empty(),
    }))
}

// ============================================================================
// Server/Dev process management (replaces /api/server/*)
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct StartServerArgs {
    pub project_path: String,
    pub command: Option<String>,
    pub port: Option<u16>,
}

#[derive(Debug, Serialize)]
pub struct ServerInfo {
    pub pid: u32,
    pub port: u16,
    pub project_path: String,
}

#[tauri::command]
pub async fn start_dev_server(args: StartServerArgs) -> Result<ServerInfo, String> {
    let command = args.command.unwrap_or_else(|| "npm".to_string());
    let port = args.port.unwrap_or(3000);

    let mut cmd = Command::new(&command);
    cmd.args(["run", "dev"])
        .current_dir(&args.project_path)
        .env("PORT", port.to_string())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped());

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x00000200);
    }

    let child = cmd
        .spawn()
        .map_err(|e| format!("Failed to start dev server: {}", e))?;

    let pid = child.id().unwrap_or(0);

    Ok(ServerInfo {
        pid,
        port,
        project_path: args.project_path,
    })
}

#[tauri::command]
pub async fn stop_dev_server(pid: u32) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        Command::new("taskkill")
            .args(["/F", "/PID", &pid.to_string(), "/T"])
            .output()
            .await
            .map_err(|e| format!("Failed to kill process: {}", e))?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        Command::new("kill")
            .args(["-9", &pid.to_string()])
            .output()
            .await
            .map_err(|e| format!("Failed to kill process: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub async fn scan_ports() -> Result<Vec<serde_json::Value>, String> {
    let output = Command::new("netstat")
        .args(["-ano"])
        .output()
        .await
        .map_err(|e| format!("netstat failed: {}", e))?;

    let text = String::from_utf8_lossy(&output.stdout);
    let mut ports: Vec<serde_json::Value> = Vec::new();

    for line in text.lines() {
        if line.contains("LISTENING") && line.contains("127.0.0.1:") {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 5 {
                if let Some(addr) = parts.get(1) {
                    if let Some(port_str) = addr.rsplit(':').next() {
                        if let Ok(port) = port_str.parse::<u16>() {
                            if (3000..=9999).contains(&port) {
                                let pid = parts.last().and_then(|p| p.parse::<u32>().ok()).unwrap_or(0);
                                ports.push(serde_json::json!({
                                    "port": port,
                                    "pid": pid,
                                    "address": addr,
                                }));
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(ports)
}
