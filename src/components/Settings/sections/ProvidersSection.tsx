import { useEffect, useState } from "react";
import { COLORS, accentBorder, accentDim } from "@/lib/theme";
import { useProviderStore } from "@/stores/provider.store";
import { useWorkspaceStore } from "@/stores/workspace.store";
import {
  AGENT_MODEL_PRESETS,
  AGENT_MODEL_PRESET_CLI,
  DEFAULT_BUILD_MODEL,
  DEFAULT_REVIEW_MODEL,
  type AgentModelChoice,
  type Workspace,
} from "@/lib/types";
import { SettingRow } from "@/components/Settings/SettingRow";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function ModelPicker({
  label,
  description,
  choice,
  fallback,
  detected,
  onChange,
}: {
  label: string;
  description: string;
  choice: AgentModelChoice | undefined;
  fallback: AgentModelChoice;
  detected: Record<string, boolean>;
  onChange: (choice: AgentModelChoice) => void;
}) {
  const preset = choice?.preset ?? fallback.preset;
  const [customDraft, setCustomDraft] = useState(choice?.customCommand ?? "");

  const availablePresets = AGENT_MODEL_PRESETS.filter((p) => {
    const cli = AGENT_MODEL_PRESET_CLI[p.id];
    return cli === null || detected[cli] || p.id === preset;
  });

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
            {availablePresets.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {preset === "custom" && (
          <input
            className="vos-input w-[220px]"
            placeholder="mycli run {task}"
            value={customDraft}
            onChange={(e) => setCustomDraft(e.target.value)}
            onBlur={() => onChange({ preset: "custom", customCommand: customDraft.trim() })}
          />
        )}
      </div>
    </SettingRow>
  );
}

function PipelineSection({ workspace, detected }: { workspace: Workspace; detected: Record<string, boolean> }) {
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
          detected={detected}
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
            detected={detected}
            onChange={setReview}
          />
        )}
      </div>
    </div>
  );
}

export function ProvidersSection({ workspace }: { workspace: Workspace | undefined }) {
  const { hydrate, loading, addCustom, rows, detected } = useProviderStore();
  const [name, setName] = useState("");
  const [cli, setCli] = useState("");

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const providerRows = rows();
  const disabled = name.trim().length === 0 || cli.trim().length === 0;

  return (
    <div className="flex flex-col gap-3">
      {workspace && <PipelineSection workspace={workspace} detected={detected} />}

      <div className="flex items-center gap-2">
        <h3 className="font-sans text-[11px] uppercase tracking-wider" style={{ color: COLORS.textMuted }}>
          Detected AI CLIs
        </h3>
        {loading ? (
          <span className="font-sans text-[10.5px]" style={{ color: COLORS.textDim }}>
            detecting…
          </span>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-lg border" style={{ borderColor: COLORS.borderSubtle }}>
        <div
          className="grid grid-cols-[1.4fr_1fr_1.1fr] border-b px-3.5 py-2 font-sans text-[10px] uppercase tracking-wider"
          style={{ borderColor: COLORS.borderSubtle, color: COLORS.textMuted, background: COLORS.bgPanel }}
        >
          <span>Provider</span>
          <span>CLI</span>
          <span>Status</span>
        </div>

        {providerRows.map((p) => (
          <div
            key={p.cli}
            className="grid grid-cols-[1.4fr_1fr_1.1fr] items-center border-b px-3.5 py-2.5 last:border-b-0"
            style={{ borderColor: COLORS.borderSubtle }}
          >
            <span className="text-[13px] font-medium">{p.name}</span>
            <span className="font-sans text-[12px]" style={{ color: COLORS.textSecondary }}>
              {p.cli}
            </span>
            <span
              className="inline-flex items-center gap-1.5 font-sans text-[11px]"
              style={{ color: p.detected ? "#6BCB77" : COLORS.textMuted }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "currentColor" }} />
              {p.detected ? "Detected" : "Missing"}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          className="vos-input flex-1"
          placeholder="Provider name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input className="vos-input flex-1" placeholder="command" value={cli} onChange={(e) => setCli(e.target.value)} />
        <button
          disabled={disabled}
          onClick={async () => {
            await addCustom(name.trim(), cli.trim());
            setName("");
            setCli("");
          }}
          className="rounded-md border px-3 py-2 font-sans text-[12.5px]"
          style={{
            color: disabled ? COLORS.textDim : COLORS.accent,
            background: disabled ? "transparent" : accentDim(),
            borderColor: disabled ? COLORS.borderDefault : accentBorder(),
            cursor: disabled ? "not-allowed" : "pointer",
          }}
        >
          ＋ Add
        </button>
      </div>
    </div>
  );
}
