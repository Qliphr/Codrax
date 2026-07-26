import { pipelineChipVisual } from "@/lib/theme";
import { PIPELINE_STEP_NAMES, REVIEW_STEP_INDEX, isReviewEnabled, pipelineStepLabel, type PipelineStepState } from "@/lib/types";
import { useWorkspaceStore } from "@/stores/workspace.store";
import { useKanbanStore } from "@/stores/kanban.store";

interface PipelineChipsProps {
  pipeline: PipelineStepState[];
}

export function PipelineChips({ pipeline }: PipelineChipsProps) {
  const workspaceId = useKanbanStore((s) => s.workspaceId);
  const settings = useWorkspaceStore((s) => s.workspaces.find((w) => w.id === workspaceId)?.settings);
  const reviewEnabled = isReviewEnabled(settings);

  return (
    <div className="flex flex-wrap items-center gap-[5px]">
      {PIPELINE_STEP_NAMES.map((_, i) => {
        if (i === REVIEW_STEP_INDEX && !reviewEnabled) return null;
        const name = pipelineStepLabel(i, settings);
        const state = pipeline[i];
        const visual = pipelineChipVisual(state);
        return (
          <span
            key={i}
            className="inline-flex items-center gap-[5px] whitespace-nowrap rounded-md px-2 py-[2px] font-sans text-[10px] font-medium leading-snug"
            style={{
              color: visual.color,
              background: visual.background,
              border: `1px solid ${visual.border}`,
              boxShadow: visual.glow ?? "0 1px 2px rgba(0,0,0,.25)",
              animation: state === "active" ? "pulseGlow 1.7s ease-in-out infinite" : undefined,
              borderStyle: state === "idle" ? "dashed" : "solid",
            }}
          >
            <span>{visual.icon}</span>
            {name}
          </span>
        );
      })}
    </div>
  );
}
