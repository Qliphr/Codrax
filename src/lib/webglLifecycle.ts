import type { Terminal } from "@xterm/xterm";
import { WebglAddon } from "@xterm/addon-webgl";

const RECOVERY_DELAY_MS = 250;

/**
 * Attaches xterm's WebGL renderer with context-loss recovery. GL contexts can
 * be lost silently (GPU reset, sleep/wake, WKWebView memory pressure under a
 * grid of several live panes) — without a retry loop the pane renders nothing
 * from that point on. Ported from Terax's rendererPool.ts (attachWebgl /
 * disposeSlotWebgl / releaseCanvasContext), trimmed to a single term instead
 * of a shared slot pool.
 *
 * Returns a disposer that also force-releases the GL context via
 * `WEBGL_lose_context` so the WebView reclaims it immediately instead of
 * waiting on GC — cheap insurance against hitting the context ceiling over a
 * long session of opening/closing panes.
 */
export function attachWebgl(term: Terminal): () => void {
  let addon: WebglAddon | null = null;
  let canvases: HTMLCanvasElement[] = [];
  let recoveryTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  function attach() {
    if (disposed || addon || !term.element) return;
    const before = new Set(term.element.querySelectorAll<HTMLCanvasElement>("canvas"));
    try {
      const webgl = new WebglAddon();
      webgl.onContextLoss(() => {
        if (addon === webgl) {
          addon = null;
          canvases = [];
        }
        try {
          webgl.dispose();
        } catch {
          // already torn down by the context loss itself
        }
        recoveryTimer = setTimeout(() => {
          recoveryTimer = null;
          attach();
          if (addon) {
            try {
              term.refresh(0, term.rows - 1);
            } catch {
              // term/element not ready — next write will repaint anyway
            }
          }
        }, RECOVERY_DELAY_MS);
      });
      term.loadAddon(webgl);
      const after = term.element.querySelectorAll<HTMLCanvasElement>("canvas");
      canvases = [...after].filter((c) => !before.has(c));
      addon = webgl;
    } catch {
      // WebGL unavailable (software rendering, context creation failure) — canvas fallback.
    }
  }

  attach();

  return () => {
    disposed = true;
    if (recoveryTimer !== null) clearTimeout(recoveryTimer);
    if (!addon) return;
    for (const canvas of canvases) releaseCanvasContext(canvas);
    try {
      addon.dispose();
    } catch {
      // term may already be disposed
    }
    addon = null;
    canvases = [];
  };
}

function releaseCanvasContext(canvas: HTMLCanvasElement): void {
  let gl: WebGL2RenderingContext | WebGLRenderingContext | null = null;
  try {
    gl = canvas.getContext("webgl2") as WebGL2RenderingContext | null;
  } catch {
    // ignore
  }
  if (!gl) {
    try {
      gl = canvas.getContext("webgl") as WebGLRenderingContext | null;
    } catch {
      // ignore
    }
  }
  if (gl) {
    try {
      const ext = gl.getExtension("WEBGL_lose_context");
      if (ext && !gl.isContextLost()) ext.loseContext();
    } catch {
      // ignore
    }
  }
  try {
    canvas.width = 0;
    canvas.height = 0;
  } catch {
    // ignore
  }
}
