import { useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useKanbanStore } from "@/stores/kanban.store";
import { useTerminalStore } from "@/stores/terminal.store";
import { PIPELINE_STEP_NAMES, type Card } from "@/lib/types";

const STEP_COMMANDS: Record<(typeof PIPELINE_STEP_NAMES)[number], string> = {
  Claude: 'claude -p "{task}"',
  // -p assumed to mirror Claude's headless one-shot flag — verify against the real Kimi CLI.
  Kimi: 'kimi review -p "{task}"',
  commit: 'git add . && git commit -m "{task}"',
};

const DONE_KEEPALIVE_MS = 30_000;

function currentStepIndex(card: Card): number {
  const idx = card.pipeline.findIndex((s) => s !== "done");
  return idx < 0 ? card.pipeline.length - 1 : idx;
}

/** Orchestrates the agent pipeline: spawning/killing PTYs in step with card lifecycle. */
export function usePipeline() {
  const setCardTerminal = useKanbanStore((s) => s.setCardTerminal);
  const setPipelineStepState = useKanbanStore((s) => s.setPipelineStepState);
  const assignPane = useTerminalStore((s) => s.assignPane);
  const freePane = useTerminalStore((s) => s.freePane);
  const doneTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const killTerminal = useCallback(
    async (terminalId: string) => {
      await invoke("kill_pty", { terminalId }).catch((err) => console.error("kill_pty failed", err));
      freePane(terminalId);
    },
    [freePane],
  );

  const startAgent = useCallback(
    async (card: Card, cwd?: string, stepIdxOverride?: number) => {
      const stepIdx = stepIdxOverride ?? currentStepIndex(card);
      const stepName = PIPELINE_STEP_NAMES[stepIdx];
      const template = STEP_COMMANDS[stepName];
      const terminalId = crypto.randomUUID();

      let command: string;
      try {
        command = await invoke<string>("resolve_pipeline_command", {
          template,
          task: card.title,
          description: card.description,
          prevOutput: null,
        });
      } catch (err) {
        console.error("could not resolve pipeline command", err);
        return;
      }

      // Only assign (and thus mount) the pane once the command is fully resolved —
      // mounting earlier with a placeholder would spawn the shell before we know what to type.
      const paneNum = assignPane(card.id, terminalId, command, cwd ?? null);
      if (paneNum === null) {
        console.warn("no idle terminal pane available");
        return;
      }
      setCardTerminal(card.id, terminalId);
      setPipelineStepState(card.id, stepIdx, "active");
    },
    [assignPane, setCardTerminal, setPipelineStepState],
  );

  const startFreeTerminal = useCallback(
    (cwd?: string) => {
      const terminalId = crypto.randomUUID();
      const paneNum = assignPane(null, terminalId, "", cwd ?? null);
      if (paneNum === null) {
        console.warn("no idle terminal pane available");
      }
      return paneNum;
    },
    [assignPane],
  );

  const stopAgent = useCallback(
    async (card: Card) => {
      if (!card.terminalId) return;
      await killTerminal(card.terminalId);
      setCardTerminal(card.id, null);
    },
    [killTerminal, setCardTerminal],
  );

  const scheduleDoneCleanup = useCallback(
    (card: Card) => {
      if (!card.terminalId) return;
      const terminalId = card.terminalId;
      const timer = setTimeout(() => {
        invoke("kill_pty", { terminalId }).catch(() => {});
        freePane(terminalId);
        setCardTerminal(card.id, null);
        doneTimers.current.delete(card.id);
      }, DONE_KEEPALIVE_MS);
      doneTimers.current.set(card.id, timer);
    },
    [freePane, setCardTerminal],
  );

  const cancelDoneCleanup = useCallback((cardId: string) => {
    const timer = doneTimers.current.get(cardId);
    if (timer) {
      clearTimeout(timer);
      doneTimers.current.delete(cardId);
    }
  }, []);

  const handleAgentExit = useCallback(
    (card: Card, exitCode: number) => {
      setPipelineStepState(card.id, currentStepIndex(card), exitCode === 0 ? "done" : "failed");
    },
    [setPipelineStepState],
  );

  /** Kills the terminal for `stepIdx` and, unless it was the last step, starts the next one. */
  const proceedPastStep = useCallback(
    async (card: Card, stepIdx: number, cwd?: string) => {
      if (card.terminalId) {
        await killTerminal(card.terminalId);
        setCardTerminal(card.id, null);
      }

      const isLastStep = stepIdx === card.pipeline.length - 1;
      if (!isLastStep) {
        const advancedCard: Card = {
          ...card,
          pipeline: card.pipeline.map((s, i) => (i === stepIdx ? "done" : s)),
          terminalId: null,
        };
        await startAgent(advancedCard, cwd);
      }
    },
    [killTerminal, setCardTerminal, startAgent],
  );

  /** Manually finishes the current step regardless of real agent state (escape hatch / retry)
   * and, unless it was the last step, starts the next one. */
  const advance = useCallback(
    async (card: Card, cwd?: string) => {
      if (card.pipeline.every((s) => s === "done")) return;
      const stepIdx = currentStepIndex(card);
      setPipelineStepState(card.id, stepIdx, "done");
      await proceedPastStep(card, stepIdx, cwd);
    },
    [setPipelineStepState, proceedPastStep],
  );

  /** Disabled: stdout sentinel-based turn detection is unreliable (fires before the agent has
   * actually finished — e.g. a headless/print-mode CLI returning fast without completing the
   * task), which was auto-advancing the pipeline while the agent was still working. Per
   * CLAUDE.md roadmap, stdout-based auto-detection is a v2 item — steps now only advance via
   * the manual `advance()` escape hatch. Real process crashes are still caught by
   * `handleAgentExit`. Kept as a no-op (rather than ripping out the sentinel plumbing) so it's
   * a one-line revert if auto-detection is revisited later. */
  const handleTurnDone = useCallback(async (_card: Card, _exitCode: number, _cwd?: string) => {}, []);

  return {
    startAgent,
    startFreeTerminal,
    stopAgent,
    killTerminal,
    scheduleDoneCleanup,
    cancelDoneCleanup,
    handleAgentExit,
    handleTurnDone,
    advance,
  };
}
