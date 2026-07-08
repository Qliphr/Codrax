/// Expands a leading `~` (or `~/...`) to the user's home directory.
///
/// Workspace paths normally come from the native folder picker and are
/// already absolute, but demo data and hand-typed paths can contain a
/// literal `~` — which `std::process::Command::cwd` and `git2` never
/// expand (that's shell syntax, not something the OS understands). Left
/// unexpanded, PTY spawn and git ops silently fail against a bogus
/// relative path.
pub fn expand_tilde(path: &str) -> String {
    if let Some(rest) = path.strip_prefix('~') {
        if rest.is_empty() || rest.starts_with('/') || rest.starts_with('\\') {
            let home = home_dir();
            if let Some(home) = home {
                return format!("{home}{rest}");
            }
        }
    }
    path.to_string()
}

fn home_dir() -> Option<String> {
    #[cfg(windows)]
    {
        std::env::var("USERPROFILE").ok()
    }
    #[cfg(not(windows))]
    {
        std::env::var("HOME").ok()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn expands_leading_tilde() {
        let home = home_dir().unwrap();
        assert_eq!(expand_tilde("~/dev/auth-service"), format!("{home}/dev/auth-service"));
    }

    #[test]
    fn leaves_absolute_paths_untouched() {
        assert_eq!(expand_tilde("/Users/alex/dev/auth-service"), "/Users/alex/dev/auth-service");
    }

    #[test]
    fn leaves_embedded_tilde_untouched() {
        assert_eq!(expand_tilde("/Users/alex/~weird"), "/Users/alex/~weird");
    }
}
