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
}

interface ContextMenuState {
  id: string;
  x: number;
  y: number;
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
}: WorkspaceListProps) {
  const [menu, setMenu] = useState<ContextMenuState | null>(null);

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

        return (
          <div
            key={ws.id}
            onClick={() => onSelect(ws.id)}
            onContextMenu={(e) => openMenu(e, ws)}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-[15px] hover:bg-[#2C2725]"
            style={{
              color: active ? COLORS.textPrimary : COLORS.textSecondary,
              background: active ? "#2C2725" : "transparent",
              fontWeight: active ? 500 : 400,
            }}
          >
            <span className="h-2 w-2 flex-none rounded-sm" style={{ background: ws.dot }} />
            <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{ws.name}</span>
            <span
              className="min-w-[22px] rounded-md px-2 py-[3px] text-center font-sans text-xs"
              style={{
                color: active ? COLORS.accent : COLORS.textMuted,
                background: active ? accentDim() : COLORS.bgSurface,
              }}
            >
              {counts[ws.id] ?? 0}
            </span>
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
