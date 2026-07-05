import { invoke } from "@tauri-apps/api/core";
import type { Card, FileEntry, Workspace } from "./types";

export interface LoadKanbanResponse {
  cards: Card[];
  recoveredFromCorruption: boolean;
  backupPath: string | null;
}

export function loadKanban(workspaceId: string): Promise<LoadKanbanResponse> {
  return invoke("load_kanban", { workspaceId });
}

export function saveKanban(workspaceId: string, cards: Card[]): Promise<void> {
  return invoke("save_kanban", { workspaceId, cards });
}

export interface GitChange {
  tag: "M" | "A" | "D";
  path: string;
}

export type GitStatusResponse =
  | { kind: "notARepo" }
  | { kind: "ok"; branch: string; ahead: number; changes: GitChange[] };

export function gitStatus(path: string): Promise<GitStatusResponse> {
  return invoke("git_status", { path });
}

export function initRepo(path: string): Promise<void> {
  return invoke("init_repo", { path });
}

export type CommitResponse =
  | { kind: "nothingToCommit" }
  | { kind: "committed"; oid: string }
  | { kind: "failed"; message: string };

export function autoCommit(path: string, message: string, scope?: string[]): Promise<CommitResponse> {
  return invoke("auto_commit", { path, message, scope: scope ?? null });
}

/** Currently changed paths (tracked + untracked) vs HEAD — used to snapshot a task's
 * baseline at start so its eventual commit can be scoped to what it actually touched. */
export function gitChangedPaths(path: string): Promise<string[]> {
  return invoke("git_changed_paths", { path });
}

export interface GitCommit {
  oid: string;
  shortOid: string;
  summary: string;
  author: string;
  timestamp: number;
  parents: string[];
  lane: number;
}

export type GitLogResponse =
  | { kind: "notARepo" }
  | { kind: "ok"; commits: GitCommit[] };

export function gitLog(path: string): Promise<GitLogResponse> {
  return invoke("git_log", { path });
}

export function checkGitIdentity(): Promise<boolean> {
  return invoke("check_git_identity");
}

export interface LoadWorkspacesResponse {
  workspaces: Workspace[];
  recoveredFromCorruption: boolean;
  backupPath: string | null;
}

export function loadWorkspaces(): Promise<LoadWorkspacesResponse> {
  return invoke("load_workspaces");
}

export function saveWorkspaces(workspaces: Workspace[]): Promise<void> {
  return invoke("save_workspaces", { workspaces });
}

export function openPreview(url: string): Promise<void> {
  return invoke("open_preview", { url });
}

export function listFiles(path: string): Promise<FileEntry[]> {
  return invoke("list_files", { path });
}

export interface CustomProvider {
  name: string;
  cli: string;
}

export interface LoadCustomProvidersResponse {
  custom: CustomProvider[];
  recoveredFromCorruption: boolean;
  backupPath: string | null;
}

export function loadCustomProviders(): Promise<LoadCustomProvidersResponse> {
  return invoke("load_custom_providers");
}

export function saveCustomProviders(custom: CustomProvider[]): Promise<void> {
  return invoke("save_custom_providers", { custom });
}

export function detectBinaries(clis: string[]): Promise<Record<string, boolean>> {
  return invoke("detect_binaries", { clis });
}

export function checkPathExists(path: string): Promise<boolean> {
  return invoke("check_path_exists", { path });
}
