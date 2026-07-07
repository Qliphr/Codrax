import { useEffect, useMemo, useState } from "react";
import { COLORS } from "@/lib/theme";
import type { FileEntry } from "@/lib/types";
import { useFileTree } from "@/hooks/useFileTree";
import { useGitStatus } from "@/hooks/useGitStatus";
import { fileIconUrl, folderIconUrl } from "@/lib/fileIcons/iconResolver";

const GIT_TEXT_COLORS: Record<"M" | "A" | "D", string> = {
  M: "#E8C170",
  A: "#73C991",
  D: "#E5877A",
};

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
        transition: "transform 120ms ease",
      }}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function visibleEntries(files: FileEntry[], expanded: Set<string>): FileEntry[] {
  const visible: FileEntry[] = [];
  let hideDepth: number | null = null;
  for (const f of files) {
    if (hideDepth !== null) {
      if (f.depth > hideDepth) continue;
      hideDepth = null;
    }
    visible.push(f);
    if (f.dir && !expanded.has(f.path)) {
      hideDepth = f.depth;
    }
  }
  return visible;
}

interface FileTreeProps {
  workspaceName: string;
  workspacePath: string;
  showHiddenFiles: boolean;
}

export function FileTree({ workspaceName, workspacePath, showHiddenFiles }: FileTreeProps) {
  const { files, loading } = useFileTree(workspacePath, showHiddenFiles);
  const { status } = useGitStatus(workspacePath);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    setExpanded(new Set());
  }, [files]);

  const changesByPath = useMemo(() => {
    const map = new Map<string, "M" | "A" | "D">();
    if (status?.kind === "ok") {
      for (const c of status.changes) map.set(c.path, c.tag);
    }
    return map;
  }, [status]);

  const rows = visibleEntries(files, expanded);

  function toggle(path: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  return (
    <div className="border-t px-3 py-2.5" style={{ borderColor: COLORS.borderSubtle }}>
      <div
        className="px-1.5 pb-2 font-sans text-[10px] uppercase tracking-wider"
        style={{ color: COLORS.textMuted }}
      >
        Files · {workspaceName}
      </div>

      {loading && (
        <div className="px-1.5 font-sans text-[11px]" style={{ color: COLORS.textDim }}>
          Loading…
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div className="px-1.5 font-sans text-[11px]" style={{ color: COLORS.textDim }}>
          Empty folder
        </div>
      )}

      {rows.map((f) => {
        const mod = !f.dir ? changesByPath.get(f.path) : undefined;
        const isOpen = f.dir && expanded.has(f.path);
        const isSelected = selected === f.path;
        const iconUrl = f.dir ? folderIconUrl(f.name, isOpen) : fileIconUrl(f.name);
        return (
          <div
            key={f.path}
            onClick={() => {
              setSelected(f.path);
              if (f.dir) toggle(f.path);
            }}
            className="flex h-6 items-center gap-2 rounded-sm pr-1.5"
            style={{
              paddingLeft: 6 + f.depth * 12,
              color: isSelected
                ? COLORS.textPrimary
                : mod
                  ? GIT_TEXT_COLORS[mod]
                  : COLORS.textSecondary,
              backgroundColor: isSelected ? COLORS.bgSurface : "transparent",
              cursor: f.dir ? "pointer" : "default",
            }}
            onMouseEnter={(e) => {
              if (!isSelected) e.currentTarget.style.backgroundColor = COLORS.bgSurface;
            }}
            onMouseLeave={(e) => {
              if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <span
              className="flex size-3.5 flex-none items-center justify-center"
              style={{ color: COLORS.textDim }}
            >
              {f.dir ? <ChevronIcon expanded={isOpen} /> : null}
            </span>
            <img src={iconUrl} alt="" className="size-4 flex-none" />
            <span className="overflow-hidden text-ellipsis whitespace-nowrap font-sans text-[13px]">
              {f.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
