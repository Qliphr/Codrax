import { useState } from "react";
import { COLORS, accentDim } from "@/lib/theme";
import { usePresence } from "@/hooks/usePresence";
import { SlidersIcon, PlugIcon, KeyboardIcon, InfoIcon } from "@/lib/icons";
import type { Workspace } from "@/lib/types";
import { GeneralSection } from "./sections/GeneralSection";
import { ProvidersSection } from "./sections/ProvidersSection";
import { ShortcutsSection } from "./sections/ShortcutsSection";
import { AboutSection } from "./sections/AboutSection";

type SettingsTab = "general" | "providers" | "shortcuts" | "about";

const TABS: { id: SettingsTab; label: string; icon: typeof SlidersIcon }[] = [
  { id: "general", label: "General", icon: SlidersIcon },
  { id: "providers", label: "Providers", icon: PlugIcon },
  { id: "shortcuts", label: "Shortcuts", icon: KeyboardIcon },
  { id: "about", label: "About", icon: InfoIcon },
];

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  workspace: Workspace | undefined;
}

export function SettingsModal({ open, onClose, workspace }: SettingsModalProps) {
  const [active, setActive] = useState<SettingsTab>("general");
  const { mounted, state } = usePresence(open, 160);

  if (!mounted) return null;

  return (
    <div
      onClick={onClose}
      data-state={state}
      className="vos-overlay fixed inset-0 z-50 flex items-center justify-center p-10"
      style={{ background: "rgba(6,7,9,0.65)", backdropFilter: "blur(3px)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        data-state={state}
        className="vos-modal flex h-[560px] w-[680px] flex-col overflow-hidden rounded-lg border"
        style={{ background: COLORS.bgSurface, borderColor: COLORS.borderDefault, boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }}
      >
        <div className="flex h-[52px] flex-none items-center gap-1 border-b px-3" style={{ borderColor: COLORS.borderSubtle }}>
          <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: COLORS.bgPanel }}>
            {TABS.map((t) => {
              const isActive = t.id === active;
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setActive(t.id)}
                  className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-sans text-[11.5px] transition-colors"
                  style={{
                    color: isActive ? COLORS.accent : COLORS.textSecondary,
                    background: isActive ? accentDim() : "transparent",
                  }}
                >
                  <Icon width={12} height={12} strokeWidth={2} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md border text-sm"
            style={{ borderColor: COLORS.borderDefault, color: COLORS.textSecondary }}
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {active === "general" && <GeneralSection workspace={workspace} />}
          {active === "providers" && <ProvidersSection />}
          {active === "shortcuts" && <ShortcutsSection />}
          {active === "about" && <AboutSection />}
        </div>
      </div>
    </div>
  );
}
