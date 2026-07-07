import { useState } from "react";
import { COLORS, accentDim } from "@/lib/theme";
import { initRepo, type GitChange } from "@/lib/tauri";
import { useGitStatus } from "@/hooks/useGitStatus";
import { CommitModal } from "./CommitModal";
import { PushModal } from "./PushModal";

const TAG_COLORS: Record<GitChange["tag"], string> = {
  M: "#FFD166",
  A: "#6BCB77",
  D: "#FF4757",
};

interface GitStatusProps {
  workspacePath: string;
}

export function GitStatus({ workspacePath }: GitStatusProps) {
  const { status, loading, refresh } = useGitStatus(workspacePath);
  const [commitOpen, setCommitOpen] = useState(false);
  const [pushOpen, setPushOpen] = useState(false);

  if (loading || !status) {
    return (
      <div
        className="mt-auto border-t px-3 py-3"
        style={{ borderColor: COLORS.borderSubtle, background: COLORS.bgPanel }}
      >
        <span className="font-sans text-[11px]" style={{ color: COLORS.textDim }}>
          {loading ? "Checking git status…" : "Git status unavailable"}
        </span>
      </div>
    );
  }

  if (status.kind === "notARepo") {
    return (
      <div
        className="mt-auto flex flex-col gap-2 border-t px-3 py-3"
        style={{ borderColor: COLORS.borderSubtle, background: COLORS.bgPanel }}
      >
        <span className="font-sans text-[11px]" style={{ color: COLORS.textDim }}>
          This folder isn't a git repo — auto-commit is disabled.
        </span>
        <button
          onClick={async () => {
            await initRepo(workspacePath);
            await refresh();
          }}
          className="self-start rounded-md border px-2.5 py-1 font-sans text-[11px]"
          style={{ color: COLORS.accent, background: accentDim(), borderColor: COLORS.borderDefault }}
        >
          Initialize git repo
        </button>
      </div>
    );
  }

  const { branch, ahead, hasUpstream, changes } = status;
  const canPush = ahead > 0 || !hasUpstream;

  return (
    <div className="mt-auto border-t px-3 pb-3.5 pt-2.5" style={{ borderColor: COLORS.borderSubtle, background: COLORS.bgPanel }}>
      <div className="flex items-center gap-1.5 px-1.5 pb-2.5">
        <span className="font-sans text-[11px]" style={{ color: COLORS.textSecondary }}>
          ⎇
        </span>
        <span
          className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-sans text-xs"
          style={{ color: COLORS.textSoft }}
        >
          {branch}
        </span>
        {ahead > 0 && (
          <span
            className="whitespace-nowrap rounded px-1.5 py-px font-sans text-[10px]"
            style={{ color: COLORS.accent, background: accentDim() }}
          >
            ↑{ahead}
          </span>
        )}
      </div>
      {changes.length === 0 ? (
        <div className="px-1.5 py-[3px] font-sans text-[11px]" style={{ color: COLORS.textDim }}>
          Working tree clean
        </div>
      ) : (
        changes.map((c, i) => (
          <div key={i} className="flex items-center gap-2.5 px-1.5 py-[3px] font-sans text-xs">
            <span className="w-3 flex-none text-center font-semibold" style={{ color: TAG_COLORS[c.tag] }}>
              {c.tag}
            </span>
            <span className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ color: COLORS.textSecondary }}>
              {c.path}
            </span>
          </div>
        ))
      )}
      <div className="mt-2.5 flex gap-1.5 px-1.5">
        <button
          onClick={() => setCommitOpen(true)}
          disabled={changes.length === 0}
          className="flex-1 rounded-md border py-1.5 font-sans text-[11px] font-semibold"
          style={{
            color: changes.length === 0 ? COLORS.textDim : COLORS.textSoft,
            borderColor: COLORS.borderDefault,
            cursor: changes.length === 0 ? "not-allowed" : "pointer",
            opacity: changes.length === 0 ? 0.5 : 1,
          }}
        >
          Commit
        </button>
        {canPush && (
          <button
            onClick={() => setPushOpen(true)}
            className="flex-1 rounded-md border py-1.5 font-sans text-[11px] font-semibold"
            style={{ color: COLORS.accent, background: accentDim(), borderColor: COLORS.borderDefault }}
          >
            Push
          </button>
        )}
      </div>

      <CommitModal
        open={commitOpen}
        workspacePath={workspacePath}
        changes={changes}
        onClose={() => setCommitOpen(false)}
        onCommitted={refresh}
      />
      <PushModal
        open={pushOpen}
        workspacePath={workspacePath}
        branch={branch}
        ahead={ahead}
        onClose={() => setPushOpen(false)}
        onPushed={refresh}
      />
    </div>
  );
}
