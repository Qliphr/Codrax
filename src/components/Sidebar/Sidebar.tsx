import { useEffect, useRef, useState } from "react";
import { COLORS, accentDim } from "@/lib/theme";
import type { Workspace } from "@/lib/types";
import { WorkspaceList } from "./WorkspaceList";
import { FileTree } from "./FileTree";
import { GitGraph } from "./GitGraph";

export type BoardView = "board" | "terminals";

const SIDEBAR_MIN_WIDTH = 224;
const SIDEBAR_MAX_WIDTH = 480;
const SIDEBAR_WIDTH_STORAGE_KEY = "codrax-sidebar-width";

interface SidebarProps {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  workspaceCounts: Record<string, number>;
  missingWorkspaceIds: Set<string>;
  onSelectWorkspace: (id: string) => void;
  onAddWorkspace: () => void;
  onRelocateWorkspace: (id: string) => void;
  onRemoveWorkspace: (id: string) => void;
  view: BoardView;
  onSetView: (view: BoardView) => void;
}

const navItemBase = "mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[15px] cursor-pointer";

export function Sidebar({
  workspaces,
  activeWorkspaceId,
  workspaceCounts,
  missingWorkspaceIds,
  onSelectWorkspace,
  onAddWorkspace,
  onRelocateWorkspace,
  onRemoveWorkspace,
  view,
  onSetView,
}: SidebarProps) {
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) ?? workspaces[0];

  const [width, setWidth] = useState(() => {
    const stored = Number(localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY));
    return stored >= SIDEBAR_MIN_WIDTH && stored <= SIDEBAR_MAX_WIDTH ? stored : SIDEBAR_MIN_WIDTH;
  });
  const isResizing = useRef(false);

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!isResizing.current) return;
      const next = Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, e.clientX));
      setWidth(next);
    }
    function handleMouseUp() {
      if (!isResizing.current) return;
      isResizing.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setWidth((current) => {
        localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(current));
        return current;
      });
    }
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return (
    <div
      className="relative flex flex-none flex-col overflow-y-auto border-r"
      style={{ width, borderColor: COLORS.borderSubtle, background: COLORS.bgSidebar }}
    >
      <div
        onMouseDown={() => {
          isResizing.current = true;
          document.body.style.cursor = "col-resize";
          document.body.style.userSelect = "none";
        }}
        className="absolute right-0 top-0 z-10 h-full w-1 cursor-col-resize"
        style={{ transform: "translateX(50%)" }}
      />

      <WorkspaceList
        workspaces={workspaces}
        activeId={activeWorkspaceId}
        counts={workspaceCounts}
        missingIds={missingWorkspaceIds}
        onSelect={onSelectWorkspace}
        onAdd={onAddWorkspace}
        onRelocate={onRelocateWorkspace}
        onRemove={onRemoveWorkspace}
      />

      <div className="mt-1.5 border-t px-3 py-2" style={{ borderColor: COLORS.borderSubtle }}>
        <div
          onClick={() => onSetView("board")}
          className={navItemBase}
          style={{
            color: view === "board" ? COLORS.textPrimary : COLORS.textSecondary,
            background: view === "board" ? accentDim() : "transparent",
            boxShadow: view === "board" ? `inset 2px 0 0 ${COLORS.accent}` : undefined,
          }}
        >
          <span className="w-[18px] font-sans text-[15px]">▤</span>
          <span>Board</span>
        </div>
        <div
          onClick={() => onSetView("terminals")}
          className={navItemBase}
          style={{
            color: view === "terminals" ? COLORS.textPrimary : COLORS.textSecondary,
            background: view === "terminals" ? accentDim() : "transparent",
            boxShadow: view === "terminals" ? `inset 2px 0 0 ${COLORS.accent}` : undefined,
          }}
        >
          <span className="w-[18px] font-sans text-[15px]">▧</span>
          <span>Terminals</span>
        </div>
      </div>

      {activeWorkspace && (
        <>
          <FileTree workspaceName={activeWorkspace.name} workspacePath={activeWorkspace.path} />
          <GitGraph workspacePath={activeWorkspace.path} />
        </>
      )}
    </div>
  );
}
