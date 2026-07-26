import { create } from "zustand";

export const DEFAULT_GRID_ROWS = 2;
export const DEFAULT_GRID_COLS = 3;
const GRID_SIZE_STORAGE_KEY = "codrax.terminalGridSize";

export interface Pane {
  num: number;
  cardId: string | null;
  terminalId: string | null;
  initialCommand: string | null;
  cwd: string | null;
  workspaceId: string | null;
}

interface TerminalState {
  panes: Pane[];
  gridRows: number;
  gridCols: number;
  /** `cardId` is null for a free-standing terminal not tied to any pipeline step. */
  assignPane: (
    cardId: string | null,
    terminalId: string,
    initialCommand: string,
    cwd: string | null,
    workspaceId: string | null,
  ) => number | null;
  freePane: (terminalId: string) => void;
  paneForCard: (cardId: string) => Pane | undefined;
  setGridSize: (rows: number, cols: number) => void;
}

function emptyPane(num: number): Pane {
  return { num, cardId: null, terminalId: null, initialCommand: null, cwd: null, workspaceId: null };
}

function emptyPanes(count: number): Pane[] {
  return Array.from({ length: count }, (_, i) => emptyPane(i + 1));
}

function loadStoredGridSize(): { rows: number; cols: number } {
  try {
    const raw = localStorage.getItem(GRID_SIZE_STORAGE_KEY);
    if (!raw) return { rows: DEFAULT_GRID_ROWS, cols: DEFAULT_GRID_COLS };
    const parsed = JSON.parse(raw);
    if (typeof parsed.rows === "number" && typeof parsed.cols === "number") return parsed;
  } catch {
    // ignore malformed/missing storage
  }
  return { rows: DEFAULT_GRID_ROWS, cols: DEFAULT_GRID_COLS };
}

const initialGridSize = loadStoredGridSize();

export const useTerminalStore = create<TerminalState>((set, get) => ({
  panes: emptyPanes(initialGridSize.rows * initialGridSize.cols),
  gridRows: initialGridSize.rows,
  gridCols: initialGridSize.cols,

  assignPane: (cardId, terminalId, initialCommand, cwd, workspaceId) => {
    const { panes } = get();
    const idleIdx = panes.findIndex((p) => p.terminalId === null);
    if (idleIdx === -1) return null;
    const next = panes.map((p, i) =>
      i === idleIdx ? { ...p, cardId, terminalId, initialCommand, cwd, workspaceId } : p,
    );
    set({ panes: next });
    return next[idleIdx].num;
  },

  freePane: (terminalId) => {
    set((state) => ({
      panes: state.panes.map((p) =>
        p.terminalId === terminalId ? { ...p, cardId: null, terminalId: null, initialCommand: null, cwd: null } : p,
      ),
    }));
  },

  paneForCard: (cardId) => get().panes.find((p) => p.cardId === cardId),

  setGridSize: (rows, cols) => {
    const total = rows * cols;
    const { panes } = get();
    const occupied = panes.filter((p) => p.terminalId !== null);
    if (occupied.length > total) return; // don't drop running terminals
    const kept = occupied.map((p, i) => ({ ...p, num: i + 1 }));
    const idle = Array.from({ length: total - kept.length }, (_, i) => emptyPane(kept.length + i + 1));
    localStorage.setItem(GRID_SIZE_STORAGE_KEY, JSON.stringify({ rows, cols }));
    set({ panes: [...kept, ...idle], gridRows: rows, gridCols: cols });
  },
}));
