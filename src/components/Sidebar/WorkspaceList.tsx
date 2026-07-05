import { useEffect, useState } from "react";
import { COLORS, accentDim } from "@/lib/theme";
import type { Workspace } from "@/lib/types";

interface WorkspaceListProps {
  workspaces: Workspace[];
  activeId: string;
  counts: Record<string, number>;
  missingIds: Set<string>;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRelocate: (id: string) => void;
  onRemove: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

interface ContextMenuState {
  id: string;
  x: number;
  y: number;
}

function PencilIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="M15 5l4 4" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

export function WorkspaceList({
  workspaces,
  activeId,
  counts,
  missingIds,
  onSelect,
  onAdd,
  onRelocate,
  onRemove,
  onRename,
}: WorkspaceListProps) {
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("click", close);
    window.addEventListener("contextmenu", close);
    window.addEventListener("blur", close);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("contextmenu", close);
      window.removeEventListener("blur", close);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menu]);

  function openMenu(e: React.MouseEvent, ws: Workspace) {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ id: ws.id, x: e.clientX, y: e.clientY });
  }

  return (
    <div className="px-3 pb-1.5 pt-3.5">
      <div
        className="px-1.5 pb-2 font-sans text-[10px] uppercase tracking-wider"
        style={{ color: COLORS.textMuted }}
      >
        Workspaces
      </div>
      {workspaces.map((ws) => {
        const active = ws.id === activeId;
        const missing = missingIds.has(ws.id);

        if (missing) {
          return (
            <div
              key={ws.id}
              onContextMenu={(e) => openMenu(e, ws)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px]"
              style={{ color: COLORS.textDim, opacity: 0.6 }}
            >
              <span className="h-2 w-2 flex-none rounded-sm" style={{ background: ws.dot }} />
              <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap line-through">{ws.name}</span>
              <button
                onClick={() => onRelocate(ws.id)}
                className="rounded px-1.5 py-px font-sans text-[10px]"
                style={{ border: `1px solid ${COLORS.borderDefault}`, color: COLORS.textSecondary }}
              >
                Relocate
              </button>
              <button
                onClick={() => onRemove(ws.id)}
                className="rounded px-1.5 py-px font-sans text-[10px]"
                style={{ border: `1px solid ${COLORS.borderDefault}`, color: "#FF4757" }}
              >
                Remove
              </button>
            </div>
          );
        }

        const editing = editingId === ws.id;

        return (
          <div
            key={ws.id}
            onClick={() => !editing && onSelect(ws.id)}
            onContextMenu={(e) => openMenu(e, ws)}
            className="group flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-[15px] hover:bg-[#2C2725]"
            style={{
              color: active ? COLORS.textPrimary : COLORS.textSecondary,
              background: active ? "#2C2725" : "transparent",
              fontWeight: active ? 500 : 400,
            }}
          >
            <span className="h-2 w-2 flex-none rounded-sm" style={{ background: ws.dot }} />
            {editing ? (
              <input
                autoFocus
                defaultValue={ws.name}
                onClick={(e) => e.stopPropagation()}
                onFocus={(e) => e.currentTarget.select()}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") {
                    onRename(ws.id, e.currentTarget.value);
                    setEditingId(null);
                  } else if (e.key === "Escape") {
                    setEditingId(null);
                  }
                }}
                onBlur={(e) => {
                  onRename(ws.id, e.currentTarget.value);
                  setEditingId(null);
                }}
                className="min-w-0 flex-1 rounded px-1 py-0.5 text-[13px] outline-none"
                style={{ background: COLORS.bgSurface, border: `1px solid ${COLORS.borderDefault}`, color: COLORS.textPrimary }}
              />
            ) : (
              <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{ws.name}</span>
            )}
            {!editing && (
              <>
                <span
                  className="min-w-[22px] rounded-md px-2 py-[3px] text-center font-sans text-xs group-hover:hidden"
                  style={{
                    color: active ? COLORS.accent : COLORS.textMuted,
                    background: active ? accentDim() : COLORS.bgSurface,
                  }}
                >
                  {counts[ws.id] ?? 0}
                </span>
                <div className="hidden flex-none items-center gap-0.5 group-hover:flex">
                  <button
                    type="button"
                    aria-label="Rename workspace"
                    title="Rename workspace"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(ws.id);
                    }}
                    className="flex h-5 w-5 items-center justify-center rounded hover:bg-[#3D3733]"
                    style={{ color: COLORS.textMuted }}
                  >
                    <PencilIcon />
                  </button>
                  <button
                    type="button"
                    aria-label="Delete workspace"
                    title="Delete workspace"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(ws.id);
                    }}
                    className="flex h-5 w-5 items-center justify-center rounded hover:bg-[#3D3733]"
                    style={{ color: COLORS.textMuted }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#FF4757")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = COLORS.textMuted)}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </>
            )}
          </div>
        );
      })}
      <div
        onClick={onAdd}
        className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] hover:bg-[#2C2725]"
        style={{ color: COLORS.textDim }}
      >
        <span className="w-2 flex-none text-center">＋</span>
        <span>Add workspace</span>
      </div>

      {menu && (
        <div
          className="fixed z-50 min-w-[160px] overflow-hidden rounded-lg py-1 font-sans text-[13px] shadow-lg"
          style={{
            top: menu.y,
            left: menu.x,
            background: COLORS.bgSurface,
            border: `1px solid ${COLORS.borderDefault}`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="cursor-pointer px-3 py-1.5 hover:bg-[#332D2A]"
            style={{ color: "#FF4757" }}
            onClick={() => {
              onRemove(menu.id);
              setMenu(null);
            }}
          >
            Remove workspace
          </div>
        </div>
      )}
    </div>
  );
}
