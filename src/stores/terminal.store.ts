import { create } from "zustand";

export const PANE_COUNT = 6;

export interface Pane {
  num: number;
  cardId: string | null;
  terminalId: string | null;
  initialCommand: string | null;
  cwd: string | null;
}

interface TerminalState {
  panes: Pane[];
  /** `cardId` is null for a free-standing terminal not tied to any pipeline step. */
  assignPane: (cardId: string | null, terminalId: string, initialCommand: string, cwd: string | null) => number | null;
  freePane: (terminalId: string) => void;
  paneForCard: (cardId: string) => Pane | undefined;
}

function emptyPanes(): Pane[] {
  return Array.from({ length: PANE_COUNT }, (_, i) => ({
    num: i + 1,
    cardId: null,
    terminalId: null,
    initialCommand: null,
    cwd: null,
  }));
}

export const useTerminalStore = create<TerminalState>((set, get) => ({
  panes: emptyPanes(),

  assignPane: (cardId, terminalId, initialCommand, cwd) => {
    const { panes } = get();
    const idleIdx = panes.findIndex((p) => p.terminalId === null);
    if (idleIdx === -1) return null;
    const next = panes.map((p, i) => (i === idleIdx ? { ...p, cardId, terminalId, initialCommand, cwd } : p));
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
}));
