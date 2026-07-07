import { useEffect, useRef, useState } from "react";
import { LayoutGrid, SquareTerminal } from "lucide-react";
import { COLORS, accentDim } from "@/lib/theme";
import type { Workspace } from "@/lib/types";
import { WorkspaceList } from "./WorkspaceList";
import { FileTree } from "./FileTree";
import { GitGraph } from "./GitGraph";
import { GitStatus } from "./GitStatus";

export type BoardView = "board" | "terminals";

const SIDEBAR_MIN_WIDTH = 224;
const SIDEBAR_MAX_WIDTH = 480;
const SIDEBAR_WIDTH_STORAGE_KEY = "codrax-sidebar-width";

const FILE_TREE_MIN_HEIGHT = 120;
const GIT_GRAPH_MIN_HEIGHT = 100;
const DIVIDER_HEIGHT = 5;
const FILE_TREE_HEIGHT_STORAGE_KEY = "codrax-filetree-height";
const FILE_TREE_DEFAULT_HEIGHT = 260;

interface SidebarProps {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  workspaceCounts: Record<string, number>;
  missingWorkspaceIds: Set<string>;
  onSelectWorkspace: (id: string) => void;
  onAddWorkspace: () => void;
  onRelocateWorkspace: (id: string) => void;
  onRemoveWorkspace: (id: string) => void;
  onRenameWorkspace: (id: string, name: string) => void;
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
  onRenameWorkspace,
  view,
  onSetView,
}: SidebarProps) {
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) ?? workspaces[0];
  const [gitVersion, setGitVersion] = useState(0);

  const [width, setWidth] = useState(() => {
    const stored = Number(localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY));
    return stored >= SIDEBAR_MIN_WIDTH && stored <= SIDEBAR_MAX_WIDTH ? stored : SIDEBAR_MIN_WIDTH;
  });
  const isResizing = useRef(false);

  const [fileTreeHeight, setFileTreeHeight] = useState(() => {
    const stored = Number(localStorage.getItem(FILE_TREE_HEIGHT_STORAGE_KEY));
    return stored >= FILE_TREE_MIN_HEIGHT ? stored : FILE_TREE_DEFAULT_HEIGHT;
  });
  const isResizingSplit = useRef(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (isResizing.current) {
        const next = Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, e.clientX));
        setWidth(next);
      }
      if (isResizingSplit.current && splitContainerRef.current) {
        const top = splitContainerRef.current.getBoundingClientRect().top;
        const containerHeight = splitContainerRef.current.clientHeight;
        const max = containerHeight - DIVIDER_HEIGHT - GIT_GRAPH_MIN_HEIGHT;
        const next = Math.min(max, Math.max(FILE_TREE_MIN_HEIGHT, e.clientY - top));
        setFileTreeHeight(next);
      }
    }
    function handleMouseUp() {
      if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        setWidth((current) => {
          localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(current));
          return current;
        });
      }
      if (isResizingSplit.current) {
        isResizingSplit.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        setFileTreeHeight((current) => {
          localStorage.setItem(FILE_TREE_HEIGHT_STORAGE_KEY, String(current));
          return current;
        });
      }
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
      className="relative flex flex-none flex-col overflow-hidden border-r"
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
        onRename={onRenameWorkspace}
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
          <LayoutGrid size={16} className="w-[18px]" strokeWidth={2} />
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
          <SquareTerminal size={16} className="w-[18px]" strokeWidth={2} />
          <span>Terminals</span>
        </div>
      </div>

      {activeWorkspace && (
        <div ref={splitContainerRef} className="flex min-h-0 flex-1 flex-col">
          <div style={{ height: fileTreeHeight }} className="min-h-0 flex-none overflow-y-auto">
            <FileTree
              workspaceName={activeWorkspace.name}
              workspacePath={activeWorkspace.path}
              showHiddenFiles={activeWorkspace.settings.showHiddenFiles ?? false}
            />
          </div>
          <div
            onMouseDown={() => {
              isResizingSplit.current = true;
              document.body.style.cursor = "row-resize";
              document.body.style.userSelect = "none";
            }}
            className="flex-none cursor-row-resize"
            style={{ height: DIVIDER_HEIGHT, borderTop: `1px solid ${COLORS.borderSubtle}` }}
          />
          <div className="min-h-0 flex-1 overflow-y-auto">
            <GitGraph workspacePath={activeWorkspace.path} refreshToken={gitVersion} />
          </div>
          <GitStatus workspacePath={activeWorkspace.path} onGitChanged={() => setGitVersion((v) => v + 1)} />
        </div>
      )}
    </div>
  );
}
