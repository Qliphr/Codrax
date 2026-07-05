import { useEffect, useState } from "react";
import { COLORS, PRIORITY_COLORS, accentBorder, accentDim, withAlpha } from "@/lib/theme";
import { COLUMN_KEYS, COLUMN_LABELS, type ColumnKey, type Priority } from "@/lib/types";
import type { NewCardInput } from "@/stores/kanban.store";
import { usePresence } from "@/hooks/usePresence";

const PRIORITIES: Priority[] = ["critical", "high", "medium", "low"];

interface NewTaskModalProps {
  open: boolean;
  initialColumn: ColumnKey;
  onClose: () => void;
  onCreate: (input: NewCardInput) => void;
}

export function NewTaskModal({ open, initialColumn, onClose, onCreate }: NewTaskModalProps) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [column, setColumn] = useState<ColumnKey>(initialColumn);
  const { mounted, state } = usePresence(open, 160);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!mounted) return null;

  const titleEmpty = title.trim().length === 0;

  function handleCreate() {
    if (titleEmpty) return;
    onCreate({ title: title.trim(), priority, status: column });
    setTitle("");
    setPriority("medium");
    setColumn(initialColumn);
  }

  return (
    <div
      onClick={onClose}
      data-state={state}
      className="vos-overlay fixed inset-0 z-50 flex items-center justify-center p-10"
      style={{ background: "rgba(6,7,9,0.65)", backdropFilter: "blur(3px)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        data-state={state}
        className="vos-modal flex w-[460px] flex-col overflow-hidden rounded-lg border"
        style={{ background: COLORS.bgSurface, borderColor: COLORS.borderDefault, boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }}
      >
        <div
          className="flex h-[52px] flex-none items-center gap-2.5 border-b px-5"
          style={{ borderColor: COLORS.borderSubtle }}
        >
          <span className="text-[15px] font-semibold">New task</span>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md border text-sm"
            style={{ borderColor: COLORS.borderDefault, color: COLORS.textSecondary }}
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-[10px] uppercase tracking-wider" style={{ color: COLORS.textMuted }}>
              Title
            </label>
            <input
              className="vos-input"
              placeholder="e.g. Add password reset flow"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-[10px] uppercase tracking-wider" style={{ color: COLORS.textMuted }}>
              Priority
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRIORITIES.map((p) => {
                const color = PRIORITY_COLORS[p];
                const selected = p === priority;
                return (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className="rounded-md border px-2.5 py-1.5 font-sans text-[11px] font-semibold uppercase tracking-wider"
                    style={{
                      color: selected ? color : COLORS.textSecondary,
                      background: selected ? withAlpha(color, "1c") : "transparent",
                      borderColor: selected ? withAlpha(color, "40") : COLORS.borderDefault,
                    }}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-[10px] uppercase tracking-wider" style={{ color: COLORS.textMuted }}>
              Column
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COLUMN_KEYS.map((key) => {
                const selected = key === column;
                return (
                  <button
                    key={key}
                    onClick={() => setColumn(key)}
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
        </div>

        <div className="flex-none border-t p-4" style={{ borderColor: COLORS.borderSubtle }}>
          <button
            onClick={handleCreate}
            disabled={titleEmpty}
            className="w-full rounded-md py-2.5 font-sans text-[13px] font-semibold text-white"
            style={{
              background: titleEmpty ? COLORS.borderDefault : COLORS.accent,
              cursor: titleEmpty ? "not-allowed" : "pointer",
              opacity: titleEmpty ? 0.6 : 1,
            }}
          >
            Create task
          </button>
        </div>
      </div>
    </div>
  );
}
