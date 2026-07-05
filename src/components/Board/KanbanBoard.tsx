import { useState } from "react";
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { COLORS, accentBorder, accentDim } from "@/lib/theme";
import { COLUMN_LABELS, type Card, type ColumnKey } from "@/lib/types";
import { KanbanColumn, type ColumnDef } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";

const COLUMN_DEFS: ColumnDef[] = [
  { key: "todo", name: COLUMN_LABELS.todo, dot: "#948B81" },
  { key: "in-progress", name: COLUMN_LABELS["in-progress"], dot: COLORS.accent },
  { key: "in-review", name: COLUMN_LABELS["in-review"], dot: "#FFD166" },
  { key: "done", name: COLUMN_LABELS.done, dot: "#6BCB77" },
];

const VALID_COLUMN_KEYS = new Set<string>(COLUMN_DEFS.map((c) => c.key));

interface KanbanBoardProps {
  cards: Card[];
  activeCount: number;
  onCreateTask: (column: ColumnKey) => void;
  onMoveCard: (cardId: string, status: ColumnKey) => void;
  onCardClick?: (card: Card) => void;
}

export function KanbanBoard({ cards, activeCount, onCreateTask, onMoveCard, onCardClick }: KanbanBoardProps) {
  const [draggingCard, setDraggingCard] = useState<Card | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function handleDragStart(event: DragStartEvent) {
    const card = cards.find((c) => c.id === event.active.id);
    setDraggingCard(card ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggingCard(null);
    const overId = event.over?.id;
    if (typeof overId !== "string" || !VALID_COLUMN_KEYS.has(overId)) return;
    const cardId = String(event.active.id);
    const card = cards.find((c) => c.id === cardId);
    if (!card || card.status === overId) return;
    onMoveCard(cardId, overId as ColumnKey);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="flex h-[50px] flex-none items-center gap-3 border-b px-5"
        style={{ borderColor: COLORS.borderSubtle }}
      >
        <span className="text-[15px] font-semibold">Board</span>
        <span className="font-sans text-xs" style={{ color: COLORS.textMuted }}>
          {cards.length} tasks · {activeCount} running
        </span>
        <div className="flex-1" />
        <button
          onClick={() => onCreateTask("todo")}
          className="flex items-center gap-1.5 rounded-md border px-3.5 py-2 font-sans text-[13px] font-medium"
          style={{ background: accentDim(), borderColor: accentBorder(), color: COLORS.accent }}
        >
          <span className="text-sm leading-none">＋</span> New task
        </button>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex min-h-0 flex-1 gap-3.5 overflow-x-auto px-5 py-4">
          {COLUMN_DEFS.map((col) => (
            <KanbanColumn
              key={col.key}
              column={col}
              cards={cards.filter((c) => c.status === col.key)}
              onCreateTask={onCreateTask}
              onCardClick={onCardClick}
            />
          ))}
        </div>
        <DragOverlay>{draggingCard && <KanbanCard card={draggingCard} dragHandleDisabled />}</DragOverlay>
      </DndContext>
    </div>
  );
}
