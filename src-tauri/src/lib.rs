mod commands;
mod db;
mod fs;
mod process;
mod runtime;
mod state;

use tauri::{
    Manager,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // System tray
            let quit = MenuItem::with_id(app, "quit", "Quit Vibeman", true, None::<&str>)?;
            let show = MenuItem::with_id(app, "show", "Show Window", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quit])?;

            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("Vibeman - AI Development Platform")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            // Get DB path from env or use default
            let db_path = std::env::var("DB_PATH").ok();
            let app_state = state::AppState::new(db_path.as_deref())?;
            app.manage(app_state);

            log::info!("Vibeman Tauri app initialized");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // System
            commands::greet,
            commands::get_app_info,
            // Process management
            commands::spawn_cli,
            commands::kill_process,
            commands::process_status,
            commands::list_processes,
            // Filesystem
            commands::scan_directory,
            commands::read_file,
            commands::write_file,
            commands::check_file_exists,
            commands::batch_read_files,
            commands::search_files,
            commands::analyze_file_dependencies,
            commands::get_project_structure,
            // Database
            commands::db_query,
            commands::db_execute,
            commands::db_health,
            // Domain repositories
            commands::get_projects,
            commands::create_project,
            commands::get_contexts,
            commands::get_context_groups,
            commands::get_goals,
            commands::get_ideas,
            commands::update_idea_status,
            commands::get_events,
            commands::create_event,
            commands::get_implementation_logs,
            commands::get_scans,
            // Claude Code execution
            commands::execute_claude,
            commands::abort_claude,
            commands::claude_execution_status,
            // Brain & Intelligence
            commands::get_brain_dashboard,
            commands::get_brain_signals,
            commands::get_brain_insights,
            commands::get_directions,
            commands::get_direction_stats,
            commands::get_questions,
            commands::get_collective_memory,
            // Conductor & TaskRunner
            commands::get_conductor_runs,
            commands::get_conductor_status,
            commands::get_scan_queue,
            commands::update_scan_queue_item,
            commands::get_cross_tasks,
            commands::get_scan_notifications,
            // Git & Server
            commands::git_get_branch,
            commands::git_commit_and_push,
            commands::git_status,
            commands::start_dev_server,
            commands::stop_dev_server,
            commands::scan_ports,
            // Social & Integrations
            commands::get_social_configs,
            commands::get_social_discoveries,
            commands::get_integrations,
            commands::get_integration_events,
            commands::get_remote_devices,
            commands::get_remote_commands,
            // Lifecycle & Context Management
            commands::get_standups,
            commands::get_group_health_scans,
            commands::get_context_group_relationships,
            commands::get_external_requirements,
            commands::get_workspaces,
            commands::tinder_action,
            commands::get_tinder_items,
            commands::get_dependency_scans,
            commands::get_discovered_templates,
            // System & Misc
            commands::get_system_status,
            commands::get_db_performance,
            commands::get_observability_stats,
            commands::get_schema_intelligence,
            commands::get_generation_history,
            commands::check_llm_providers,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Vibeman");
}
