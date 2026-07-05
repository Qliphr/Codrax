import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import "@xterm/xterm/css/xterm.css";
import { COLORS } from "@/lib/theme";
import { extractBinaryName, isCommandNotFoundOutput } from "@/lib/shell";

export interface SpawnConfig {
  cwd?: string;
  /** Sent to the shell right after spawn, e.g. the sanitized `claude "..."` invocation. */
  initialCommand?: string;
}

interface UseTerminalOptions {
  terminalId: string;
  spawn?: SpawnConfig;
  onExit?: (code: number) => void;
  onCommandNotFound?: (binary: string) => void;
}

export function useTerminal({ terminalId, spawn, onExit, onCommandNotFound }: UseTerminalOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;
  const onCommandNotFoundRef = useRef(onCommandNotFound);
  onCommandNotFoundRef.current = onCommandNotFound;

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
    try {
      term.loadAddon(new WebglAddon());
    } catch {
      // WebGL unavailable (e.g. software rendering) — xterm falls back to the canvas renderer.
    }
    term.open(container);
    fitAddon.fit();

    let disposed = false;
    const unlistenFns: UnlistenFn[] = [];

    async function setup() {
      let notFoundChecked = false;
      const unlistenOutput = await listen<string>(`pty://output/${terminalId}`, (event) => {
        term.write(event.payload);
        if (!notFoundChecked) {
          notFoundChecked = true;
          if (spawn?.initialCommand && isCommandNotFoundOutput(event.payload)) {
            onCommandNotFoundRef.current?.(extractBinaryName(spawn.initialCommand));
          }
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
          await invoke("spawn_pty", { terminalId, cwd: spawn.cwd });
          if (spawn.initialCommand) {
            await invoke("write_pty", { terminalId, data: `${spawn.initialCommand}\n` });
          }
        } catch (err) {
          term.write(`\r\n\x1b[31mfailed to start terminal: ${String(err)}\x1b[0m\r\n`);
        }
      }
    }
    void setup();

    const dataDisposable = term.onData((data) => {
      invoke("write_pty", { terminalId, data }).catch((err) => console.error("write_pty failed", err));
    });
    const resizeDisposable = term.onResize(({ cols, rows }) => {
      invoke("resize_pty", { terminalId, cols, rows }).catch((err) => console.error("resize_pty failed", err));
    });
    const resizeObserver = new ResizeObserver(() => fitAddon.fit());
    resizeObserver.observe(container);

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      dataDisposable.dispose();
      resizeDisposable.dispose();
      unlistenFns.forEach((unlisten) => unlisten());
      term.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terminalId]);

  return { containerRef };
}
