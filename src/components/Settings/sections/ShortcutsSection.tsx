import { useCallback, useState, type KeyboardEvent } from "react";
import { COLORS, accentDim } from "@/lib/theme";
import { SettingRow } from "@/components/Settings/SettingRow";
import { SearchIcon, KeyboardIcon } from "@/lib/icons";

const isMac = typeof navigator !== "undefined" && /mac/i.test(navigator.platform);
const MOD = isMac ? "⌘" : "Ctrl";

const SHORTCUTS: { title: string; description: string; keys: string[] }[] = [
  { title: "Toggle web preview", description: "Open or close the floating preview window", keys: [MOD, "Shift", "P"] },
  { title: "New task", description: "Open the new task modal for the active column", keys: [MOD, "T"] },
  { title: "Switch view", description: "Toggle between Board and Terminals", keys: ["Shift", "Tab"] },
];

const KEY_LABELS: Record<string, string> = {
  " ": "Space",
  ARROWUP: "↑",
  ARROWDOWN: "↓",
  ARROWLEFT: "←",
  ARROWRIGHT: "→",
  ESCAPE: "Esc",
};

function eventToKeyLabel(e: KeyboardEvent): string | null {
  const key = e.key;
  if (key === "Control" || key === "Shift" || key === "Alt" || key === "Meta") return null;
  return KEY_LABELS[key.toUpperCase()] ?? (key.length === 1 ? key.toUpperCase() : key);
}

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
  const [mode, setMode] = useState<"text" | "keys">("text");
  const [query, setQuery] = useState("");
  const [capturedKeys, setCapturedKeys] = useState<string[]>([]);

  const handleKeysCapture = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.key === "Escape" || e.key === "Backspace") {
      setCapturedKeys([]);
      return;
    }
    const modifiers: string[] = [];
    if (e.metaKey) modifiers.push("⌘");
    if (e.ctrlKey) modifiers.push("Ctrl");
    if (e.shiftKey) modifiers.push("Shift");
    if (e.altKey) modifiers.push(isMac ? "⌥" : "Alt");
    const mainKey = eventToKeyLabel(e);
    const combo = mainKey ? [...modifiers, mainKey] : modifiers;
    if (combo.length > 0) setCapturedKeys(combo);
  }, []);

  const toggleMode = () => {
    setMode((m) => (m === "text" ? "keys" : "text"));
    setQuery("");
    setCapturedKeys([]);
  };

  const filtered = SHORTCUTS.filter((s) => {
    if (mode === "text") {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
    }
    if (capturedKeys.length === 0) return true;
    return capturedKeys.every((k) => s.keys.some((sk) => sk.toLowerCase() === k.toLowerCase()));
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <SearchIcon
            width={13}
            height={13}
            strokeWidth={2}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2"
            style={{ color: COLORS.textDim }}
          />
          {mode === "text" ? (
            <input
              className="vos-input w-full pl-8"
              placeholder="Search shortcuts…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          ) : (
            <div
              tabIndex={0}
              onKeyDown={handleKeysCapture}
              className="vos-input flex h-[35px] w-full items-center gap-1 pl-8"
              style={{ cursor: "text" }}
            >
              {capturedKeys.length > 0 ? (
                capturedKeys.map((k, i) => <Key key={i}>{k}</Key>)
              ) : (
                <span className="font-sans text-[13px]" style={{ color: COLORS.textDim }}>
                  Press a shortcut…
                </span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={toggleMode}
          title={mode === "keys" ? "Search by name" : "Search by keys"}
          className="flex h-[35px] w-[35px] flex-none items-center justify-center rounded-md border"
          style={{
            borderColor: mode === "keys" ? COLORS.accent : COLORS.borderDefault,
            background: mode === "keys" ? accentDim() : COLORS.bgSurface,
            color: mode === "keys" ? COLORS.accent : COLORS.textSecondary,
          }}
        >
          <KeyboardIcon width={14} height={14} strokeWidth={2} />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {filtered.length === 0 ? (
          <div className="py-6 text-center font-sans text-[12px]" style={{ color: COLORS.textDim }}>
            No shortcut found
          </div>
        ) : (
          filtered.map((s) => (
            <SettingRow key={s.title} title={s.title} description={s.description}>
              <div className="flex items-center gap-1">
                {s.keys.map((k, i) => (
                  <Key key={i}>{k}</Key>
                ))}
              </div>
            </SettingRow>
          ))
        )}
      </div>
    </div>
  );
}
