import { useEffect, useRef, useState } from "react";
import { COLORS } from "@/lib/theme";
import { PIPELINE_STEP_NAMES, type Card, type ColumnKey } from "@/lib/types";
import type { Pane } from "@/stores/terminal.store";
import { useTerminal } from "@/hooks/useTerminal";
import { PipelineChips } from "@/components/PipelineChips";
import { useToastStore } from "@/stores/toast.store";

interface TerminalPaneProps {
  pane: Pane;
  card: Card | undefined;
  onExit: (card: Card, exitCode: number) => void;
  onManualClose: (card: Card | null, terminalId: string) => void;
  onMoveCard: (cardId: string, status: ColumnKey) => void;
}

function currentStepIndex(card: Card): number {
  const idx = card.pipeline.findIndex((s) => s !== "done");
  return idx < 0 ? card.pipeline.length - 1 : idx;
}

export function TerminalPane({ pane, card, onExit, onManualClose, onMoveCard }: TerminalPaneProps) {
  if (!pane.terminalId) {
    return (
      <div
        className="flex flex-col overflow-hidden rounded-lg border"
        style={{ background: COLORS.bgTermHeader, borderColor: "#332D2A" }}
      >
        <div className="m-2 flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border-[1.5px] border-dashed" style={{ borderColor: "#4A423C" }}>
          <span className="text-[22px]" style={{ color: "#7A6F66" }}>
            ＋
          </span>
          <span className="text-xs" style={{ color: "#8A8078" }}>
            Move a card to In Progress, or open a free terminal
          </span>
          <span className="font-sans text-[10px]" style={{ color: "#7A6F66" }}>
            idle · pane {pane.num}
          </span>
        </div>
      </div>
    );
  }

  const stepIdx = card ? currentStepIndex(card) : -1;
  const stepName = card ? PIPELINE_STEP_NAMES[stepIdx] : null;
  const failed = card ? card.pipeline.includes("failed") : false;
  const done = card ? !failed && card.pipeline.every((s) => s === "done") : false;
  const status = card ? (failed ? "FAILED" : done ? "DONE" : stepName === "Kimi" ? "REVIEW" : "RUNNING") : "SHELL";
  const statusColor = card
    ? failed
      ? "#FF4757"
      : done
        ? "#6BCB77"
        : stepName === "Kimi"
          ? "#FFD166"
          : COLORS.accent
    : COLORS.textSecondary;

  return (
    <TerminalPaneLive
      card={card ?? null}
      pane={pane}
      stepName={stepName}
      status={status}
      statusColor={statusColor}
      onExit={onExit}
      onManualClose={onManualClose}
      onMoveCard={onMoveCard}
    />
  );
}

interface TerminalPaneLiveProps {
  card: Card | null;
  pane: Pane;
  stepName: string | null;
  status: string;
  statusColor: string;
  onExit: (card: Card, exitCode: number) => void;
  onManualClose: (card: Card | null, terminalId: string) => void;
  onMoveCard: (cardId: string, status: ColumnKey) => void;
}

function TerminalPaneLive({ card, pane, stepName, status, statusColor, onExit, onManualClose, onMoveCard }: TerminalPaneLiveProps) {
  const terminalId = pane.terminalId as string;
  const pushToast = useToastStore((s) => s.push);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);
  const { containerRef } = useTerminal({
    terminalId,
    spawn: { cwd: pane.cwd ?? undefined, initialCommand: pane.initialCommand || undefined },
    onExit: (code) => card && onExit(card, code),
    onCommandNotFound: (binary) =>
      pushToast({ kind: "error", message: `The CLI "${binary}" isn't installed or not in PATH.` }),
  });

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border" style={{ borderColor: "#332D2A" }}>
      <div
        className="flex h-[34px] flex-none items-center gap-2.5 border-b px-[11px]"
        style={{ background: COLORS.bgTermHeader, borderColor: "#332D2A" }}
      >
        <span
          className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-sans text-[11.5px]"
          style={{ color: "#E8E2D8" }}
        >
          {card ? card.title : `Terminal · pane ${pane.num}`}
        </span>
        {stepName && (
          <span className="inline-flex items-center gap-1 font-sans text-[10.5px]" style={{ color: statusColor }}>
            <span className="h-[5px] w-[5px] rounded-full" style={{ background: "currentColor" }} />
            {stepName}
          </span>
        )}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => card && setMenuOpen((v) => !v)}
            disabled={!card}
            className="rounded-md px-2 py-[2px] font-sans text-[9.5px] font-semibold tracking-wider"
            style={{
              color: statusColor,
              background: `${statusColor}1c`,
              border: `1px solid ${statusColor}44`,
              cursor: card ? "pointer" : "default",
            }}
          >
            {status}
          </button>
          {menuOpen && card && (
            <div
              className="absolute right-0 top-full z-10 mt-1 w-36 overflow-hidden rounded-md border font-sans text-[11px] shadow-lg"
              style={{ background: COLORS.bgTermHeader, borderColor: "#332D2A" }}
            >
              <button
                onClick={() => {
                  onMoveCard(card.id, "todo");
                  setMenuOpen(false);
                }}
                className="block w-full px-3 py-2 text-left"
                style={{ color: "#E8E2D8" }}
              >
                → Move to To Do
              </button>
              <button
                onClick={() => {
                  onMoveCard(card.id, "done");
                  setMenuOpen(false);
                }}
                className="block w-full border-t px-3 py-2 text-left"
                style={{ color: "#E8E2D8", borderColor: "#332D2A" }}
              >
                → Move to Done
              </button>
            </div>
          )}
        </div>
      </div>

      <div ref={containerRef} className="min-h-0 flex-1 px-2 py-1.5" style={{ background: COLORS.bgTermBody }} />

      <div
        className="flex h-[34px] flex-none items-center gap-1.5 border-t px-[11px]"
        style={{ background: COLORS.bgTermHeader, borderColor: "#332D2A" }}
      >
        {status === "FAILED" && (
          <button
            className="rounded-[5px] border px-2.5 py-[3px] font-sans text-[10.5px] font-semibold"
            style={{ color: "#FF4757", background: "#FF475718", borderColor: "#FF475744" }}
          >
            ↺ Retry
          </button>
        )}
        <div className="flex-1 overflow-hidden">{card && <PipelineChips pipeline={card.pipeline} />}</div>
        <button
          onClick={() => onManualClose(card, terminalId)}
          className="rounded-[5px] border px-2 py-[3px] font-sans text-[10.5px]"
          style={{ color: COLORS.textSecondary, borderColor: COLORS.borderDefault }}
        >
          ✕ Close
        </button>
      </div>
    </div>
  );
}
