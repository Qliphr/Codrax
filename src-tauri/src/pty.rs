use portable_pty::{native_pty_system, Child, CommandBuilder, MasterPty, PtySize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Emitter, State};

/// Hard cap on simultaneous PTYs, independent of Free/Pro tier — a system-level guard rail.
const MAX_PTYS: usize = 8;
/// Grace period between SIGTERM and the forceful SIGKILL fallback on Unix.
const KILL_GRACE: Duration = Duration::from_secs(5);

struct PtySession {
    writer: Mutex<Box<dyn Write + Send>>,
    master: Box<dyn MasterPty + Send>,
    child: Arc<Mutex<Box<dyn Child + Send + Sync>>>,
}

#[derive(Clone, Default)]
pub struct PtyRegistry(Arc<Mutex<HashMap<String, PtySession>>>);

fn default_shell() -> String {
    #[cfg(windows)]
    {
        "powershell.exe".to_string()
    }
    #[cfg(unix)]
    {
        std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string())
    }
}

fn emit_exit(app: &AppHandle, terminal_id: &str, code: i32) {
    let _ = app.emit(&format!("pty://exit/{terminal_id}"), code);
}

#[tauri::command]
pub fn spawn_pty(
    app: AppHandle,
    registry: State<PtyRegistry>,
    terminal_id: String,
    cwd: Option<String>,
) -> Result<(), String> {
    let mut map = registry.0.lock().map_err(|e| e.to_string())?;
    if map.len() >= MAX_PTYS {
        return Err(format!("maximum of {MAX_PTYS} simultaneous terminals reached"));
    }
    if map.contains_key(&terminal_id) {
        return Err(format!("terminal {terminal_id} already exists"));
    }

    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(PtySize { rows: 24, cols: 80, pixel_width: 0, pixel_height: 0 })
        .map_err(|e| format!("could not allocate pty: {e}"))?;

    let mut cmd = CommandBuilder::new(default_shell());
    if let Some(dir) = cwd {
        cmd.cwd(dir);
    }

    let child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("could not spawn shell: {e}"))?;
    drop(pair.slave);

    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| format!("could not clone pty reader: {e}"))?;
    let writer = pair
        .master
        .take_writer()
        .map_err(|e| format!("could not open pty writer: {e}"))?;

    let child = Arc::new(Mutex::new(child));

    map.insert(
        terminal_id.clone(),
        PtySession { writer: Mutex::new(writer), master: pair.master, child: child.clone() },
    );
    drop(map);

    let app_for_thread = app.clone();
    let registry_for_thread = registry.0.clone();
    let terminal_id_for_thread = terminal_id.clone();
    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let chunk = String::from_utf8_lossy(&buf[..n]).into_owned();
                    let _ = app_for_thread.emit(&format!("pty://output/{terminal_id_for_thread}"), chunk);
                }
                Err(_) => break,
            }
        }

        let code = child
            .lock()
            .ok()
            .and_then(|mut c| c.wait().ok())
            .map(|status| status.exit_code() as i32)
            .unwrap_or(-1);

        if let Ok(mut map) = registry_for_thread.lock() {
            map.remove(&terminal_id_for_thread);
        }
        emit_exit(&app_for_thread, &terminal_id_for_thread, code);
    });

    Ok(())
}

#[tauri::command]
pub fn write_pty(registry: State<PtyRegistry>, terminal_id: String, data: String) -> Result<(), String> {
    let map = registry.0.lock().map_err(|e| e.to_string())?;
    let session = map.get(&terminal_id).ok_or_else(|| format!("no such terminal: {terminal_id}"))?;
    let mut writer = session.writer.lock().map_err(|e| e.to_string())?;
    writer.write_all(data.as_bytes()).map_err(|e| format!("write failed: {e}"))?;
    Ok(())
}

#[tauri::command]
pub fn resize_pty(registry: State<PtyRegistry>, terminal_id: String, cols: u16, rows: u16) -> Result<(), String> {
    let map = registry.0.lock().map_err(|e| e.to_string())?;
    let session = map.get(&terminal_id).ok_or_else(|| format!("no such terminal: {terminal_id}"))?;
    session
        .master
        .resize(PtySize { rows, cols, pixel_width: 0, pixel_height: 0 })
        .map_err(|e| format!("resize failed: {e}"))?;
    Ok(())
}

/// Terminates the shell for `terminal_id`: SIGTERM then a 5s-grace SIGKILL fallback on Unix,
/// a direct TerminateProcess on Windows (portable-pty's `Child::kill` already does this).
#[tauri::command]
pub fn kill_pty(app: AppHandle, registry: State<PtyRegistry>, terminal_id: String) -> Result<(), String> {
    let map = registry.0.lock().map_err(|e| e.to_string())?;
    let session = map.get(&terminal_id).ok_or_else(|| format!("no such terminal: {terminal_id}"))?;
    let child = session.child.clone();
    drop(map);

    #[cfg(unix)]
    {
        let pid = child.lock().ok().and_then(|c| c.process_id());
        if let Some(pid) = pid {
            unsafe {
                libc::kill(pid as i32, libc::SIGTERM);
            }
            let registry_for_thread = registry.0.clone();
            let app_for_thread = app.clone();
            let terminal_id_for_thread = terminal_id.clone();
            std::thread::spawn(move || {
                std::thread::sleep(KILL_GRACE);
                let mut still_running = false;
                if let Ok(mut c) = child.lock() {
                    match c.try_wait() {
                        Ok(None) => {
                            still_running = true;
                            let _ = c.kill();
                        }
                        _ => {}
                    }
                }
                if still_running {
                    if let Ok(mut map) = registry_for_thread.lock() {
                        map.remove(&terminal_id_for_thread);
                    }
                    emit_exit(&app_for_thread, &terminal_id_for_thread, -1);
                }
            });
        }
        return Ok(());
    }

    #[cfg(windows)]
    {
        if let Ok(mut c) = child.lock() {
            let _ = c.kill();
        }
        if let Ok(mut map) = registry.0.lock() {
            map.remove(&terminal_id);
        }
        emit_exit(&app, &terminal_id, -1);
        Ok(())
    }
}

/// Kills every live PTY — called on app exit so no shell is ever left orphaned.
pub fn kill_all(registry: &PtyRegistry) {
    if let Ok(mut map) = registry.0.lock() {
        for (_, session) in map.drain() {
            if let Ok(mut c) = session.child.lock() {
                let _ = c.kill();
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Read;

    /// Exercises the same portable-pty calls `spawn_pty` uses, without the Tauri glue:
    /// spawn a real shell, run a command, read its output, and confirm clean exit.
    #[test]
    fn spawns_shell_and_captures_output() {
        let pty_system = native_pty_system();
        let pair = pty_system
            .openpty(PtySize { rows: 24, cols: 80, pixel_width: 0, pixel_height: 0 })
            .expect("openpty");

        let cmd = CommandBuilder::new(default_shell());
        let mut child = pair.slave.spawn_command(cmd).expect("spawn shell");
        drop(pair.slave);

        let mut reader = pair.master.try_clone_reader().expect("clone reader");
        let mut writer = pair.master.take_writer().expect("take writer");

        writer.write_all(b"echo codrax-pty-smoke-test\n").expect("write");
        writer.write_all(b"exit\n").expect("write exit");
        drop(writer);

        let mut output = String::new();
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => output.push_str(&String::from_utf8_lossy(&buf[..n])),
                Err(_) => break,
            }
        }

        let status = child.wait().expect("wait for child");
        assert!(output.contains("codrax-pty-smoke-test"), "unexpected pty output: {output:?}");
        assert_eq!(status.exit_code(), 0);
    }
}
