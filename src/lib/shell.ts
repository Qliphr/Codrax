const NOT_FOUND_PATTERNS = [
  /command not found/i,
  /is not recognized as (the name of )?a cmdlet/i,
  /no such file or directory/i,
];

/** Whether a chunk of shell output looks like a "binary not found" error. */
export function isCommandNotFoundOutput(text: string): boolean {
  return NOT_FOUND_PATTERNS.some((re) => re.test(text));
}

/** Pulls the executable name out of a shell command line, e.g. `claude "fix bug"` -> "claude". */
export function extractBinaryName(command: string): string {
  const trimmed = command.trim();
  const match = trimmed.match(/^"([^"]+)"|^'([^']+)'|^(\S+)/);
  const raw = (match?.[1] ?? match?.[2] ?? match?.[3] ?? trimmed).trim();
  return raw.split(/[\\/]/).pop() || raw;
}

const TURN_DONE_RE = /@@CDRX_DONE:(-?\d+)@@/;

/** Extracts the exit code from the pipeline's turn-completion sentinel (see `append_turn_sentinel` in pipeline.rs), if present in this chunk. */
export function extractTurnDoneCode(text: string): number | null {
  const match = TURN_DONE_RE.exec(text);
  return match ? Number(match[1]) : null;
}
