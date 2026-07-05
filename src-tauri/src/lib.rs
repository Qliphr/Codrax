mod files;
mod git;
mod pipeline;
mod preview;
mod providers;
mod pty;
mod storage;

use pty::PtyRegistry;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(PtyRegistry::default())
        .invoke_handler(tauri::generate_handler![
            storage::load_kanban,
            storage::save_kanban,
            storage::load_workspaces,
            storage::save_workspaces,
            pty::spawn_pty,
            pty::write_pty,
            pty::resize_pty,
            pty::kill_pty,
            pipeline::resolve_pipeline_command,
            git::git_status,
            git::init_repo,
            git::auto_commit,
            git::git_changed_paths,
            git::check_git_identity,
            git::git_log,
            preview::open_preview,
            files::list_files,
            files::check_path_exists,
            providers::load_custom_providers,
            providers::save_custom_providers,
            providers::detect_binaries,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::ExitRequested { .. } = event {
                let registry = app_handle.state::<PtyRegistry>();
                pty::kill_all(&registry);
            }
        });
}
