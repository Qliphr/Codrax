import type { Card, Workspace } from "./types";

export const MOCK_WORKSPACES: Workspace[] = [
  {
    id: "auth-service",
    name: "auth-service",
    path: "~/dev/auth-service",
    dot: "#D97757",
    settings: { previewPort: 5173 },
    createdAt: "2026-01-12T00:00:00.000Z",
  },
  {
    id: "vibeos-core",
    name: "vibeos-core",
    path: "~/dev/vibeos-core",
    dot: "#BD5D3A",
    settings: { previewPort: 5173 },
    createdAt: "2026-01-04T00:00:00.000Z",
  },
  {
    id: "pricing-api",
    name: "pricing-api",
    path: "~/dev/pricing-api",
    dot: "#FF8C42",
    settings: { previewPort: 5173 },
    createdAt: "2026-02-01T00:00:00.000Z",
  },
  {
    id: "wisk-web",
    name: "wisk-web",
    path: "~/dev/wisk-web",
    dot: "#A39A90",
    settings: { previewPort: 5173 },
    createdAt: "2026-03-18T00:00:00.000Z",
  },
];

export const MOCK_CARDS: Card[] = [
  {
    id: "VOS-142",
    title: "Add OAuth token refresh",
    description:
      "Silently refresh the access token before expiry using the stored refresh token. Handle 401 retry once.",
    priority: "high",
    status: "todo",
    project: "auth-service",
    pipeline: ["idle", "idle", "idle", "idle"],
    terminalId: null,
    currentStep: 0,
  },
  {
    id: "VOS-138",
    title: "Fix flaky payment webhook test",
    description:
      "Webhook signature test fails ~1/10 runs. Suspect race in the mock clock. Stabilise and add retry.",
    priority: "medium",
    status: "todo",
    project: "pricing-api",
    pipeline: ["idle", "idle", "idle", "idle"],
    terminalId: null,
    currentStep: 0,
  },
  {
    id: "VOS-131",
    title: "Migrate config to TOML",
    description:
      "Move app settings from JSON to a typed TOML file read by the Tauri backend.",
    priority: "low",
    status: "todo",
    project: "vibeos-core",
    pipeline: ["idle", "idle", "idle", "idle"],
    terminalId: null,
    currentStep: 0,
  },
  {
    id: "VOS-140",
    title: "Implement dark mode settings panel",
    description:
      "Add the appearance settings pane with theme toggle wired to the ThemeProvider and persisted to disk.",
    priority: "critical",
    status: "in-progress",
    project: "vibeos-core",
    pipeline: ["done", "active", "idle", "idle"],
    terminalId: "pane-1",
    currentStep: 1,
  },
  {
    id: "VOS-135",
    title: "Refactor terminal PTY manager",
    description:
      "Extract spawn/kill logic out of the view layer into a dedicated Rust PTY manager with an event bus.",
    priority: "high",
    status: "in-progress",
    project: "vibeos-core",
    pipeline: ["active", "idle", "idle", "idle"],
    terminalId: "pane-2",
    currentStep: 0,
  },
  {
    id: "VOS-129",
    title: "Add rate limiting middleware",
    description:
      "Token-bucket limiter keyed by client id, 100 req/min. Kimi is reviewing the implementation.",
    priority: "medium",
    status: "in-review",
    project: "auth-service",
    pipeline: ["done", "done", "active", "idle"],
    terminalId: "pane-3",
    currentStep: 2,
  },
  {
    id: "VOS-127",
    title: "Optimize board render perf",
    description:
      "Memoise card components and virtualise long columns to keep the board at 60fps with 200+ cards.",
    priority: "low",
    status: "in-review",
    project: "vibeos-core",
    pipeline: ["done", "done", "idle", "idle"],
    terminalId: null,
    currentStep: 2,
  },
  {
    id: "VOS-118",
    title: "Set up Tauri 2 IPC bridge",
    description:
      "Typed command bridge between the WebView and the Rust backend for spawning agents.",
    priority: "high",
    status: "done",
    project: "vibeos-core",
    pipeline: ["done", "done", "done", "done"],
    terminalId: null,
    currentStep: 4,
  },
  {
    id: "VOS-112",
    title: "Wire xterm.js to native PTY",
    description:
      "Stream native pseudo-terminal stdout into xterm.js instances with full resize support.",
    priority: "critical",
    status: "done",
    project: "vibeos-core",
    pipeline: ["done", "done", "done", "done"],
    terminalId: null,
    currentStep: 4,
  },
];
