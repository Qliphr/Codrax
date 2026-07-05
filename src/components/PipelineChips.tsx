import { pipelineChipVisual } from "@/lib/theme";
import { PIPELINE_STEP_NAMES, type PipelineStepState } from "@/lib/types";

interface PipelineChipsProps {
  pipeline: PipelineStepState[];
}

export function PipelineChips({ pipeline }: PipelineChipsProps) {
  return (
    <div className="flex flex-wrap items-center gap-[5px]">
      {PIPELINE_STEP_NAMES.map((name, i) => {
        const state = pipeline[i];
        const visual = pipelineChipVisual(state);
        return (
          <span
            key={name}
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
