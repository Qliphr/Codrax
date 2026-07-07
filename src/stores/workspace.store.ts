import { create } from "zustand";
import { open } from "@tauri-apps/plugin-dialog";
import { checkPathExists, loadWorkspaces, saveWorkspaces } from "@/lib/tauri";
import { MOCK_WORKSPACES } from "@/lib/mockData";
import type { Workspace, WorkspaceSettings } from "@/lib/types";

const DOT_PALETTE = ["#D97757", "#BD5D3A", "#FF8C42", "#A39A90", "#6BCB77", "#FFD166"];

interface WorkspaceState {
  workspaces: Workspace[];
  missingIds: Set<string>;
  loading: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addWorkspace: () => Promise<Workspace | null>;
  loadDemoWorkspaces: () => void;
  removeWorkspace: (id: string) => void;
  relocateWorkspace: (id: string) => Promise<void>;
  renameWorkspace: (id: string, name: string) => void;
  updateWorkspaceSettings: (id: string, patch: Partial<WorkspaceSettings>) => void;
}

function persist(workspaces: Workspace[]) {
  saveWorkspaces(workspaces).catch((err) => console.error("failed to save workspaces", err));
}

function baseName(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? path;
}

function workspaceIdFromPath(path: string): string {
  return `${baseName(path)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function findMissing(workspaces: Workspace[]): Promise<Set<string>> {
  const checks = await Promise.all(
    workspaces.map(async (w) => ({ id: w.id, exists: await checkPathExists(w.path).catch(() => true) })),
  );
  return new Set(checks.filter((c) => !c.exists).map((c) => c.id));
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  missingIds: new Set(),
  loading: false,
  hydrated: false,

  hydrate: async () => {
    set({ loading: true });
    try {
      const res = await loadWorkspaces();
      // No auto-seeding — a real first launch starts empty and shows the welcome screen;
      // demo data is opt-in via loadDemoWorkspaces().
      set({ workspaces: res.workspaces, loading: false, hydrated: true });
      set({ missingIds: await findMissing(res.workspaces) });
    } catch (err) {
      console.error("failed to load workspaces", err);
      set({ workspaces: [], loading: false, hydrated: true });
    }
  },

  loadDemoWorkspaces: () => {
    set({ workspaces: MOCK_WORKSPACES, missingIds: new Set() });
    persist(MOCK_WORKSPACES);
  },

  addWorkspace: async () => {
    const selected = await open({ directory: true, multiple: false });
    if (!selected || Array.isArray(selected)) return null;

    const { workspaces } = get();
    if (workspaces.some((w) => w.path === selected)) return null;

    const workspace: Workspace = {
      id: workspaceIdFromPath(selected),
      name: baseName(selected),
      path: selected,
      dot: DOT_PALETTE[workspaces.length % DOT_PALETTE.length],
      settings: { previewPort: 5173 },
      createdAt: new Date().toISOString(),
    };

    const next = [...workspaces, workspace];
    set({ workspaces: next });
    persist(next);
    return workspace;
  },

  removeWorkspace: (id) => {
    const next = get().workspaces.filter((w) => w.id !== id);
    const missingIds = new Set(get().missingIds);
    missingIds.delete(id);
    set({ workspaces: next, missingIds });
    persist(next);
  },

  relocateWorkspace: async (id) => {
    const selected = await open({ directory: true, multiple: false });
    if (!selected || Array.isArray(selected)) return;

    const { workspaces, missingIds } = get();
    const next = workspaces.map((w) => (w.id === id ? { ...w, path: selected, name: baseName(selected) } : w));
    const nextMissing = new Set(missingIds);
    nextMissing.delete(id);
    set({ workspaces: next, missingIds: nextMissing });
    persist(next);
  },

  renameWorkspace: (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const next = get().workspaces.map((w) => (w.id === id ? { ...w, name: trimmed } : w));
    set({ workspaces: next });
    persist(next);
  },

  updateWorkspaceSettings: (id, patch) => {
    const next = get().workspaces.map((w) => (w.id === id ? { ...w, settings: { ...w.settings, ...patch } } : w));
    set({ workspaces: next });
    persist(next);
  },
}));
