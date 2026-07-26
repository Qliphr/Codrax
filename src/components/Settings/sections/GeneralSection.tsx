import { useState } from "react";
import { COLORS } from "@/lib/theme";
import { useWorkspaceStore } from "@/stores/workspace.store";
import { useSettingsStore } from "@/stores/settings.store";
import {
  AGENT_MODEL_PRESETS,
  DEFAULT_BUILD_MODEL,
  DEFAULT_REVIEW_MODEL,
  type AgentModelChoice,
  type Workspace,
} from "@/lib/types";
import { SettingRow } from "@/components/Settings/SettingRow";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface GeneralSectionProps {
  workspace: Workspace | undefined;
}

const isWindowsOS = typeof navigator !== "undefined" && /win/i.test(navigator.platform);

const SHELL_PRESETS = [
  { label: "System default", value: "" },
  ...(isWindowsOS
    ? [
        { label: "PowerShell (Windows)", value: "powershell.exe" },
        { label: "Command Prompt (Windows)", value: "cmd.exe" },
      ]
    : [
        { label: "zsh", value: "zsh" },
        { label: "bash", value: "bash" },
        { label: "fish", value: "fish" },
      ]),
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
            <Select
              value={customMode ? "__custom__" : (terminalShell || "__default__")}
              onValueChange={(value) => {
                if (value === "__custom__") {
                  setCustomMode(true);
                  return;
                }
                setCustomMode(false);
                setTerminalShell(value === "__default__" ? undefined : value);
              }}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SHELL_PRESETS.map((p) => (
                  <SelectItem key={p.value || "__default__"} value={p.value || "__default__"}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

function ModelPicker({
  label,
  description,
  choice,
  fallback,
  onChange,
}: {
  label: string;
  description: string;
  choice: AgentModelChoice | undefined;
  fallback: AgentModelChoice;
  onChange: (choice: AgentModelChoice) => void;
}) {
  const preset = choice?.preset ?? fallback.preset;
  const [customDraft, setCustomDraft] = useState(choice?.customCommand ?? "");

  return (
    <SettingRow title={label} description={description}>
      <div className="flex flex-col items-end gap-2">
        <Select
          value={preset}
          onValueChange={(value) => onChange({ preset: value as AgentModelChoice["preset"], customCommand: customDraft })}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AGENT_MODEL_PRESETS.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {preset === "custom" && (
          <input
            className="vos-input w-[220px]"
            placeholder='mycli run "{task}"'
            value={customDraft}
            onChange={(e) => setCustomDraft(e.target.value)}
            onBlur={() => onChange({ preset: "custom", customCommand: customDraft.trim() })}
          />
        )}
      </div>
    </SettingRow>
  );
}

function PipelineSection({ workspace }: { workspace: Workspace }) {
  const updateWorkspaceSettings = useWorkspaceStore((s) => s.updateWorkspaceSettings);
  const models = workspace.settings.pipelineModels;
  const reviewEnabled = workspace.settings.reviewEnabled ?? true;

  function setBuild(choice: AgentModelChoice) {
    updateWorkspaceSettings(workspace.id, {
      pipelineModels: { build: choice, review: models?.review ?? DEFAULT_REVIEW_MODEL },
    });
  }

  function setReview(choice: AgentModelChoice) {
    updateWorkspaceSettings(workspace.id, {
      pipelineModels: { build: models?.build ?? DEFAULT_BUILD_MODEL, review: choice },
    });
  }

  return (
    <div>
      <h3 className="mb-2.5 font-sans text-[11px] uppercase tracking-wider" style={{ color: COLORS.textMuted }}>
        Pipeline
      </h3>
      <div className="flex flex-col gap-2">
        <ModelPicker
          label="Build step"
          description="Model/CLI run when a task enters In Progress"
          choice={models?.build}
          fallback={DEFAULT_BUILD_MODEL}
          onChange={setBuild}
        />
        <SettingRow title="Review step" description="Run a review agent when a task enters In Review — off skips straight to Done">
          <Checkbox
            checked={reviewEnabled}
            onCheckedChange={(checked) => updateWorkspaceSettings(workspace.id, { reviewEnabled: checked === true })}
          />
        </SettingRow>
        {reviewEnabled && (
          <ModelPicker
            label="Review model"
            description="Model/CLI run when a task enters In Review"
            choice={models?.review}
            fallback={DEFAULT_REVIEW_MODEL}
            onChange={setReview}
          />
        )}
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

      <PipelineSection workspace={workspace} />

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
            <Checkbox
              checked={workspace.settings.showHiddenFiles ?? false}
              onCheckedChange={(checked) => updateWorkspaceSettings(workspace.id, { showHiddenFiles: checked === true })}
            />
          </SettingRow>
        </div>
      </div>
    </div>
  );
}
