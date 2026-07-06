# Contributing to Codrax

Codrax is a solo-maintained project with a strong product direction. Contributions are welcome, but **alignment matters more than volume**.

This document helps you decide *whether* and *how* to contribute in a way that's likely to get merged, so neither of us wastes time.

## How this project is run

- Codrax has one active maintainer ([@Qliphr](https://github.com/Qliphr)).
- Review bandwidth is limited.
- Not every contribution can be accepted, even if it's technically correct. Alignment with project direction matters as much as code quality.
- For scope and direction, see [CLAUDE.md](../CLAUDE.md). Read it before opening anything non-trivial — it documents what Codrax is, what it isn't, and the MVP priority order.

This is normal for a solo project. A "no" on a PR is not personal.

## Quick start

```bash
npm install
npm run tauri dev
```

Prereqs: Rust 1.77+, Node 20+, plus your platform's [Tauri prerequisites](https://tauri.app/start/prerequisites/).

## Where to discuss

Use GitHub Issues for tracking concrete bugs and features. Use GitHub Discussions (or a comment on an existing issue) for "should I work on X?", design questions, or quick feedback before starting something non-trivial.

## What makes a good contribution

These get merged fast:

- **Bug fixes** with clear reproduction steps.
- **Docs / typos / small UX fixes** — open a PR directly.
- **Pre-discussed features** — alignment in an issue first.
- **Small, focused changes** — easy to review, low risk.

If your change is small and obvious (typo, narrow bugfix, small docs change), open a PR directly. No issue required.

## Keep changes focused

**Only change what's needed to accomplish your stated goal.**

If you're fixing a bug in `pty.rs`, don't also:

- Reformat other files
- Clean up unrelated code
- Fix lint issues in files you didn't need to touch
- Combine multiple unrelated fixes in one PR

Even when these changes are "improvements", they make review harder and slow everything down. If you want to clean things up, open a separate PR after discussion.

**One PR = one logical change.** Multi-concern PRs will be asked to split.

## Discuss first (required for larger changes)

For anything beyond a small fix, **discussion is required before opening a PR**. This includes:

- New features
- UI/UX changes or changes to default behavior
- Refactors or "cleanup" work
- Architectural changes
- Anything touching many files or systems
- New agent/CLI integrations (beyond the existing `claude` / `codex` / `kimi` / `opencode` / custom pipeline steps)

Pull requests with significant unsolicited changes will be closed without detailed review. This isn't meant to discourage contribution. It ensures alignment before significant work goes in.

A 10-minute conversation saves a 500-line PR that doesn't fit the roadmap.

## Quality bar

Every PR is reviewed against:

- `npx tsc --noEmit` clean
- `cargo check` (and `cargo test --lib` where relevant) clean in `src-tauri/`
- No `unwrap()` added to Rust code paths that ship to production
- No new `any` in TypeScript
- Platform parity preserved where reasonably possible (macOS is the primary target; don't knowingly break Windows/Linux)
- Security review for any change to PTY spawning/command injection, IPC command surface, git operations, or the Supabase/Polar integration

## Changes to core subsystems require care

The most common way a PR breaks Codrax is a **local fix with global blast radius**: the diff solves one reported case, reads fine, passes type-check, and silently breaks the same subsystem in every other case. Review alone does not catch these — a test does, where one is feasible.

Load-bearing paths that deserve extra scrutiny (and a test when possible):

- **PTY lifecycle** (`src-tauri/src/pty.rs`): spawn, resize, kill (SIGTERM → SIGKILL / `TerminateProcess`), the 8-PTY cap.
- **Command injection into PTYs** (`src-tauri/src/pipeline.rs`): user-provided task text must never be interpolated raw into a shell string — always through the escaping helper.
- **Git layer** (`src-tauri/src/git.rs`): status parsing, auto-commit on Done, push/upstream handling.
- **IPC command surface**: anything the webview can `invoke()`.
- **Kanban store** (`stores/kanban.store.ts`): card/column state must only change through the Zustand store, never mutated ad hoc.

If you can't see how to test something in this list, ask in an issue before opening the PR. That conversation is usually shorter than the revert.

UI rendering, themes, and anything the type-checker already guarantees do not need tests.

## What Codrax is not

To set expectations:

- Not a code editor (no CodeMirror/Monaco) — Claude Code and friends handle that in their own terminal.
- Not a custom AI chat UI — agents run through their official CLIs.
- Not a credentials manager — you configure your own CLI auth.
- Not a CI/CD or deployment tool.
- Not aiming for real-time collaboration (v2 at the earliest).
- Mechanical refactors, broad style changes, drive-by rewrites are not helpful.
- AI-assisted contributions are welcome, but the PR must reflect understanding of the existing patterns. Low-effort AI-generated code that wasn't read by the author will be closed.

## Branches

Branch off `main`. Use these prefixes (kebab-case):

| Prefix       | Use for                                  |
| ------------ | ----------------------------------------- |
| `feat/`      | New feature                              |
| `fix/`       | Bug fix                                  |
| `chore/`     | Refactor, tooling, config, dependencies  |
| `docs/`      | Docs-only changes                        |
| `security/`  | Security fix or hardening                |

Examples: `feat/pipeline-auto-detect`, `fix/pty-resize-windows`, `security/shell-escape`.

Don't open PRs from your fork's `main` branch. Work on a feature branch.

## Commits & PRs

Follow [Conventional Commits](https://www.conventionalcommits.org/) for the PR title (it typically becomes the squash commit):

```
feat: Add dark mode to settings
fix: PTY crash on Windows when path contains spaces
chore: Update dependencies
docs: Update CLAUDE.md
security: Tighten shell escaping in pipeline.rs
```

Within a PR, individual commit messages can be free-form (they get squashed).

**Describe what changed, why, and how you tested it.** Screenshots/GIFs for UI changes. "Tested manually by ..." is the bare minimum — note that GUI click-testing on this project has historically been limited (see `.claude/PROGRESS.md`), so `tsc`/`cargo check`/`cargo test` output plus manual reasoning is acceptable when a real click-test isn't possible.

### What gets merged faster

- Clear problem statement
- Small, focused diff
- Follows existing patterns (read 2-3 nearby files before writing yours)
- Type-checks / `cargo check` pass
- Manual testing notes describing the steps you took

### What gets bounced back

- Mixed-concern PRs
- Large architectural PRs without prior discussion
- New dependencies without justification
- Breaking changes without migration notes
- Incidental reformatting unrelated to the change
- AI-generated code that obviously wasn't read by the author

## Code style

- Follow existing patterns. Read 2-3 adjacent files before adding new ones.
- TypeScript: no `any`. Type every interface.
- Rust: `Result<T, E>` everywhere that can fail — no `unwrap()` in code paths that ship.
- Comments: only for *why*, not *what*. No multi-paragraph docstrings.
- No emojis in code or commit messages.

## Project layout

```
src-tauri/src/
  pty.rs          PTY spawn, resize, lifecycle
  git.rs          git2: status, commit, push, log
  pipeline.rs     Command templating + shell escaping for PTY injection
  files.rs        File tree listing
  providers.rs    CLI detection (which)

src/
  components/
    Board/        Kanban (KanbanBoard, KanbanColumn, KanbanCard)
    Terminals/     Terminal grid (TerminalGrid, TerminalPane, PipelineFooter)
    Preview/       Web preview window
    Auth/          Login / Pro gating
    Sidebar/       Workspaces, file tree, git status, git graph
  stores/          Zustand: kanban, terminal, pipeline, auth, notification
  hooks/           useTerminal, usePipeline, useProGate, useAutoUpdate
  lib/             tauri.ts, supabase.ts, shell.ts, fileIcons/
```

## FAQ

**Q: Should I ask before fixing a typo or obvious bug?**
A: No, open a PR directly.

**Q: I have an idea for a new feature.**
A: Open a GitHub issue first. Don't open a PR without prior discussion.

**Q: My PR was closed without detailed feedback.**
A: Usually means it didn't align with project direction, or scope was too large to review responsibly. This is normal for a solo project. Reopen is welcome if you want to take another pass at a smaller scope.

**Q: Can I work on an open issue?**
A: Comment first to confirm it's still relevant and nobody else is on it. For anything non-trivial, discuss approach before implementing.

**Q: How long does review take?**
A: Depends. Small bug fix or docs: usually within a few days. Larger feature: maybe a week or two. Pre-discussed work moves faster.

**Q: My PR conflicts after main moved. Should I rebase?**
A: If the change is still relevant and reasonably small, yes. If it's a large stale PR, expect it to be closed with an offer to reopen after rebase.

## Security issues

Don't file them as public issues. See [SECURITY.md](SECURITY.md).

## License

By contributing you agree your work is licensed under the project's [Functional Source License, Version 1.1, MIT Future License (FSL-1.1-MIT)](../LICENSE). No CLA required.
