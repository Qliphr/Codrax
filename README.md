<p align="center">
  <img src="logo/icon.png" alt="Codrax logo" width="120" />
</p>

# Codrax

Desktop orchestration cockpit for vibe coders using Claude Code.

Codrax links a Kanban board to native terminals: create a task, drag it into a column, an AI agent (Claude Code, Codex, Kimi…) starts automatically in a dedicated terminal. When the task is done, automatic git commit.

## What Codrax is not

- Not an IDE — Claude Code handles code editing
- Not a custom AI chat — agents run in native terminals via CLI
- Not a direct competitor to Cursor or Windsurf

## What Codrax is

- A smart Kanban linked to native PTY terminals
- An orchestrator for AI agent pipelines (Codex → Claude Code → Kimi → commit)
- A tool to visualize progress on a vibe coding project

## Tech stack

| Component | Choice |
|---|---|
| Desktop app | Tauri 2 (Rust + WebView) |
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind v4 + shadcn/ui |
| State | Zustand |
| Kanban DnD | dnd-kit |
| Terminal UI | @xterm/xterm + @xterm/addon-webgl |
| Terminal PTY | portable-pty (Rust) |
| Git | git2 (Rust) |
| Auth + licensing | Supabase |
| Payments | Polar.sh |

## Default pipeline

```
Codex (thinking/plan) → Claude Code (build) → Kimi (review) → git commit
```

Each project can define its own default pipeline; each card can override it.

## Supported OS

macOS (primary target) · Windows · Linux (best effort)

## Status

Actively in development — see MVP priorities in the project's internal documentation.

## License

Functional Source License, Version 1.1, MIT Future License (FSL-1.1-MIT) — see [LICENSE](LICENSE).

In short: source code is freely available and modifiable, but using it to launch a competing product is prohibited for 2 years from each release. After that, each version automatically converts to MIT license.
