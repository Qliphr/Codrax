import { create } from "zustand";
import type { Card, ColumnKey, PipelineStepState, Priority } from "@/lib/types";
import { loadKanban, saveKanban } from "@/lib/tauri";
import { MOCK_CARDS } from "@/lib/mockData";

export interface NewCardInput {
  title: string;
  priority: Priority;
  status: ColumnKey;
}

interface KanbanState {
  workspaceId: string | null;
  cards: Card[];
  loading: boolean;
  recoveredFromCorruption: boolean;
  hydrate: (workspaceId: string) => Promise<void>;
  moveCard: (cardId: string, status: ColumnKey) => void;
  addCard: (input: NewCardInput) => void;
  setCardTerminal: (cardId: string, terminalId: string | null) => void;
  setPipelineStepState: (cardId: string, stepIndex: number, state: PipelineStepState) => void;
}

function persist(workspaceId: string, cards: Card[]) {
  saveKanban(workspaceId, cards).catch((err) => {
    console.error("failed to save kanban data", err);
  });
}

function nextCardId(cards: Card[]): string {
  return `CDX-${100 + cards.length + 1}`;
}

export const useKanbanStore = create<KanbanState>((set, get) => ({
  workspaceId: null,
  cards: [],
  loading: false,
  recoveredFromCorruption: false,

  hydrate: async (workspaceId) => {
    set({ loading: true });
    try {
      const res = await loadKanban(workspaceId);
      const seeded = res.cards.length > 0 ? res.cards : MOCK_CARDS.filter((c) => c.project === workspaceId);
      set({
        workspaceId,
        cards: seeded,
        loading: false,
        recoveredFromCorruption: res.recoveredFromCorruption,
      });
      if (res.cards.length === 0 && seeded.length > 0) {
        persist(workspaceId, seeded);
      }
    } catch (err) {
      console.error("failed to load kanban data", err);
      set({ workspaceId, cards: MOCK_CARDS.filter((c) => c.project === workspaceId), loading: false });
    }
  },

  moveCard: (cardId, status) => {
    const { workspaceId, cards } = get();
    if (!workspaceId) return;
    const nextCards = cards.map((c) => (c.id === cardId ? { ...c, status } : c));
    set({ cards: nextCards });
    persist(workspaceId, nextCards);
  },

  addCard: (input) => {
    const { workspaceId, cards } = get();
    if (!workspaceId) return;
    const card: Card = {
      id: nextCardId(cards),
      title: input.title,
      description: "",
      priority: input.priority,
      status: input.status,
      project: workspaceId,
      pipeline: ["idle", "idle", "idle", "idle"],
      terminalId: null,
      currentStep: 0,
    };
    const nextCards = [...cards, card];
    set({ cards: nextCards });
    persist(workspaceId, nextCards);
  },

  setCardTerminal: (cardId, terminalId) => {
    const { workspaceId, cards } = get();
    if (!workspaceId) return;
    const nextCards = cards.map((c) => (c.id === cardId ? { ...c, terminalId } : c));
    set({ cards: nextCards });
    persist(workspaceId, nextCards);
  },

  setPipelineStepState: (cardId, stepIndex, state) => {
    const { workspaceId, cards } = get();
    if (!workspaceId) return;
    const nextCards = cards.map((c) => {
      if (c.id !== cardId) return c;
      const pipeline = [...c.pipeline];
      pipeline[stepIndex] = state;
      return { ...c, pipeline };
    });
    set({ cards: nextCards });
    persist(workspaceId, nextCards);
  },
}));
