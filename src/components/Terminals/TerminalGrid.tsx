import { useEffect, useRef, useState } from "react";
import { COLORS, accentBorder, accentDim } from "@/lib/theme";
import type { Card, ColumnKey } from "@/lib/types";
import { useTerminalStore } from "@/stores/terminal.store";
import { TerminalPane } from "./TerminalPane";

const GRID_SIZE_OPTIONS: Array<{ rows: number; cols: number }> = [
  { rows: 1, cols: 2 },
  { rows: 2, cols: 1 },
  { rows: 2, cols: 2 },
  { rows: 2, cols: 3 },
  { rows: 3, cols: 2 },
  { rows: 3, cols: 3 },
  { rows: 3, cols: 4 },
  { rows: 4, cols: 4 },
];

interface TerminalGridProps {
  cards: Card[];
  activeWorkspaceId: string;
  onExit: (card: Card, exitCode: number) => void;
  onTurnDone: (card: Card, exitCode: number) => void;
  onManualClose: (card: Card | null, terminalId: string) => void;
  onNewTerminal: () => void;
  onMoveCard: (cardId: string, status: ColumnKey) => void;
}

export function TerminalGrid({
  cards,
  activeWorkspaceId,
  onExit,
  onTurnDone,
  onManualClose,
  onNewTerminal,
  onMoveCard,
}: TerminalGridProps) {
  const allPanes = useTerminalStore((s) => s.panes);
  const gridRows = useTerminalStore((s) => s.gridRows);
  const gridCols = useTerminalStore((s) => s.gridCols);
  const setGridSize = useTerminalStore((s) => s.setGridSize);
  // Idle panes have no workspaceId yet — they belong to whichever workspace claims them next,
  // so they stay visible everywhere. Running panes only show in the workspace that started them.
  const panes = allPanes.filter((p) => p.workspaceId === null || p.workspaceId === activeWorkspaceId);
  const runningCount = panes.filter((p) => p.terminalId !== null).length;
  const hasIdlePane = panes.some((p) => p.terminalId === null);
  const totalRunningCount = allPanes.filter((p) => p.terminalId !== null).length;

  const [sizeMenuOpen, setSizeMenuOpen] = useState(false);
  const sizeMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sizeMenuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (sizeMenuRef.current && !sizeMenuRef.current.contains(e.target as Node)) setSizeMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [sizeMenuOpen]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="flex h-[50px] flex-none items-center gap-3 border-b px-5"
        style={{ borderColor: COLORS.borderSubtle }}
      >
        <span className="text-[15px] font-semibold">Terminals</span>
        <span className="font-sans text-xs" style={{ color: COLORS.textMuted }}>
          {runningCount} running · {panes.length} panes
        </span>
        <div className="flex-1" />
        <div className="relative" ref={sizeMenuRef}>
          <button
            onClick={() => setSizeMenuOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-md border px-3 py-2 font-sans text-[13px] font-medium"
            style={{ borderColor: COLORS.borderDefault, color: COLORS.textSecondary }}
          >
            {gridRows}×{gridCols} ▾
          </button>
          {sizeMenuOpen && (
            <div
              className="absolute right-0 top-full z-10 mt-1 w-28 overflow-hidden rounded-md border font-sans text-[13px] shadow-lg"
              style={{ background: COLORS.bgTermHeader, borderColor: COLORS.borderSubtle }}
            >
              {GRID_SIZE_OPTIONS.map(({ rows, cols }) => {
                const disabled = totalRunningCount > rows * cols;
                const active = rows === gridRows && cols === gridCols;
                return (
                  <button
                    key={`${rows}x${cols}`}
                    disabled={disabled}
                    onClick={() => {
                      setGridSize(rows, cols);
                      setSizeMenuOpen(false);
                    }}
                    className="block w-full px-3 py-2 text-left"
                    style={{
                      color: disabled ? COLORS.textMuted : active ? COLORS.accent : COLORS.textPrimary,
                      cursor: disabled ? "not-allowed" : "pointer",
                      background: active ? accentDim() : "transparent",
                    }}
                  >
                    {rows} × {cols}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <button
          onClick={onNewTerminal}
          disabled={!hasIdlePane}
          className="flex items-center gap-1.5 rounded-md border px-3.5 py-2 font-sans text-[13px] font-medium"
          style={{
            background: hasIdlePane ? accentDim() : "transparent",
            borderColor: hasIdlePane ? accentBorder() : COLORS.borderDefault,
            color: hasIdlePane ? COLORS.accent : COLORS.textDim,
            cursor: hasIdlePane ? "pointer" : "not-allowed",
          }}
        >
          <span className="text-sm leading-none">＋</span> New terminal
        </button>
      </div>

      <div
        className="grid min-h-0 flex-1 gap-3 p-4"
        style={{
          gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${gridRows}, minmax(0, 1fr))`,
        }}
      >
        {panes.map((pane) => (
          <TerminalPane
            key={pane.num}
            pane={pane}
            card={cards.find((c) => c.id === pane.cardId)}
            onExit={onExit}
            onTurnDone={onTurnDone}
            onManualClose={onManualClose}
            onMoveCard={onMoveCard}
          />
        ))}
      </div>
    </div>
  );
}
