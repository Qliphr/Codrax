use notify::{RecursiveMode, Watcher};
use std::collections::HashMap;
use std::sync::mpsc::channel;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Emitter, State};

/// Coalesces bursts of fs events (e.g. an editor writing many files in one save)
/// into a single frontend refresh instead of one per touched file.
const DEBOUNCE: Duration = Duration::from_millis(300);

struct WatchSession {
    _watcher: notify::RecommendedWatcher,
    stop: Arc<Mutex<bool>>,
}

#[derive(Clone, Default)]
pub struct WatchRegistry(Arc<Mutex<HashMap<String, WatchSession>>>);

fn emit_changed(app: &AppHandle, key: &str) {
    let _ = app.emit(&format!("fs://changed/{key}"), ());
}

/// Watches a workspace root for filesystem changes and emits `fs://changed/{path}`
/// (debounced) so the sidebar file tree can refetch — covers edits made by an AI agent
/// running in a terminal pane, not just user actions inside the app.
#[tauri::command]
pub fn watch_workspace(app: AppHandle, registry: State<WatchRegistry>, path: String) -> Result<(), String> {
    let mut map = registry.0.lock().map_err(|e| e.to_string())?;
    if map.contains_key(&path) {
        return Ok(());
    }

    let root = crate::paths::expand_tilde(&path);
    let (tx, rx) = channel();
    let mut watcher = notify::recommended_watcher(tx).map_err(|e| e.to_string())?;
    watcher
        .watch(std::path::Path::new(&root), RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;

    let stop = Arc::new(Mutex::new(false));
    let stop_for_thread = stop.clone();
    let app_for_thread = app.clone();
    let key_for_thread = path.clone();

    std::thread::spawn(move || loop {
        match rx.recv() {
            Ok(_) => {
                if *stop_for_thread.lock().unwrap_or_else(|e| e.into_inner()) {
                    break;
                }
                // Drain anything else that arrives during the debounce window so a burst
                // of writes collapses into one emit.
                while rx.recv_timeout(DEBOUNCE).is_ok() {}
                if *stop_for_thread.lock().unwrap_or_else(|e| e.into_inner()) {
                    break;
                }
                emit_changed(&app_for_thread, &key_for_thread);
            }
            Err(_) => break,
        }
    });

    map.insert(path, WatchSession { _watcher: watcher, stop });
    Ok(())
}

#[tauri::command]
pub fn unwatch_workspace(registry: State<WatchRegistry>, path: String) -> Result<(), String> {
    let mut map = registry.0.lock().map_err(|e| e.to_string())?;
    if let Some(session) = map.remove(&path) {
        if let Ok(mut stop) = session.stop.lock() {
            *stop = true;
        }
    }
    Ok(())
}
