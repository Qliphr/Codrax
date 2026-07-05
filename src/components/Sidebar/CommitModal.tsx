import { useEffect, useState } from "react";
import { COLORS } from "@/lib/theme";
import { usePresence } from "@/hooks/usePresence";
import { autoCommit, type GitChange } from "@/lib/tauri";
import { useToastStore } from "@/stores/toast.store";

interface CommitModalProps {
  open: boolean;
  workspacePath: string;
  changes: GitChange[];
  onClose: () => void;
  onCommitted: () => void;
}

export function CommitModal({ open, workspacePath, changes, onClose, onCommitted }: CommitModalProps) {
  const [message, setMessage] = useState("");
  const [committing, setCommitting] = useState(false);
  const { mounted, state } = usePresence(open, 160);
  const pushToast = useToastStore((s) => s.push);

  const messageEmpty = message.trim().length === 0;

  useEffect(() => {
    if (open) setMessage("");
  }, [open]);

  async function handleCommit() {
    if (messageEmpty || committing) return;
    setCommitting(true);
    try {
      const result = await autoCommit(workspacePath, message.trim());
      if (result.kind === "nothingToCommit") {
        pushToast({ kind: "info", message: "Nothing to commit." });
      } else if (result.kind === "committed") {
        pushToast({ kind: "info", message: `Committed ${result.oid.slice(0, 7)}.` });
        onCommitted();
        onClose();
      } else {
        pushToast({ kind: "error", message: `Commit failed: ${result.message}` });
      }
    } catch (err) {
      pushToast({ kind: "error", message: `Commit failed: ${String(err)}` });
    } finally {
      setCommitting(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !messageEmpty) void handleCommit();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, messageEmpty, message]);

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
        className="vos-modal flex w-[460px] flex-col overflow-hidden rounded-lg border"
        style={{ background: COLORS.bgSurface, borderColor: COLORS.borderDefault, boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }}
      >
        <div
          className="flex h-[52px] flex-none items-center gap-2.5 border-b px-5"
          style={{ borderColor: COLORS.borderSubtle }}
        >
          <span className="text-[15px] font-semibold">Commit changes</span>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md border text-sm"
            style={{ borderColor: COLORS.borderDefault, color: COLORS.textSecondary }}
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-[10px] uppercase tracking-wider" style={{ color: COLORS.textMuted }}>
              Message
            </label>
            <textarea
              className="vos-input resize-none"
              rows={3}
              placeholder="e.g. feat: add dark mode"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-sans text-[10px] uppercase tracking-wider" style={{ color: COLORS.textMuted }}>
              {changes.length} change{changes.length === 1 ? "" : "s"}
            </label>
            <div className="flex max-h-32 flex-col gap-0.5 overflow-y-auto">
              {changes.map((c, i) => (
                <div key={i} className="flex items-center gap-2.5 px-1 py-[3px] font-sans text-xs">
                  <span className="w-3 flex-none text-center font-semibold" style={{ color: COLORS.textMuted }}>
                    {c.tag}
                  </span>
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ color: COLORS.textSecondary }}>
                    {c.path}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-none border-t p-4" style={{ borderColor: COLORS.borderSubtle }}>
          <button
            onClick={handleCommit}
            disabled={messageEmpty || committing}
            className="w-full rounded-md py-2.5 font-sans text-[13px] font-semibold text-white"
            style={{
              background: messageEmpty || committing ? COLORS.borderDefault : COLORS.accent,
              cursor: messageEmpty || committing ? "not-allowed" : "pointer",
              opacity: messageEmpty || committing ? 0.6 : 1,
            }}
          >
            {committing ? "Committing…" : "Commit"}
          </button>
        </div>
      </div>
    </div>
  );
}
