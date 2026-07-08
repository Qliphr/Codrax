import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import "@xterm/xterm/css/xterm.css";
import { COLORS } from "@/lib/theme";
import { extractBinaryName, extractTurnDoneCode, isCommandNotFoundOutput } from "@/lib/shell";
import { attachWebgl } from "@/lib/webglLifecycle";

const FIT_DEBOUNCE_MS = 8;
const PTY_RESIZE_DEBOUNCE_MS = 120;

export interface SpawnConfig {
  cwd?: string;
  /** Sent to the shell right after spawn, e.g. the sanitized `claude "..."` invocation. */
  initialCommand?: string;
  /** Shell binary override from Settings, e.g. "/bin/zsh" or "powershell.exe". Empty/unset → backend default. */
  shell?: string;
}

interface UseTerminalOptions {
  terminalId: string;
  spawn?: SpawnConfig;
  onExit?: (code: number) => void;
  onCommandNotFound?: (binary: string) => void;
  /** Fires once when the pipeline turn-completion sentinel is seen in stdout (see `extractTurnDoneCode`). */
  onTurnDone?: (exitCode: number) => void;
}

export function useTerminal({ terminalId, spawn, onExit, onCommandNotFound, onTurnDone }: UseTerminalOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;
  const onCommandNotFoundRef = useRef(onCommandNotFound);
  onCommandNotFoundRef.current = onCommandNotFound;
  const onTurnDoneRef = useRef(onTurnDone);
  onTurnDoneRef.current = onTurnDone;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const term = new Terminal({
      fontFamily: "'Geist Mono', ui-monospace, monospace",
      fontSize: 12,
      scrollback: 10000,
      theme: {
        background: COLORS.bgTermBody,
        foreground: COLORS.textBody,
        cursor: COLORS.accent,
      },
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    const disposeWebgl = attachWebgl(term);
    let disposed = false;
    const unlistenFns: UnlistenFn[] = [];

    term.open(container);
    fitAddon.fit();
    // Geist Mono is self-hosted and loads async — the first fit() above measures
    // cells against the fallback font. Re-fit once the real font swaps in, or the
    // grid stays permanently misaligned (glyphs overlapping/misspaced).
    void document.fonts.ready.then(() => {
      if (disposed) return;
      fitAddon.fit();
    });

    async function setup() {
      let notFoundChecked = false;
      let turnDoneFired = false;
      let prevChunkTail = "";
      const unlistenOutput = await listen<string>(`pty://output/${terminalId}`, (event) => {
        term.write(event.payload);
        if (!notFoundChecked) {
          notFoundChecked = true;
          if (spawn?.initialCommand && isCommandNotFoundOutput(event.payload)) {
            onCommandNotFoundRef.current?.(extractBinaryName(spawn.initialCommand));
          }
        }
        if (!turnDoneFired && spawn?.initialCommand) {
          const code = extractTurnDoneCode(prevChunkTail + event.payload);
          if (code !== null) {
            turnDoneFired = true;
            onTurnDoneRef.current?.(code);
          }
          prevChunkTail = event.payload.slice(-40);
        }
      });
      const unlistenExit = await listen<number>(`pty://exit/${terminalId}`, (event) => {
        onExitRef.current?.(event.payload);
      });
      if (disposed) {
        unlistenOutput();
        unlistenExit();
        return;
      }
      unlistenFns.push(unlistenOutput, unlistenExit);

      if (spawn) {
        try {
          await invoke("spawn_pty", { terminalId, cwd: spawn.cwd, shell: spawn.shell });
          if (spawn.initialCommand) {
            await invoke("write_pty", { terminalId, data: `${spawn.initialCommand}\n` });
          }
        } catch (err) {
          const message = String(err);
          // The PTY survives navigation away from the Terminals page (it's killed only on
          // manual close / Done timeout / app exit) — remounting must reattach, not respawn.
          if (!message.includes("already exists")) {
            term.write(`\r\n\x1b[31mfailed to start terminal: ${message}\x1b[0m\r\n`);
          }
        }
      }
    }
    void setup();

    const dataDisposable = term.onData((data) => {
      invoke("write_pty", { terminalId, data }).catch((err) => console.error("write_pty failed", err));
    });

    let ptyResizeTimer: ReturnType<typeof setTimeout> | null = null;
    const resizeDisposable = term.onResize(({ cols, rows }) => {
      if (ptyResizeTimer) clearTimeout(ptyResizeTimer);
      // Decoupled from fit() on purpose: a CLI TUI does a full repaint on SIGWINCH,
      // so spamming resize_pty on every intermediate cell during a drag is wasteful.
      ptyResizeTimer = setTimeout(() => {
        ptyResizeTimer = null;
        invoke("resize_pty", { terminalId, cols, rows }).catch((err) => console.error("resize_pty failed", err));
      }, PTY_RESIZE_DEBOUNCE_MS);
    });

    let fitTimer: ReturnType<typeof setTimeout> | null = null;
    const resizeObserver = new ResizeObserver(() => {
      if (fitTimer) clearTimeout(fitTimer);
      fitTimer = setTimeout(() => {
        fitTimer = null;
        fitAddon.fit();
      }, FIT_DEBOUNCE_MS);
    });
    resizeObserver.observe(container);

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      if (fitTimer) clearTimeout(fitTimer);
      if (ptyResizeTimer) clearTimeout(ptyResizeTimer);
      dataDisposable.dispose();
      resizeDisposable.dispose();
      unlistenFns.forEach((unlisten) => unlisten());
      disposeWebgl();
      term.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terminalId]);

  return { containerRef };
}
