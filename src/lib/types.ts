export type Priority = "critical" | "high" | "medium" | "low";

export type ColumnKey = "todo" | "in-progress" | "in-review" | "done";

export type PipelineStepState = "idle" | "active" | "done" | "failed";

export const PIPELINE_STEP_NAMES = ["Claude", "Kimi", "commit"] as const;

/** Column → forced pipeline step: dropping a card here always (re)starts this agent. */
export const CLAUDE_STEP_INDEX = PIPELINE_STEP_NAMES.indexOf("Claude");
export const KIMI_STEP_INDEX = PIPELINE_STEP_NAMES.indexOf("Kimi");

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

