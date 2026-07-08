import { create } from "zustand";
import { loadAppSettings, saveAppSettings, type AppSettings } from "@/lib/tauri";

interface SettingsState {
  settings: AppSettings;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setTerminalShell: (shell: string | undefined) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: {},
  hydrated: false,

  hydrate: async () => {
    try {
      const settings = await loadAppSettings();
      set({ settings, hydrated: true });
    } catch (err) {
      console.error("failed to load app settings", err);
      set({ settings: {}, hydrated: true });
    }
  },

  setTerminalShell: (shell) => {
    const next = { ...get().settings, terminalShell: shell || undefined };
    set({ settings: next });
    saveAppSettings(next).catch((err) => console.error("failed to save app settings", err));
  },
}));
