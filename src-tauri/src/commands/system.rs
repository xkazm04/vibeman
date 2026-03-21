use tauri::State;
use crate::state::AppState;

#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello {}! Vibeman Tauri backend is running.", name)
}

#[tauri::command]
pub fn get_app_info(state: State<AppState>) -> serde_json::Value {
    serde_json::json!({
        "version": env!("CARGO_PKG_VERSION"),
        "started_at": state.started_at.to_rfc3339(),
        "uptime_seconds": (chrono::Utc::now() - state.started_at).num_seconds(),
        "platform": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
    })
}
