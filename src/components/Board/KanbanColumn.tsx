import { useDroppable } from "@dnd-kit/core";
import { COLORS, accentDim } from "@/lib/theme";
import type { Card, ColumnKey } from "@/lib/types";
import { KanbanCard } from "./KanbanCard";

export interface ColumnDef {
  key: ColumnKey;
  name: string;
  dot: string;
}

interface KanbanColumnProps {
  column: ColumnDef;
  cards: Card[];
  onCreateTask: (column: ColumnKey) => void;
  onCardClick?: (card: Card) => void;
}

export function KanbanColumn({ column, cards, onCreateTask, onCardClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key });

  return (
    <div className="flex w-[288px] flex-none flex-col">
      <div className="flex items-center gap-2 px-1 pb-3">
        <span className="h-[7px] w-[7px] rounded-sm" style={{ background: column.dot }} />
        <span className="text-[13px] font-semibold tracking-tight">{column.name}</span>
        <span
          className="rounded px-1.5 py-px font-sans text-[11px]"
          style={{ color: COLORS.textMuted, background: COLORS.bgSurface }}
        >
          {cards.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className="flex flex-1 flex-col gap-2.5 overflow-y-auto rounded-lg px-[3px] pb-5 pt-0.5"
        style={{ background: isOver ? accentDim() : undefined, outline: isOver ? `1px dashed ${COLORS.accent}` : undefined }}
      >
        {cards.length === 0 && (
          <div
            className="flex min-h-[120px] flex-1 flex-col items-center justify-center gap-2 rounded-lg border-[1.5px] border-dashed p-6"
            style={{ borderColor: COLORS.borderDefault }}
          >
            <span className="font-sans text-[11px]" style={{ color: COLORS.textDim }}>
              No tasks in {column.name}
            </span>
          </div>
        )}

        {cards.map((card) => (
          <KanbanCard key={card.id} card={card} onClick={onCardClick} />
        ))}

        <div
          onClick={() => onCreateTask(column.key)}
          className="cursor-pointer rounded-lg border border-dashed p-3.5 text-center text-xs hover:text-[color:var(--color-text-secondary)]"
          style={{ borderColor: COLORS.borderDefault, color: COLORS.textDim }}
        >
          ＋ Create a task
        </div>
      </div>
    </div>
  );
}
