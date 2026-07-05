use crate::storage::{read_json_with_recovery, write_json_atomic};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomProvider {
    pub name: String,
    pub cli: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct ProvidersData {
    custom: Vec<CustomProvider>,
}

fn providers_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("could not resolve app data dir: {e}"))?;
    Ok(data_dir.join("providers.json"))
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoadCustomProvidersResponse {
    pub custom: Vec<CustomProvider>,
    pub recovered_from_corruption: bool,
    pub backup_path: Option<String>,
}

#[tauri::command]
pub fn load_custom_providers(app: AppHandle) -> Result<LoadCustomProvidersResponse, String> {
    let path = providers_path(&app)?;
    let (data, recovered_from_corruption, backup_path) = read_json_with_recovery::<ProvidersData>(&path)?;
    Ok(LoadCustomProvidersResponse { custom: data.custom, recovered_from_corruption, backup_path })
}

#[tauri::command]
pub fn save_custom_providers(app: AppHandle, custom: Vec<CustomProvider>) -> Result<(), String> {
    let path = providers_path(&app)?;
    write_json_atomic(&path, &ProvidersData { custom })
}

/// Checks each given CLI name against PATH, returning `{ cli: found }`.
#[tauri::command]
pub fn detect_binaries(clis: Vec<String>) -> HashMap<String, bool> {
    clis.into_iter().map(|cli| { let found = which::which(&cli).is_ok(); (cli, found) }).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_a_binary_that_really_exists_and_one_that_does_not() {
        let result = detect_binaries(vec!["git".to_string(), "totally-not-a-real-cli-xyz".to_string()]);
        assert_eq!(result.get("git"), Some(&true));
        assert_eq!(result.get("totally-not-a-real-cli-xyz"), Some(&false));
    }
}
