import type { PipelineStepState } from "./types";

export const COLORS = {
  bgApp: "#191716",
  bgSidebar: "#201C1B",
  bgSurface: "#242020",
  bgPanel: "#1D1918",
  bgTermHeader: "#141110",
  bgTermBody: "#0D0B0A",
  borderSubtle: "#34302E",
  borderDefault: "#3D3733",
  borderStrong: "#3A3532",
  textPrimary: "#F3EEE7",
  textSoft: "#DAD2C8",
  textBody: "#C7BEB3",
  textSecondary: "#A39A90",
  textMuted: "#948B81",
  textDim: "#746A62",
  textFaint: "#8A8078",
  accent: "#D97757",
  accentAlt1: "#BD5D3A",
  accentAlt2: "#C97650",
} as const;

export const PRIORITY_COLORS = {
  critical: "#FF4757",
  high: "#FF8C42",
  medium: "#FFD166",
  low: "#6BCB77",
} as const;

export const TERMINAL_LINE_COLORS = {
  prompt: COLORS.accent,
  done: "#6BCB77",
  run: "#FFD166",
  info: COLORS.textFaint,
  error: "#FF4757",
} as const;

export const TERMINAL_LINE_PREFIXES = {
  prompt: "$ ",
  done: "✓ ",
  run: "→ ",
  info: "  ",
  error: "✕ ",
} as const;

/** Appends a 2-digit hex alpha suffix to a `#rrggbb` color, e.g. withAlpha('#D97757','18') -> '#D9775718'. */
export function withAlpha(hex: string, alphaHex: string): string {
  return `${hex}${alphaHex}`;
}

export function accentDim(accent: string = COLORS.accent): string {
  return withAlpha(accent, "18");
}

export function accentBorder(accent: string = COLORS.accent): string {
  return withAlpha(accent, "40");
}

export function accentGlow(accent: string = COLORS.accent): string {
  return withAlpha(accent, "99");
}

export interface PipelineChipVisual {
  icon: string;
  color: string;
  background: string;
  border: string;
  glow?: string;
}

export function pipelineChipVisual(state: PipelineStepState, accent: string = COLORS.accent): PipelineChipVisual {
  switch (state) {
    case "done":
      return { icon: "✓", color: COLORS.textSecondary, background: "#332D2A", border: COLORS.borderStrong };
    case "active":
      return {
        icon: "●",
        color: accent,
        background: withAlpha(accent, "1f"),
        border: withAlpha(accent, "88"),
        glow: `0 0 10px ${withAlpha(accent, "55")}`,
      };
    case "failed":
      return { icon: "✕", color: "#FF4757", background: "#FF475718", border: "#FF475766" };
    case "idle":
    default:
      return { icon: "—", color: COLORS.textMuted, background: "transparent", border: COLORS.borderStrong };
  }
}
