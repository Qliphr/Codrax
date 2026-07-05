import { COLORS, accentBorder, accentDim } from "@/lib/theme";
import type { Card, ColumnKey } from "@/lib/types";
import { useTerminalStore } from "@/stores/terminal.store";
import { TerminalPane } from "./TerminalPane";

interface TerminalGridProps {
  cards: Card[];
  onExit: (card: Card, exitCode: number) => void;
  onManualClose: (card: Card | null, terminalId: string) => void;
  onNewTerminal: () => void;
  onMoveCard: (cardId: string, status: ColumnKey) => void;
}

export function TerminalGrid({ cards, onExit, onManualClose, onNewTerminal, onMoveCard }: TerminalGridProps) {
  const panes = useTerminalStore((s) => s.panes);
  const runningCount = panes.filter((p) => p.terminalId !== null).length;
  const hasIdlePane = panes.some((p) => p.terminalId === null);

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

      <div className="grid min-h-0 flex-1 grid-cols-3 grid-rows-2 gap-3 p-4">
        {panes.map((pane) => (
          <TerminalPane
            key={pane.num}
            pane={pane}
            card={cards.find((c) => c.id === pane.cardId)}
            onExit={onExit}
            onManualClose={onManualClose}
            onMoveCard={onMoveCard}
          />
        ))}
      </div>
    </div>
  );
}
