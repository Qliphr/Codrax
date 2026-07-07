import { COLORS, accentDim } from "@/lib/theme";
import { useGitLog } from "@/hooks/useGitLog";
import type { GitCommit } from "@/lib/tauri";

const ROW_HEIGHT = 22;
const LANE_WIDTH = 14;
const LANE_COLORS = [COLORS.accent, COLORS.accentAlt1, "#6BCB77", "#FFD166", "#4FA8E0", COLORS.accentAlt2];
const LOCAL_COLOR = "#4FA8E0";

function laneColor(lane: number): string {
  return LANE_COLORS[lane % LANE_COLORS.length];
}

function relativeTime(unixSeconds: number): string {
  const diff = Date.now() / 1000 - unixSeconds;
  const units: [number, string][] = [
    [60, "s"],
    [60, "m"],
    [24, "h"],
    [7, "d"],
    [4.345, "w"],
    [12, "mo"],
    [Infinity, "y"],
  ];
  let value = diff;
  for (const [size, label] of units) {
    if (value < size) return `${Math.max(1, Math.floor(value))}${label}`;
    value /= size;
  }
  return `${Math.floor(value)}y`;
}

interface GitGraphProps {
  workspacePath: string;
}

export function GitGraph({ workspacePath }: GitGraphProps) {
  const { log, loading } = useGitLog(workspacePath);

  if (loading || !log || log.kind === "notARepo") return null;

  const { commits } = log;
  if (commits.length === 0) return null;

  const rowIndexByOid = new Map(commits.map((c, i) => [c.oid, i]));
  const maxLane = commits.reduce((max, c) => Math.max(max, c.lane), 0);
  const graphWidth = (maxLane + 1) * LANE_WIDTH;
  const graphHeight = commits.length * ROW_HEIGHT;

  const edges: { x1: number; y1: number; x2: number; y2: number; color: string; dashed: boolean }[] = [];
  commits.forEach((commit, i) => {
    const cx = commit.lane * LANE_WIDTH + LANE_WIDTH / 2;
    const cy = i * ROW_HEIGHT + ROW_HEIGHT / 2;
    for (const parentOid of commit.parents) {
      const j = rowIndexByOid.get(parentOid);
      if (j === undefined) continue; // parent beyond fetched history window
      const parent = commits[j];
      const px = parent.lane * LANE_WIDTH + LANE_WIDTH / 2;
      const py = j * ROW_HEIGHT + ROW_HEIGHT / 2;
      // Edge is dashed where it links two not-yet-pushed commits — a "local only" segment.
      const dashed = !commit.pushed && !parent.pushed;
      edges.push({ x1: cx, y1: cy, x2: px, y2: py, color: laneColor(commit.lane), dashed });
    }
  });

  return (
    <div className="border-t px-3 py-2.5" style={{ borderColor: COLORS.borderSubtle }}>
      <div className="flex items-center justify-between px-1.5 pb-2">
        <span className="font-sans text-[10px] uppercase tracking-wider" style={{ color: COLORS.textDim }}>
          History
        </span>
        <span className="flex items-center gap-2.5 font-sans text-[10px]" style={{ color: COLORS.textDim }}>
          <span className="flex items-center gap-1">
            <svg width={8} height={8}>
              <circle cx={4} cy={4} r={3.5} fill={COLORS.accent} />
            </svg>
            pushed
          </span>
          <span className="flex items-center gap-1">
            <svg width={8} height={8}>
              <circle cx={4} cy={4} r={3.5} fill={COLORS.bgSidebar} stroke={LOCAL_COLOR} strokeWidth={1.5} />
            </svg>
            local
          </span>
        </span>
      </div>
      <div>
        <div className="relative" style={{ height: graphHeight, width: "100%" }}>
          <svg
            className="pointer-events-none absolute left-0 top-0"
            width={graphWidth}
            height={graphHeight}
          >
            {edges.map((e, i) => {
              const half = ROW_HEIGHT / 2;
              const path =
                e.x1 === e.x2
                  ? `M${e.x1},${e.y1} L${e.x2},${e.y2}`
                  : `M${e.x1},${e.y1} L${e.x1},${e.y1 + half} L${e.x2},${e.y2 - half} L${e.x2},${e.y2}`;
              return (
                <path
                  key={i}
                  d={path}
                  stroke={e.color}
                  strokeWidth={1.5}
                  strokeDasharray={e.dashed ? "3,3" : undefined}
                  fill="none"
                  opacity={0.85}
                />
              );
            })}
            {commits.map((c, i) => (
              <circle
                key={c.oid}
                cx={c.lane * LANE_WIDTH + LANE_WIDTH / 2}
                cy={i * ROW_HEIGHT + ROW_HEIGHT / 2}
                r={3.5}
                fill={c.pushed ? laneColor(c.lane) : COLORS.bgSidebar}
                stroke={c.pushed ? laneColor(c.lane) : LOCAL_COLOR}
                strokeWidth={c.pushed ? 0 : 1.5}
              />
            ))}
          </svg>
          {commits.map((c) => (
            <CommitRow key={c.oid} commit={c} graphWidth={graphWidth} />
          ))}
        </div>
      </div>
    </div>
  );
}

function CommitRow({ commit, graphWidth }: { commit: GitCommit; graphWidth: number }) {
  return (
    <div
      className="relative flex items-center gap-2 pr-1.5 font-sans text-xs"
      style={{ height: ROW_HEIGHT, paddingLeft: graphWidth + 6 }}
      title={`${commit.summary}\n${commit.author} · ${commit.shortOid}${commit.pushed ? "" : " · not pushed"}`}
    >
      <span className="flex-none font-mono text-[10px]" style={{ color: COLORS.textDim }}>
        {commit.shortOid}
      </span>
      <span className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ color: COLORS.textSecondary }}>
        {commit.summary}
      </span>
      {!commit.pushed && (
        <span
          className="flex-none rounded px-1 py-px font-sans text-[9px] font-semibold uppercase tracking-wider"
          style={{ color: COLORS.accent, background: accentDim() }}
        >
          local
        </span>
      )}
      <span className="ml-auto flex-none text-[10px]" style={{ color: COLORS.textDim }}>
        {relativeTime(commit.timestamp)}
      </span>
    </div>
  );
}
