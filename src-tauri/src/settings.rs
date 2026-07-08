use crate::storage::{read_json_with_recovery, write_json_atomic};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// App-level (not per-workspace) preferences — currently just the terminal shell.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    /// Shell binary spawned for new PTYs, e.g. "/bin/zsh" or "powershell.exe".
    /// None/empty falls back to `$SHELL` (Unix) or `powershell.exe` (Windows).
    pub terminal_shell: Option<String>,
}

fn settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    let data_dir = app.path().app_data_dir().map_err(|e| format!("could not resolve app data dir: {e}"))?;
    Ok(data_dir.join("settings.json"))
}

#[tauri::command]
pub fn load_app_settings(app: AppHandle) -> Result<AppSettings, String> {
    let path = settings_path(&app)?;
    let (data, _, _) = read_json_with_recovery::<AppSettings>(&path)?;
    Ok(data)
}

#[tauri::command]
pub fn save_app_settings(app: AppHandle, settings: AppSettings) -> Result<(), String> {
    let path = settings_path(&app)?;
    write_json_atomic(&path, &settings)
}
