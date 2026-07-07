import { COLORS } from "@/lib/theme";
import { SettingRow } from "@/components/Settings/SettingRow";

const isMac = typeof navigator !== "undefined" && /mac/i.test(navigator.platform);
const MOD = isMac ? "⌘" : "Ctrl";

const SHORTCUTS: { title: string; description: string; keys: string[] }[] = [
  { title: "Toggle web preview", description: "Open or close the floating preview window", keys: [MOD, "Shift", "P"] },
  { title: "New task", description: "Open the new task modal for the active column", keys: [MOD, "T"] },
  { title: "Switch view", description: "Toggle between Board and Terminals", keys: ["Shift", "Tab"] },
];

function Key({ children }: { children: string }) {
  return (
    <kbd
      className="flex h-6 min-w-[24px] items-center justify-center rounded-md border px-1.5 font-sans text-[11px]"
      style={{ borderColor: COLORS.borderDefault, background: COLORS.bgSurface, color: COLORS.textSecondary }}
    >
      {children}
    </kbd>
  );
}

export function ShortcutsSection() {
  return (
    <div className="flex flex-col gap-2">
      {SHORTCUTS.map((s) => (
        <SettingRow key={s.title} title={s.title} description={s.description}>
          <div className="flex items-center gap-1">
            {s.keys.map((k, i) => (
              <Key key={i}>{k}</Key>
            ))}
          </div>
        </SettingRow>
      ))}
    </div>
  );
}
