/// Max length of a card title, enforced both here and in the Zustand store — never trust
/// only the frontend validation since commands are injected into a real shell.
pub const MAX_TITLE_LEN: usize = 500;

const ALLOWED_PLACEHOLDERS: [&str; 3] = ["task", "description", "prev_output"];

/// Escapes a user-controlled value for safe interpolation into a POSIX shell command:
/// wraps it in single quotes and escapes any single quote inside.
/// "add 'dark' mode; rm -rf /" -> 'add '\''dark'\'' mode; rm -rf /'
pub fn shell_escape_posix(input: &str) -> String {
    format!("'{}'", input.replace('\'', r"'\''"))
}

/// Escapes a user-controlled value for safe interpolation into a PowerShell command:
/// wraps it in single quotes and doubles any single quote inside.
pub fn shell_escape_windows(input: &str) -> String {
    format!("'{}'", input.replace('\'', "''"))
}

fn escape_for_platform(input: &str) -> String {
    #[cfg(windows)]
    {
        shell_escape_windows(input)
    }
    #[cfg(not(windows))]
    {
        shell_escape_posix(input)
    }
}

/// Appends a completion sentinel that echoes the real exit code once the resolved command
/// returns control to the shell — lets the frontend detect "agent finished its turn" by
/// scanning stdout instead of relying on the shell process itself exiting.
fn append_turn_sentinel(command: &str) -> String {
    #[cfg(windows)]
    {
        format!("{command}; Write-Output \"@@CDRX_DONE:$LASTEXITCODE@@\"")
    }
    #[cfg(not(windows))]
    {
        format!("{command}; printf '@@CDRX_DONE:%s@@\\n' \"$?\"")
    }
}

fn validate_placeholders(template: &str) -> Result<(), String> {
    let mut i = 0;
    while let Some(rel_start) = template[i..].find('{') {
        let start = i + rel_start;
        match template[start..].find('}') {
            Some(rel_end) => {
                let name = &template[start + 1..start + rel_end];
                if !ALLOWED_PLACEHOLDERS.contains(&name) {
                    return Err(format!("unknown placeholder {{{name}}} in pipeline command"));
                }
                i = start + rel_end + 1;
            }
            None => break,
        }
    }
    Ok(())
}

/// Resolves a pipeline step's command template (e.g. `claude "{task}"`) by substituting
/// only the documented placeholders with shell-escaped values — never raw string interpolation.
#[tauri::command]
pub fn resolve_pipeline_command(
    template: String,
    task: String,
    description: String,
    prev_output: Option<String>,
) -> Result<String, String> {
    if task.chars().count() > MAX_TITLE_LEN {
        return Err(format!("task title exceeds {MAX_TITLE_LEN} characters"));
    }
    validate_placeholders(&template)?;

    let mut resolved = template.replace("{task}", &escape_for_platform(&task));
    resolved = resolved.replace("{description}", &escape_for_platform(&description));
    if let Some(prev) = prev_output {
        resolved = resolved.replace("{prev_output}", &escape_for_platform(&prev));
    }
    Ok(append_turn_sentinel(&resolved))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolve_pipeline_command_appends_turn_sentinel() {
        let resolved = resolve_pipeline_command(
            "claude -p \"{task}\"".to_string(),
            "fix bug".to_string(),
            String::new(),
            None,
        )
        .unwrap();

        #[cfg(not(windows))]
        assert!(resolved.ends_with("; printf '@@CDRX_DONE:%s@@\\n' \"$?\""));
        #[cfg(windows)]
        assert!(resolved.ends_with("; Write-Output \"@@CDRX_DONE:$LASTEXITCODE@@\""));
    }
}
