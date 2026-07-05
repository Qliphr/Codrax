import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { COLORS, PRIORITY_COLORS, withAlpha } from "@/lib/theme";
import { PIPELINE_STEP_NAMES, type Card } from "@/lib/types";
import { PipelineChips } from "@/components/PipelineChips";

interface KanbanCardProps {
  card: Card;
  onClick?: (card: Card) => void;
  dragHandleDisabled?: boolean;
}

export function KanbanCard({ card, onClick, dragHandleDisabled }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    disabled: dragHandleDisabled,
  });

  const priorityColor = PRIORITY_COLORS[card.priority];
  const failed = card.pipeline.includes("failed");
  const activeStepIdx = card.pipeline.indexOf("active");
  const activeStepName = activeStepIdx >= 0 ? PIPELINE_STEP_NAMES[activeStepIdx] : null;
  const isDone = card.status === "done";
  const isRunning = card.status === "in-progress";

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onClick?.(card)}
      className="relative flex cursor-pointer flex-col gap-2.5 rounded-lg border p-[13px_14px_13px_16px] transition-transform hover:-translate-y-px"
      style={{
        background: COLORS.bgSurface,
        borderColor: failed ? "#FF475755" : isRunning ? withAlpha(COLORS.accent, "55") : COLORS.borderDefault,
        boxShadow: isRunning
          ? `0 0 0 1px ${withAlpha(COLORS.accent, "1a")}, 0 8px 22px rgba(0,0,0,0.4)`
          : "0 1px 2px rgba(0,0,0,.3)",
        opacity: isDone ? 0.55 : isDragging ? 0.35 : 1,
        transform: transform ? CSS.Translate.toString(transform) : undefined,
        touchAction: "none",
      }}
    >
      <span
        className="absolute bottom-0 left-0 top-0 w-1 rounded-l-lg"
        style={{ background: failed ? "#FF4757" : priorityColor }}
      />

      <div className="flex items-start justify-between gap-2">
        <span className="text-[13.5px] font-semibold leading-snug tracking-tight">{card.title}</span>
      </div>

      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center rounded-md px-2 py-[2px] font-sans text-[9.5px] font-semibold tracking-wider"
          style={{ color: priorityColor, background: withAlpha(priorityColor, "1c"), border: `1px solid ${withAlpha(priorityColor, "40")}` }}
        >
          {card.priority.toUpperCase()}
        </span>
        <span className="font-sans text-[11px]" style={{ color: COLORS.textMuted }}>
          {card.project}
        </span>
        {activeStepName && !failed && (
          <span className="ml-auto flex items-center gap-1 font-sans text-[10px]" style={{ color: COLORS.accent }}>
            <span
              className="h-[5px] w-[5px] animate-[dotPulse_1.6s_ease-in-out_infinite] rounded-full"
              style={{ background: COLORS.accent }}
            />
            {activeStepName}
          </span>
        )}
        {failed && (
          <span className="ml-auto flex items-center gap-1 font-sans text-[10px]" style={{ color: "#FF4757" }}>
            ✕ Failed
          </span>
        )}
      </div>

      <PipelineChips pipeline={card.pipeline} />
    </div>
  );
}
