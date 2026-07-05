import { useEffect, useState } from "react";
import { COLORS, accentDim } from "@/lib/theme";
import { usePresence } from "@/hooks/usePresence";
import { gitPush } from "@/lib/tauri";
import { useToastStore } from "@/stores/toast.store";

interface PushModalProps {
  open: boolean;
  workspacePath: string;
  branch: string;
  ahead: number;
  onClose: () => void;
  onPushed: () => void;
}

export function PushModal({ open, workspacePath, branch, ahead, onClose, onPushed }: PushModalProps) {
  const [pushing, setPushing] = useState(false);
  const { mounted, state } = usePresence(open, 160);
  const pushToast = useToastStore((s) => s.push);

  async function handlePush() {
    if (pushing) return;
    setPushing(true);
    try {
      const result = await gitPush(workspacePath);
      if (result.kind === "ok") {
        pushToast({ kind: "info", message: result.message || `Pushed ${branch}.` });
        onPushed();
        onClose();
      } else {
        pushToast({ kind: "error", message: `Push failed: ${result.message}` });
      }
    } catch (err) {
      pushToast({ kind: "error", message: `Push failed: ${String(err)}` });
    } finally {
      setPushing(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter") void handlePush();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, pushing]);

  if (!mounted) return null;

  return (
    <div
      onClick={onClose}
      data-state={state}
      className="vos-overlay fixed inset-0 z-50 flex items-center justify-center p-10"
      style={{ background: "rgba(6,7,9,0.65)", backdropFilter: "blur(3px)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        data-state={state}
        className="vos-modal flex w-[420px] flex-col overflow-hidden rounded-lg border"
        style={{ background: COLORS.bgSurface, borderColor: COLORS.borderDefault, boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }}
      >
        <div
          className="flex h-[52px] flex-none items-center gap-2.5 border-b px-5"
          style={{ borderColor: COLORS.borderSubtle }}
        >
          <span className="text-[15px] font-semibold">Push to origin</span>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md border text-sm"
            style={{ borderColor: COLORS.borderDefault, color: COLORS.textSecondary }}
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-2 p-5">
          <span className="font-sans text-[13px]" style={{ color: COLORS.textSecondary }}>
            Push <span style={{ color: COLORS.accent }}>{branch}</span>
            {ahead > 0 ? ` — ${ahead} commit${ahead === 1 ? "" : "s"} ahead` : ""} to <code>origin</code>?
          </span>
          {ahead === 0 && (
            <span className="rounded-md px-2 py-1.5 font-sans text-[11px]" style={{ color: COLORS.textDim, background: accentDim() }}>
              No tracked ahead-count for this branch (no upstream, or clean) — git will report if there's nothing to push.
            </span>
          )}
        </div>

        <div className="flex-none border-t p-4" style={{ borderColor: COLORS.borderSubtle }}>
          <button
            onClick={handlePush}
            disabled={pushing}
            className="w-full rounded-md py-2.5 font-sans text-[13px] font-semibold text-white"
            style={{
              background: pushing ? COLORS.borderDefault : COLORS.accent,
              cursor: pushing ? "not-allowed" : "pointer",
              opacity: pushing ? 0.6 : 1,
            }}
          >
            {pushing ? "Pushing…" : "Push"}
          </button>
        </div>
      </div>
    </div>
  );
}
