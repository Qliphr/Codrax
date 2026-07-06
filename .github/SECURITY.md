# Security

Codrax spawns shells, injects commands into PTYs, reads/writes files, runs git operations, and talks to Supabase/Polar.sh — so security bugs matter. If you find one, please tell us before posting it publicly.

## Reporting

Email **alexandre@wisk.digital** with subject `[Codrax security]`. Include:

- What the issue is and what it lets an attacker do
- Steps to reproduce (a small PoC is great)
- Version, OS, arch

We'll get back to you within a few days. Once it's fixed, we'll credit you in the release notes — unless you'd rather stay anonymous.

Please **don't** open a public GitHub issue for security reports.

## Supported versions

Until `1.0.0`, only the latest minor gets security fixes.

## What's in scope

- The Rust backend in `src-tauri/` (PTY spawn/lifecycle, command injection into PTYs, git2 operations, IPC commands, file system access)
- The frontend in `src/` — anywhere untrusted input lands (card title/description before PTY injection, terminal stdout rendering, file tree content)
- The Supabase auth flow (GitHub OAuth via deep link) and Row Level Security policies
- The Polar.sh webhook handler (signature verification, `is_pro` matching)
- Release artifacts on GitHub and the auto-updater

## What's not

- Bugs in upstream deps (Tauri, xterm.js, portable-pty, git2, Supabase/Polar SDKs…) — report those upstream. We'll ship the fix once it's released.
- Anything that needs an already-compromised machine or a local attacker with shell access
- Older versions (before the latest minor)

## What we do to keep things safe

- **Shell injection guard.** Card title/description text is never interpolated raw into a PTY command string — it's always escaped (single-quote wrapping, POSIX and PowerShell variants) before injection. See `src-tauri/src/pipeline.rs`.
- **No API keys stored by Codrax.** You bring your own CLI credentials (Claude Code, Codex, Kimi…); Codrax never touches or stores them.
- **RLS on Supabase.** The anon key is public by design; data access is enforced by Row Level Security policies (`auth.uid() = id`), not by the key.
- **Webhook signature verification.** The Polar.sh webhook handler rejects any payload that doesn't verify against `POLAR_WEBHOOK_SECRET`.
- **No OAuth in an embedded webview.** GitHub sign-in opens in the system browser; the desktop app never sees your GitHub password.
- **Signed releases.** Updates are verified (Tauri updater signature) before they're applied.

## What we can't promise

- Codrax runs whatever CLI command you configure, with your permissions — that's the point of a terminal-based orchestrator. A malicious or misconfigured pipeline step can do anything your shell user can do.
- Client-side Pro gating (`useProGate`) is cosmetic and known-bypassable by design — see [CLAUDE.md](../CLAUDE.md#gating-des-features-pro). Only Gist sync and community templates are enforced server-side; don't treat local gating as a security boundary.
- AI providers/CLIs you configure see whatever you send them. Read their retention policies.
