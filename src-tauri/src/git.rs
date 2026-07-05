use git2::{IndexAddOption, Oid, Repository, Sort};
use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitChange {
    pub tag: String,
    pub path: String,
}

#[derive(Debug, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum GitStatusResponse {
    NotARepo,
    Ok { branch: String, ahead: usize, changes: Vec<GitChange> },
}

fn status_tag(status: git2::Status) -> Option<&'static str> {
    if status.is_wt_new() || status.is_index_new() {
        Some("A")
    } else if status.is_wt_deleted() || status.is_index_deleted() {
        Some("D")
    } else if status.is_wt_modified()
        || status.is_index_modified()
        || status.is_wt_renamed()
        || status.is_index_renamed()
    {
        Some("M")
    } else {
        None
    }
}

fn compute_ahead(repo: &Repository) -> Option<usize> {
    let head = repo.head().ok()?;
    let local_oid = head.target()?;
    let branch_name = head.shorthand().ok()?;
    let upstream_oid = repo.refname_to_id(&format!("refs/remotes/origin/{branch_name}")).ok()?;
    let (ahead, _behind) = repo.graph_ahead_behind(local_oid, upstream_oid).ok()?;
    Some(ahead)
}

#[tauri::command]
pub fn git_status(path: String) -> Result<GitStatusResponse, String> {
    let repo = match Repository::open(&path) {
        Ok(r) => r,
        Err(_) => return Ok(GitStatusResponse::NotARepo),
    };

    let branch = repo
        .head()
        .ok()
        .and_then(|h| h.shorthand().ok().map(str::to_string))
        .unwrap_or_else(|| "HEAD".to_string());
    let ahead = compute_ahead(&repo).unwrap_or(0);

    let mut opts = git2::StatusOptions::new();
    opts.include_untracked(true);
    let statuses = repo.statuses(Some(&mut opts)).map_err(|e| e.to_string())?;

    let changes = statuses
        .iter()
        .filter_map(|entry| {
            let tag = status_tag(entry.status())?;
            let path = entry.path().ok()?.to_string();
            Some(GitChange { tag: tag.to_string(), path })
        })
        .collect();

    Ok(GitStatusResponse::Ok { branch, ahead, changes })
}

/// Initializes a git repo at `path` — used when a workspace is added without one.
#[tauri::command]
pub fn init_repo(path: String) -> Result<(), String> {
    Repository::init(&path).map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Debug, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum CommitResponse {
    NothingToCommit,
    Committed { oid: String },
    Failed { message: String },
}

/// `git add . && git commit -m message`. Never returns a hard error for ordinary git
/// failures (missing identity, hooks, nothing staged) — those are business outcomes the
/// caller surfaces as a toast, per the "never block the board on a git problem" rule.
#[tauri::command]
pub fn auto_commit(path: String, message: String) -> Result<CommitResponse, String> {
    let repo = Repository::open(&path).map_err(|e| format!("not a git repo: {e}"))?;

    let mut index = repo.index().map_err(|e| e.to_string())?;
    index
        .add_all(["."].iter(), IndexAddOption::DEFAULT, None)
        .map_err(|e| e.to_string())?;
    index.write().map_err(|e| e.to_string())?;

    let tree_oid = index.write_tree().map_err(|e| e.to_string())?;
    let tree = repo.find_tree(tree_oid).map_err(|e| e.to_string())?;

    let parent_commit = repo.head().ok().and_then(|h| h.peel_to_commit().ok());

    let unchanged = parent_commit
        .as_ref()
        .and_then(|p| p.tree().ok())
        .map(|t| t.id() == tree_oid)
        .unwrap_or(false);
    if unchanged {
        return Ok(CommitResponse::NothingToCommit);
    }

    let sig = match repo.signature() {
        Ok(s) => s,
        Err(e) => return Ok(CommitResponse::Failed { message: format!("git identity not configured: {e}") }),
    };

    let parents: Vec<&git2::Commit> = parent_commit.iter().collect();
    match repo.commit(Some("HEAD"), &sig, &sig, &message, &tree, &parents) {
        Ok(oid) => Ok(CommitResponse::Committed { oid: oid.to_string() }),
        Err(e) => Ok(CommitResponse::Failed { message: e.to_string() }),
    }
}

/// Whether `user.name`/`user.email` are configured — checked at workspace load to show
/// the "configure git identity" warning banner before any commit is attempted.
#[tauri::command]
pub fn check_git_identity() -> Result<bool, String> {
    let config = git2::Config::open_default().map_err(|e| e.to_string())?;
    Ok(config.get_string("user.name").is_ok() && config.get_string("user.email").is_ok())
}

const GIT_LOG_LIMIT: usize = 60;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitCommit {
    pub oid: String,
    pub short_oid: String,
    pub summary: String,
    pub author: String,
    pub timestamp: i64,
    pub parents: Vec<String>,
    pub lane: usize,
}

#[derive(Debug, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum GitLogResponse {
    NotARepo,
    Ok { commits: Vec<GitCommit> },
}

/// Walks HEAD's history topologically and assigns each commit a lane index so the
/// frontend can draw a commit graph (straight line per lane, merges join across lanes)
/// without re-implementing graph layout in TS.
#[tauri::command]
pub fn git_log(path: String) -> Result<GitLogResponse, String> {
    let repo = match Repository::open(&path) {
        Ok(r) => r,
        Err(_) => return Ok(GitLogResponse::NotARepo),
    };

    let mut revwalk = match repo.revwalk() {
        Ok(w) => w,
        Err(_) => return Ok(GitLogResponse::Ok { commits: vec![] }),
    };
    if revwalk.push_head().is_err() {
        // Unborn HEAD (repo with no commits yet) — not an error, just empty history.
        return Ok(GitLogResponse::Ok { commits: vec![] });
    }
    revwalk
        .set_sorting(Sort::TOPOLOGICAL | Sort::TIME)
        .map_err(|e| e.to_string())?;

    let mut active: Vec<Option<Oid>> = Vec::new();
    let mut commits = Vec::with_capacity(GIT_LOG_LIMIT);

    for oid_result in revwalk.take(GIT_LOG_LIMIT) {
        let oid = oid_result.map_err(|e| e.to_string())?;
        let commit = repo.find_commit(oid).map_err(|e| e.to_string())?;

        let lane = if let Some(pos) = active.iter().position(|slot| *slot == Some(oid)) {
            pos
        } else if let Some(pos) = active.iter().position(|slot| slot.is_none()) {
            active[pos] = Some(oid);
            pos
        } else {
            active.push(Some(oid));
            active.len() - 1
        };

        let parents: Vec<Oid> = commit.parent_ids().collect();
        if parents.is_empty() {
            active[lane] = None;
        } else {
            active[lane] = Some(parents[0]);
            for extra in &parents[1..] {
                if active.iter().any(|slot| *slot == Some(*extra)) {
                    continue;
                }
                if let Some(pos) = active.iter().position(|slot| slot.is_none()) {
                    active[pos] = Some(*extra);
                } else {
                    active.push(Some(*extra));
                }
            }
        }

        let oid_str = oid.to_string();
        commits.push(GitCommit {
            short_oid: oid_str[..7.min(oid_str.len())].to_string(),
            oid: oid_str,
            summary: commit.summary().unwrap_or(Some("(no message)")).unwrap_or("(no message)").to_string(),
            author: commit.author().name().unwrap_or("unknown").to_string(),
            timestamp: commit.time().seconds(),
            parents: parents.iter().map(Oid::to_string).collect(),
            lane,
        });
    }

    Ok(GitLogResponse::Ok { commits })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::process::Command;

    fn init_test_repo() -> tempfile::TempDir {
        let dir = tempfile::tempdir().expect("tempdir");
        Repository::init(dir.path()).expect("init repo");
        Command::new("git")
            .args(["config", "user.name", "Codrax Test"])
            .current_dir(dir.path())
            .status()
            .expect("git config name");
        Command::new("git")
            .args(["config", "user.email", "test@codrax.dev"])
            .current_dir(dir.path())
            .status()
            .expect("git config email");
        dir
    }

    #[test]
    fn reports_not_a_repo_for_plain_directory() {
        let dir = tempfile::tempdir().expect("tempdir");
        let result = git_status(dir.path().to_string_lossy().to_string()).expect("command ok");
        assert!(matches!(result, GitStatusResponse::NotARepo));
    }

    #[test]
    fn status_and_commit_roundtrip() {
        let dir = init_test_repo();
        let path = dir.path().to_string_lossy().to_string();

        fs::write(dir.path().join("file.txt"), "hello").expect("write file");

        let status = git_status(path.clone()).expect("status ok");
        match status {
            GitStatusResponse::Ok { changes, .. } => {
                assert!(changes.iter().any(|c| c.path == "file.txt" && c.tag == "A"));
            }
            GitStatusResponse::NotARepo => panic!("expected a repo"),
        }

        let commit = auto_commit(path.clone(), "feat: add file.txt".to_string()).expect("commit ok");
        assert!(matches!(commit, CommitResponse::Committed { .. }));

        // Committing again with no further changes must be a non-error.
        let second = auto_commit(path, "no-op".to_string()).expect("commit ok");
        assert!(matches!(second, CommitResponse::NothingToCommit));
    }

    #[test]
    fn log_returns_not_a_repo_for_plain_directory() {
        let dir = tempfile::tempdir().expect("tempdir");
        let result = git_log(dir.path().to_string_lossy().to_string()).expect("command ok");
        assert!(matches!(result, GitLogResponse::NotARepo));
    }

    #[test]
    fn log_is_empty_for_unborn_repo() {
        let dir = init_test_repo();
        let path = dir.path().to_string_lossy().to_string();
        let result = git_log(path).expect("command ok");
        match result {
            GitLogResponse::Ok { commits } => assert!(commits.is_empty()),
            GitLogResponse::NotARepo => panic!("expected a repo"),
        }
    }

    #[test]
    fn log_walks_linear_history_newest_first_on_lane_zero() {
        let dir = init_test_repo();
        let path = dir.path().to_string_lossy().to_string();

        fs::write(dir.path().join("a.txt"), "one").expect("write file");
        let first = auto_commit(path.clone(), "feat: a".to_string()).expect("commit ok");
        fs::write(dir.path().join("a.txt"), "two").expect("write file");
        let second = auto_commit(path.clone(), "feat: b".to_string()).expect("commit ok");

        let (first_oid, second_oid) = match (first, second) {
            (CommitResponse::Committed { oid: f }, CommitResponse::Committed { oid: s }) => (f, s),
            _ => panic!("expected both commits to succeed"),
        };

        let result = git_log(path).expect("command ok");
        match result {
            GitLogResponse::Ok { commits } => {
                assert_eq!(commits.len(), 2);
                assert_eq!(commits[0].oid, second_oid);
                assert_eq!(commits[0].summary, "feat: b");
                assert_eq!(commits[0].lane, 0);
                assert_eq!(commits[0].parents, vec![first_oid.clone()]);

                assert_eq!(commits[1].oid, first_oid);
                assert_eq!(commits[1].summary, "feat: a");
                assert_eq!(commits[1].lane, 0);
                assert!(commits[1].parents.is_empty());
            }
            GitLogResponse::NotARepo => panic!("expected a repo"),
        }
    }
}
