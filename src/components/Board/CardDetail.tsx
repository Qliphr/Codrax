import { COLORS, PRIORITY_COLORS, accentBorder, accentDim, pipelineChipVisual, withAlpha } from "@/lib/theme";
import { COLUMN_KEYS, COLUMN_LABELS, PIPELINE_STEP_NAMES, type Card, type ColumnKey } from "@/lib/types";
import { usePresence } from "@/hooks/usePresence";

interface CardDetailProps {
  card: Card | null;
  onClose: () => void;
  onMoveCard: (cardId: string, status: ColumnKey) => void;
  onAdvance: (card: Card) => void;
  onOpenInTerminal: (card: Card) => void;
  onDelete: (card: Card) => void;
}

export function CardDetail({ card, onClose, onMoveCard, onAdvance, onOpenInTerminal, onDelete }: CardDetailProps) {
  const { mounted, state } = usePresence(card !== null, 160);
  if (!mounted || !card) return null;

  const priorityColor = PRIORITY_COLORS[card.priority];
  const allDone = card.pipeline.every((s) => s === "done");

  return (
    <>
      <div
        onClick={onClose}
        data-state={state}
        className="vos-overlay fixed inset-0 z-40"
        style={{ background: "rgba(6,7,9,0.6)", backdropFilter: "blur(2px)" }}
      />
      <div
        data-state={state}
        className="vos-panel fixed bottom-0 right-0 top-0 z-[41] flex w-[440px] flex-col border-l"
        style={{ background: COLORS.bgSurface, borderColor: COLORS.borderDefault, boxShadow: "-16px 0 40px rgba(0,0,0,0.5)" }}
      >
        <div
          className="flex h-[46px] flex-none items-center gap-2.5 border-b px-4"
          style={{ borderColor: COLORS.borderSubtle }}
        >
          <span className="font-sans text-[11px]" style={{ color: COLORS.textMuted }}>
            TASK · {card.id}
          </span>
          <div className="flex-1" />
          <button
            onClick={() => onDelete(card)}
            title="Delete task"
            className="flex h-7 w-7 items-center justify-center rounded-md border text-sm"
            style={{ borderColor: COLORS.borderDefault, color: "#FF4757" }}
          >
            🗑
          </button>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md border text-sm"
            style={{ borderColor: COLORS.borderDefault, color: COLORS.textSecondary }}
          >
            ✕
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-5">
          <div className="flex flex-col gap-3">
            <span
              className="inline-flex w-fit items-center rounded-md px-2 py-[2px] font-sans text-[9.5px] font-semibold tracking-wider"
              style={{ color: priorityColor, background: withAlpha(priorityColor, "1c"), border: `1px solid ${withAlpha(priorityColor, "40")}` }}
            >
              {card.priority.toUpperCase()}
            </span>
            <div className="text-xl font-semibold leading-tight tracking-tight">{card.title}</div>
            <div className="font-sans text-xs" style={{ color: COLORS.textSecondary }}>
              ~/dev/{card.project}
            </div>
            <div className="text-[13.5px] leading-relaxed" style={{ color: COLORS.textBody }}>
              {card.description || "No description."}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="font-sans text-[10px] uppercase tracking-wider" style={{ color: COLORS.textMuted }}>
              Column
            </div>
            <div className="flex flex-wrap gap-1.5">
              {COLUMN_KEYS.map((key) => {
                const selected = key === card.status;
                return (
                  <button
                    key={key}
                    onClick={() => onMoveCard(card.id, key)}
                    className="rounded-md border px-2.5 py-1.5 font-sans text-[12px]"
                    style={{
                      color: selected ? COLORS.accent : COLORS.textSecondary,
                      background: selected ? accentDim() : "transparent",
                      borderColor: selected ? accentBorder() : COLORS.borderDefault,
                    }}
                  >
                    {COLUMN_LABELS[key]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="font-sans text-[10px] uppercase tracking-wider" style={{ color: COLORS.textMuted }}>
                Pipeline
              </div>
              <button
                onClick={() => onAdvance(card)}
                disabled={allDone}
                className="rounded-md border px-2.5 py-1 font-sans text-[11px]"
                style={{
                  color: allDone ? COLORS.textDim : COLORS.accent,
                  background: allDone ? "transparent" : accentDim(),
                  borderColor: allDone ? COLORS.borderDefault : accentBorder(),
                  cursor: allDone ? "not-allowed" : "pointer",
                }}
              >
                Advance ▸
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {PIPELINE_STEP_NAMES.map((name, i) => {
                const state = card.pipeline[i];
                const visual = pipelineChipVisual(state);
                return (
                  <div
                    key={name}
                    className="flex items-center gap-2.5 rounded-md border px-3 py-2"
                    style={{ borderColor: COLORS.borderSubtle, background: COLORS.bgPanel }}
                  >
                    <span style={{ color: visual.color }}>{visual.icon}</span>
                    <span className="flex-1 text-[13px]" style={{ color: visual.color }}>
                      {name}
                    </span>
                    <span
                      className="font-sans text-[10px] uppercase tracking-wider"
                      style={{ color: visual.color }}
                    >
                      {state}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex-none border-t p-4" style={{ borderColor: COLORS.borderSubtle }}>
          <button
            onClick={() => onOpenInTerminal(card)}
            disabled={!card.terminalId}
            className="w-full rounded-md py-2.5 font-sans text-[13px] font-semibold text-white"
            style={{
              background: card.terminalId ? COLORS.accent : COLORS.borderDefault,
              opacity: card.terminalId ? 1 : 0.6,
              cursor: card.terminalId ? "pointer" : "not-allowed",
            }}
          >
            Open in terminal ▸
          </button>
        </div>
      </div>
    </>
  );
}
