use serde::{de::DeserializeOwned, Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Priority {
    Critical,
    High,
    Medium,
    Low,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum ColumnKey {
    #[serde(rename = "todo")]
    Todo,
    #[serde(rename = "in-progress")]
    InProgress,
    #[serde(rename = "in-review")]
    InReview,
    #[serde(rename = "done")]
    Done,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PipelineStepState {
    Idle,
    Active,
    Done,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Card {
    pub id: String,
    pub title: String,
    pub description: String,
    pub priority: Priority,
    pub status: ColumnKey,
    pub project: String,
    pub pipeline: Vec<PipelineStepState>,
    pub terminal_id: Option<String>,
    pub current_step: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct KanbanData {
    pub cards: Vec<Card>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSettings {
    pub preview_port: u16,
    pub preview_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Workspace {
    pub id: String,
    pub name: String,
    pub path: String,
    pub dot: String,
    pub settings: WorkspaceSettings,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct WorkspacesData {
    pub workspaces: Vec<Workspace>,
}

/// Reads a JSON file, tolerating a missing file (returns `T::default()`) and a corrupted
/// one (backs it up to `.json.bak` and returns `T::default()`) — the file is never lost
/// or silently discarded without a copy.
pub(crate) fn read_json_with_recovery<T: DeserializeOwned + Default>(
    path: &Path,
) -> Result<(T, bool, Option<String>), String> {
    if !path.exists() {
        return Ok((T::default(), false, None));
    }

    let raw = fs::read_to_string(path).map_err(|e| format!("could not read {}: {e}", path.display()))?;

    match serde_json::from_str::<T>(&raw) {
        Ok(data) => Ok((data, false, None)),
        Err(_) => {
            let backup_path = path.with_extension("json.bak");
            fs::copy(path, &backup_path)
                .map_err(|e| format!("could not back up corrupted file {}: {e}", path.display()))?;
            Ok((T::default(), true, Some(backup_path.display().to_string())))
        }
    }
}

/// Writes `value` as pretty JSON atomically (write to a temp file, then rename).
pub(crate) fn write_json_atomic<T: Serialize>(path: &Path, value: &T) -> Result<(), String> {
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir).map_err(|e| format!("could not create {}: {e}", dir.display()))?;
    }
    let tmp_path = path.with_extension("json.tmp");
    let serialized = serde_json::to_string_pretty(value).map_err(|e| format!("could not serialize: {e}"))?;
    fs::write(&tmp_path, serialized).map_err(|e| format!("could not write {}: {e}", tmp_path.display()))?;
    fs::rename(&tmp_path, path).map_err(|e| format!("could not finalize {}: {e}", path.display()))?;
    Ok(())
}

fn kanban_path(app: &AppHandle, workspace_id: &str) -> Result<PathBuf, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("could not resolve app data dir: {e}"))?;
    Ok(data_dir.join("kanban").join(format!("{workspace_id}.json")))
}

fn workspaces_path(app: &AppHandle) -> Result<PathBuf, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("could not resolve app data dir: {e}"))?;
    Ok(data_dir.join("workspaces.json"))
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoadKanbanResponse {
    pub cards: Vec<Card>,
    pub recovered_from_corruption: bool,
    pub backup_path: Option<String>,
}

#[tauri::command]
pub fn load_kanban(app: AppHandle, workspace_id: String) -> Result<LoadKanbanResponse, String> {
    let path = kanban_path(&app, &workspace_id)?;
    let (data, recovered_from_corruption, backup_path) = read_json_with_recovery::<KanbanData>(&path)?;
    Ok(LoadKanbanResponse { cards: data.cards, recovered_from_corruption, backup_path })
}

#[tauri::command]
pub fn save_kanban(app: AppHandle, workspace_id: String, cards: Vec<Card>) -> Result<(), String> {
    let path = kanban_path(&app, &workspace_id)?;
    write_json_atomic(&path, &KanbanData { cards })
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoadWorkspacesResponse {
    pub workspaces: Vec<Workspace>,
    pub recovered_from_corruption: bool,
    pub backup_path: Option<String>,
}

#[tauri::command]
pub fn load_workspaces(app: AppHandle) -> Result<LoadWorkspacesResponse, String> {
    let path = workspaces_path(&app)?;
    let (data, recovered_from_corruption, backup_path) = read_json_with_recovery::<WorkspacesData>(&path)?;
    Ok(LoadWorkspacesResponse { workspaces: data.workspaces, recovered_from_corruption, backup_path })
}

#[tauri::command]
pub fn save_workspaces(app: AppHandle, workspaces: Vec<Workspace>) -> Result<(), String> {
    let path = workspaces_path(&app)?;
    write_json_atomic(&path, &WorkspacesData { workspaces })
}
