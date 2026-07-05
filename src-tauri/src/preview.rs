use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

const WINDOW_LABEL: &str = "preview";

/// Opens (or refocuses/redirects) the floating Preview Web window for `url`.
/// Loads the bundled `preview.html` wrapper instead of navigating directly to `url`,
/// since a raw WebviewWindow has no chrome — the wrapper adds the refresh button.
#[tauri::command]
pub fn open_preview(app: AppHandle, url: String) -> Result<(), String> {
    let target = format!("preview.html?url={}", urlencoding::encode(&url));

    if let Some(existing) = app.get_webview_window(WINDOW_LABEL) {
        existing.set_focus().map_err(|e| e.to_string())?;
        let script = format!("window.location.replace({:?})", target);
        existing.eval(&script).map_err(|e| e.to_string())?;
        return Ok(());
    }

    WebviewWindowBuilder::new(&app, WINDOW_LABEL, WebviewUrl::App(target.into()))
        .title("Preview")
        .inner_size(1000.0, 720.0)
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
}
