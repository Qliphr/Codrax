import { useState } from "react";
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { COLORS, accentBorder, accentDim } from "@/lib/theme";
import { COLUMN_LABELS, type Card, type ColumnKey } from "@/lib/types";
import { KanbanColumn, type ColumnDef } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COLUMN_DEFS: ColumnDef[] = [
  { key: "todo", name: COLUMN_LABELS.todo, dot: "#948B81" },
  { key: "in-progress", name: COLUMN_LABELS["in-progress"], dot: COLORS.accent },
  { key: "in-review", name: COLUMN_LABELS["in-review"], dot: "#FFD166" },
  { key: "done", name: COLUMN_LABELS.done, dot: "#6BCB77" },
];

const VALID_COLUMN_KEYS = new Set<string>(COLUMN_DEFS.map((c) => c.key));

const SORT_OPTIONS = [
  { key: "manual", label: "Manual order" },
  { key: "priority", label: "Priority" },
  { key: "title", label: "Title (A-Z)" },
  { key: "newest", label: "Newest first" },
  { key: "oldest", label: "Oldest first" },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]["key"];

const PRIORITY_RANK: Record<Card["priority"], number> = { critical: 0, high: 1, medium: 2, low: 3 };

function cardOrderNum(card: Card): number {
  const n = Number(card.id.split("-").pop());
  return Number.isFinite(n) ? n : 0;
}

function sortCards(cards: Card[], sortBy: SortKey): Card[] {
  if (sortBy === "manual") return cards;
  const sorted = [...cards];
  switch (sortBy) {
    case "priority":
      sorted.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
      break;
    case "title":
      sorted.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case "newest":
      sorted.sort((a, b) => cardOrderNum(b) - cardOrderNum(a));
      break;
    case "oldest":
      sorted.sort((a, b) => cardOrderNum(a) - cardOrderNum(b));
      break;
  }
  return sorted;
}

interface KanbanBoardProps {
  cards: Card[];
  activeCount: number;
  reviewEnabled: boolean;
  onCreateTask: (column: ColumnKey) => void;
  onMoveCard: (cardId: string, status: ColumnKey) => void;
  onCardClick?: (card: Card) => void;
}

export function KanbanBoard({ cards, activeCount, reviewEnabled, onCreateTask, onMoveCard, onCardClick }: KanbanBoardProps) {
  const [draggingCard, setDraggingCard] = useState<Card | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("manual");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const columnDefs = reviewEnabled ? COLUMN_DEFS : COLUMN_DEFS.filter((c) => c.key !== "in-review");

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
        <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortKey)}>
          <SelectTrigger className="w-[150px] py-1.5 font-sans text-[12px]" title="Sort tasks">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.key} value={opt.key}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button
          onClick={() => onCreateTask("todo")}
          className="flex items-center gap-1.5 rounded-md border px-3.5 py-2 font-sans text-[13px] font-medium"
          style={{ background: accentDim(), borderColor: accentBorder(), color: COLORS.accent }}
        >
          <span className="text-sm leading-none">＋</span> New task
        </button>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div
          className="flex min-h-0 flex-1 justify-center overflow-x-auto px-12 py-4"
          style={{ gap: "clamp(14px, 4vw, 100px)" }}
        >
          {columnDefs.map((col) => (
            <KanbanColumn
              key={col.key}
              column={col}
              cards={sortCards(cards.filter((c) => c.status === col.key), sortBy)}
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
