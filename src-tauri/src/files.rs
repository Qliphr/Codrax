use serde::Serialize;
use std::cmp::Ordering;
use std::fs;
use std::path::Path;

const EXCLUDED_DIRS: &[&str] = &[
    "node_modules",
    "target",
    "dist",
    "dist-node",
    "build",
    "__pycache__",
    "venv",
    ".cache",
    ".turbo",
    ".git",
];
const MAX_DEPTH: u32 = 4;
const MAX_ENTRIES: usize = 500;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileEntry {
    pub path: String,
    pub name: String,
    pub depth: u32,
    pub dir: bool,
}

/// Whether a workspace's folder is still there — used to grey it out and offer
/// Relocate/Remove when a folder was deleted or renamed outside the app.
#[tauri::command]
pub fn check_path_exists(path: String) -> bool {
    Path::new(&crate::paths::expand_tilde(&path)).is_dir()
}

/// Lists a workspace's file tree, flattened depth-first (dirs before files, alphabetical).
/// Skips dotfiles/dirs (unless `show_hidden`) and common build-output noise, and caps
/// depth/entry count so a huge repo can't hang the sidebar.
#[tauri::command]
pub fn list_files(path: String, show_hidden: bool) -> Result<Vec<FileEntry>, String> {
    let path = crate::paths::expand_tilde(&path);
    let root = Path::new(&path);
    if !root.is_dir() {
        return Ok(Vec::new());
    }
    let mut out = Vec::new();
    walk(root, root, 0, show_hidden, &mut out);
    Ok(out)
}

fn walk(root: &Path, dir: &Path, depth: u32, show_hidden: bool, out: &mut Vec<FileEntry>) {
    if depth > MAX_DEPTH || out.len() >= MAX_ENTRIES {
        return;
    }

    let mut entries: Vec<_> = match fs::read_dir(dir) {
        Ok(rd) => rd.filter_map(|e| e.ok()).collect(),
        Err(_) => return,
    };

    entries.sort_by(|a, b| {
        let a_dir = a.path().is_dir();
        let b_dir = b.path().is_dir();
        match (a_dir, b_dir) {
            (true, false) => Ordering::Less,
            (false, true) => Ordering::Greater,
            _ => a
                .file_name()
                .to_string_lossy()
                .to_lowercase()
                .cmp(&b.file_name().to_string_lossy().to_lowercase()),
        }
    });

    for entry in entries {
        if out.len() >= MAX_ENTRIES {
            return;
        }

        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with('.') && !show_hidden {
            continue;
        }

        let entry_path = entry.path();
        let is_dir = entry_path.is_dir();
        if is_dir && EXCLUDED_DIRS.contains(&name.as_str()) {
            continue;
        }

        let rel_path = entry_path
            .strip_prefix(root)
            .unwrap_or(&entry_path)
            .to_string_lossy()
            .replace('\\', "/");
        out.push(FileEntry { path: rel_path, name, depth, dir: is_dir });

        if is_dir {
            walk(root, &entry_path, depth + 1, show_hidden, out);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn lists_files_excluding_noise_dirs_and_dotfiles() {
        let dir = tempfile::tempdir().expect("tempdir");
        fs::create_dir_all(dir.path().join("src/nested")).unwrap();
        fs::create_dir_all(dir.path().join("node_modules/pkg")).unwrap();
        fs::write(dir.path().join("src/main.rs"), "").unwrap();
        fs::write(dir.path().join("src/nested/util.rs"), "").unwrap();
        fs::write(dir.path().join("node_modules/pkg/index.js"), "").unwrap();
        fs::write(dir.path().join(".hidden"), "").unwrap();
        fs::write(dir.path().join("Cargo.toml"), "").unwrap();

        let entries = list_files(dir.path().to_string_lossy().to_string(), false).expect("ok");
        let paths: Vec<&str> = entries.iter().map(|e| e.path.as_str()).collect();

        assert!(paths.contains(&"src"));
        assert!(paths.contains(&"src/main.rs"));
        assert!(paths.contains(&"src/nested"));
        assert!(paths.contains(&"src/nested/util.rs"));
        assert!(paths.contains(&"Cargo.toml"));
        assert!(!paths.iter().any(|p| p.starts_with("node_modules")));
        assert!(!paths.contains(&".hidden"));

        // dirs listed before files at the same level
        let src_idx = paths.iter().position(|p| *p == "src").unwrap();
        let cargo_idx = paths.iter().position(|p| *p == "Cargo.toml").unwrap();
        assert!(src_idx < cargo_idx);
    }

    #[test]
    fn show_hidden_includes_dotfiles() {
        let dir = tempfile::tempdir().expect("tempdir");
        fs::write(dir.path().join(".hidden"), "").unwrap();

        let entries = list_files(dir.path().to_string_lossy().to_string(), true).expect("ok");
        let paths: Vec<&str> = entries.iter().map(|e| e.path.as_str()).collect();
        assert!(paths.contains(&".hidden"));
    }

    #[test]
    fn show_hidden_skips_git_dir_and_keeps_normal_files() {
        let dir = tempfile::tempdir().expect("tempdir");
        fs::create_dir_all(dir.path().join(".git/objects")).unwrap();
        for i in 0..10 {
            fs::write(dir.path().join(format!(".git/objects/f{i}")), "").unwrap();
        }
        fs::write(dir.path().join(".env"), "").unwrap();
        fs::write(dir.path().join("Cargo.toml"), "").unwrap();

        let entries = list_files(dir.path().to_string_lossy().to_string(), true).expect("ok");
        let paths: Vec<&str> = entries.iter().map(|e| e.path.as_str()).collect();

        assert!(!paths.iter().any(|p| p.starts_with(".git")));
        assert!(paths.contains(&".env"));
        assert!(paths.contains(&"Cargo.toml"));
    }

    #[test]
    fn returns_empty_for_missing_path() {
        let entries = list_files("/definitely/does/not/exist".to_string(), false).expect("ok");
        assert!(entries.is_empty());
    }

    #[test]
    fn check_path_exists_distinguishes_real_from_missing() {
        let dir = tempfile::tempdir().expect("tempdir");
        assert!(check_path_exists(dir.path().to_string_lossy().to_string()));
        assert!(!check_path_exists("/definitely/does/not/exist".to_string()));
    }
}
