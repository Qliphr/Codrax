import { create } from "zustand";
import { detectBinaries, loadCustomProviders, saveCustomProviders, type CustomProvider } from "@/lib/tauri";
import { KNOWN_PROVIDERS } from "@/lib/providers";

export interface ProviderRow {
  name: string;
  cli: string;
  detected: boolean;
  custom: boolean;
}

interface ProviderState {
  custom: CustomProvider[];
  detected: Record<string, boolean>;
  loading: boolean;
  hydrate: () => Promise<void>;
  addCustom: (name: string, cli: string) => Promise<void>;
  rows: () => ProviderRow[];
}

function persist(custom: CustomProvider[]) {
  saveCustomProviders(custom).catch((err) => console.error("failed to save providers", err));
}

export const useProviderStore = create<ProviderState>((set, get) => ({
  custom: [],
  detected: {},
  loading: false,

  hydrate: async () => {
    set({ loading: true });
    try {
      const res = await loadCustomProviders();
      const allClis = [...KNOWN_PROVIDERS.map((p) => p.cli), ...res.custom.map((p) => p.cli)];
      const detected = await detectBinaries(allClis);
      set({ custom: res.custom, detected, loading: false });
    } catch (err) {
      console.error("failed to load providers", err);
      set({ loading: false });
    }
  },

  addCustom: async (name, cli) => {
    const { custom } = get();
    if (custom.some((p) => p.cli === cli) || KNOWN_PROVIDERS.some((p) => p.cli === cli)) return;
    const next = [...custom, { name, cli }];
    set({ custom: next });
    persist(next);
    try {
      const detected = await detectBinaries([cli]);
      set((state) => ({ detected: { ...state.detected, ...detected } }));
    } catch (err) {
      console.error("failed to detect new provider", err);
    }
  },

  rows: () => {
    const { custom, detected } = get();
    const known: ProviderRow[] = KNOWN_PROVIDERS.map((p) => ({ ...p, detected: detected[p.cli] ?? false, custom: false }));
    const customRows: ProviderRow[] = custom.map((p) => ({ ...p, detected: detected[p.cli] ?? false, custom: true }));
    return [...known, ...customRows];
  },
}));
