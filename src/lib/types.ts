export type Priority = "critical" | "high" | "medium" | "low";

export type ColumnKey = "todo" | "in-progress" | "in-review" | "done";

export type PipelineStepState = "idle" | "active" | "done" | "failed";

export const PIPELINE_STEP_NAMES = ["Claude", "Kimi", "commit"] as const;

/** Column → forced pipeline step: dropping a card here always (re)starts this agent. */
export const BUILD_STEP_INDEX = PIPELINE_STEP_NAMES.indexOf("Claude");
export const REVIEW_STEP_INDEX = PIPELINE_STEP_NAMES.indexOf("Kimi");
export const COMMIT_STEP_INDEX = PIPELINE_STEP_NAMES.indexOf("commit");

export type AgentModelPresetId = "claude" | "kimi" | "codex" | "custom";

export interface AgentModelPreset {
  id: AgentModelPresetId;
  label: string;
  template: string;
}

export const AGENT_MODEL_PRESETS: AgentModelPreset[] = [
  { id: "claude", label: "Claude", template: 'claude -p "{task}"' },
  // -p assumed to mirror Claude's headless one-shot flag — verify against the real Kimi CLI.
  { id: "kimi", label: "Kimi", template: 'kimi review -p "{task}"' },
  // Command shape unverified — check the real Codex/GPT CLI's non-interactive flag before relying on this.
  { id: "codex", label: "Codex / GPT", template: 'codex exec "{task}"' },
  { id: "custom", label: "Custom", template: "" },
];

export interface AgentModelChoice {
  preset: AgentModelPresetId;
  /** Only read when preset === "custom" */
  customCommand?: string;
}

export const DEFAULT_BUILD_MODEL: AgentModelChoice = { preset: "claude" };
export const DEFAULT_REVIEW_MODEL: AgentModelChoice = { preset: "kimi" };

export function resolveAgentTemplate(choice: AgentModelChoice | undefined, fallback: AgentModelChoice): string {
  const c = choice ?? fallback;
  if (c.preset === "custom") {
    return c.customCommand?.trim() || AGENT_MODEL_PRESETS.find((p) => p.id === fallback.preset)!.template;
  }
  return AGENT_MODEL_PRESETS.find((p) => p.id === c.preset)?.template ?? "";
}

export function agentModelLabel(choice: AgentModelChoice | undefined, fallback: AgentModelChoice): string {
  const c = choice ?? fallback;
  return c.preset === "custom" ? "Custom" : (AGENT_MODEL_PRESETS.find((p) => p.id === c.preset)?.label ?? c.preset);
}

/** Display label for a pipeline chip/status: the configured model for build/review, else "commit". */
export function pipelineStepLabel(stepIdx: number, settings: WorkspaceSettings | undefined): string {
  if (stepIdx === COMMIT_STEP_INDEX) return "commit";
  const models = settings?.pipelineModels;
  const choice = stepIdx === BUILD_STEP_INDEX ? models?.build : models?.review;
  const fallback = stepIdx === BUILD_STEP_INDEX ? DEFAULT_BUILD_MODEL : DEFAULT_REVIEW_MODEL;
  return agentModelLabel(choice, fallback);
}

export const COLUMN_LABELS: Record<ColumnKey, string> = {
  todo: "To Do",
  "in-progress": "In Progress",
  "in-review": "In Review",
  done: "Done",
};

export const COLUMN_KEYS: ColumnKey[] = ["todo", "in-progress", "in-review", "done"];

export interface Card {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: ColumnKey;
  project: string;
  /** Runtime state of each PIPELINE_STEP_NAMES entry, in order. */
  pipeline: PipelineStepState[];
  terminalId: string | null;
  currentStep: number;
  /** Git-changed paths snapshotted when the task entered "in-progress" — lets the
   * eventual Done commit be scoped to only what this task touched. Null/absent means
   * no baseline was captured (e.g. workspace has no git repo), so Done falls back to
   * committing everything. */
  baselinePaths?: string[] | null;
}

export interface WorkspaceSettings {
  previewPort: number;
  previewUrl?: string;
  showHiddenFiles?: boolean;
  /** Which AI model/CLI each pipeline slot runs; unset falls back to Claude (build) / Kimi (review). */
  pipelineModels?: {
    build: AgentModelChoice;
    review: AgentModelChoice;
  };
  /** Whether the review (Kimi) pipeline step is used. Unset means enabled. */
  reviewEnabled?: boolean;
}

/** Whether the review pipeline step is active for a workspace; unset settings default to enabled. */
export function isReviewEnabled(settings: WorkspaceSettings | undefined): boolean {
  return settings?.reviewEnabled ?? true;
}

export interface Workspace {
  id: string;
  name: string;
  path: string;
  dot: string;
  settings: WorkspaceSettings;
  createdAt: string;
}

export interface FileEntry {
  path: string;
  name: string;
  depth: number;
  dir: boolean;
}

