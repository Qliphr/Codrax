import { useState } from "react";
import { COLORS } from "@/lib/theme";
import { useWorkspaceStore } from "@/stores/workspace.store";
import { useSettingsStore } from "@/stores/settings.store";
import type { Workspace } from "@/lib/types";
import { SettingRow } from "@/components/Settings/SettingRow";

interface GeneralSectionProps {
  workspace: Workspace | undefined;
}

const SHELL_PRESETS = [
  { label: "System default", value: "" },
  { label: "zsh", value: "zsh" },
  { label: "bash", value: "bash" },
  { label: "fish", value: "fish" },
  { label: "PowerShell (Windows)", value: "powershell.exe" },
  { label: "Command Prompt (Windows)", value: "cmd.exe" },
  { label: "Custom…", value: "__custom__" },
];

function TerminalSection() {
  const terminalShell = useSettingsStore((s) => s.settings.terminalShell);
  const setTerminalShell = useSettingsStore((s) => s.setTerminalShell);
  const isPreset = SHELL_PRESETS.some((p) => p.value === (terminalShell ?? ""));
  const [customMode, setCustomMode] = useState(!isPreset);
  const [customDraft, setCustomDraft] = useState(terminalShell ?? "");

  return (
    <div>
      <h3 className="mb-2.5 font-sans text-[11px] uppercase tracking-wider" style={{ color: COLORS.textMuted }}>
        Terminal
      </h3>
      <div className="flex flex-col gap-2">
        <SettingRow title="Shell" description="Binary spawned for new terminals — applies the next time one starts">
          <div className="flex flex-col items-end gap-2">
            <select
              className="vos-input w-[220px]"
              value={customMode ? "__custom__" : (terminalShell ?? "")}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "__custom__") {
                  setCustomMode(true);
                  return;
                }
                setCustomMode(false);
                setTerminalShell(value || undefined);
              }}
            >
              {SHELL_PRESETS.map((p) => (
                <option key={p.value || "default"} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            {customMode && (
              <input
                className="vos-input w-[220px]"
                placeholder="/opt/homebrew/bin/fish"
                value={customDraft}
                onChange={(e) => setCustomDraft(e.target.value)}
                onBlur={() => setTerminalShell(customDraft.trim() || undefined)}
              />
            )}
          </div>
        </SettingRow>
      </div>
    </div>
  );
}

export function GeneralSection({ workspace }: GeneralSectionProps) {
  const updateWorkspaceSettings = useWorkspaceStore((s) => s.updateWorkspaceSettings);
  const [urlDraft, setUrlDraft] = useState(workspace?.settings.previewUrl ?? "");

  if (!workspace) {
    return (
      <div className="flex flex-col gap-5">
        <TerminalSection />
        <div className="py-6 text-center font-sans text-[12.5px]" style={{ color: COLORS.textDim }}>
          No active workspace.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <TerminalSection />

      <div>
        <h3 className="mb-2.5 font-sans text-[11px] uppercase tracking-wider" style={{ color: COLORS.textMuted }}>
          Workspace
        </h3>
        <div className="flex flex-col gap-2">
          <SettingRow title="Name">
            <span className="font-sans text-[12.5px]" style={{ color: COLORS.textSecondary }}>
              {workspace.name}
            </span>
          </SettingRow>
          <SettingRow title="Path">
            <span className="max-w-[280px] truncate font-sans text-[12px]" style={{ color: COLORS.textSecondary }}>
              {workspace.path}
            </span>
          </SettingRow>
        </div>
      </div>

      <div>
        <h3 className="mb-2.5 font-sans text-[11px] uppercase tracking-wider" style={{ color: COLORS.textMuted }}>
          Preview
        </h3>
        <div className="flex flex-col gap-2">
          <SettingRow title="Port" description="Used when no override URL is set">
            <input
              type="number"
              className="vos-input w-[90px] text-right"
              value={workspace.settings.previewPort}
              onChange={(e) => updateWorkspaceSettings(workspace.id, { previewPort: Number(e.target.value) || 5173 })}
            />
          </SettingRow>
          <SettingRow title="Override URL" description="Leave empty to use localhost:port">
            <input
              className="vos-input w-[220px]"
              placeholder="http://localhost:5173"
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              onBlur={() => updateWorkspaceSettings(workspace.id, { previewUrl: urlDraft.trim() || undefined })}
            />
          </SettingRow>
        </div>
      </div>

      <div>
        <h3 className="mb-2.5 font-sans text-[11px] uppercase tracking-wider" style={{ color: COLORS.textMuted }}>
          File Tree
        </h3>
        <div className="flex flex-col gap-2">
          <SettingRow title="Show hidden files" description="Display dotfiles and dotfolders (e.g. .git, .env)">
            <input
              type="checkbox"
              className="size-4 accent-current"
              style={{ color: COLORS.textPrimary }}
              checked={workspace.settings.showHiddenFiles ?? false}
              onChange={(e) => updateWorkspaceSettings(workspace.id, { showHiddenFiles: e.target.checked })}
            />
          </SettingRow>
        </div>
      </div>
    </div>
  );
}
