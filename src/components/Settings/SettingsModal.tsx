import { useEffect, useState } from "react";
import { COLORS, accentBorder, accentDim } from "@/lib/theme";
import { useProviderStore } from "@/stores/provider.store";
import { usePresence } from "@/hooks/usePresence";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { hydrate, loading, addCustom, rows } = useProviderStore();
  const [name, setName] = useState("");
  const [cli, setCli] = useState("");
  const { mounted, state } = usePresence(open, 160);

  useEffect(() => {
    if (open) void hydrate();
  }, [open, hydrate]);

  if (!mounted) return null;

  const providerRows = rows();
  const disabled = name.trim().length === 0 || cli.trim().length === 0;

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
        className="vos-modal flex max-h-[82vh] w-[640px] flex-col overflow-hidden rounded-lg border"
        style={{ background: COLORS.bgSurface, borderColor: COLORS.borderDefault, boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }}
      >
        <div className="flex h-[52px] flex-none items-center gap-2.5 border-b px-5" style={{ borderColor: COLORS.borderSubtle }}>
          <span className="text-[15px] font-semibold">Provider Registry</span>
          <span className="font-sans text-[11px]" style={{ color: COLORS.textMuted }}>
            {loading ? "detecting…" : "detected AI CLIs"}
          </span>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md border text-sm"
            style={{ borderColor: COLORS.borderDefault, color: COLORS.textSecondary }}
          >
            ✕
          </button>
        </div>

        <div
          className="grid grid-cols-[1.4fr_1fr_1.1fr] border-b px-5 py-[11px] font-sans text-[10px] uppercase tracking-wider"
          style={{ borderColor: COLORS.borderSubtle, color: COLORS.textMuted }}
        >
          <span>Provider</span>
          <span>CLI</span>
          <span>Status</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {providerRows.map((p) => (
            <div
              key={p.cli}
              className="grid grid-cols-[1.4fr_1fr_1.1fr] items-center border-b px-5 py-3"
              style={{ borderColor: COLORS.bgApp }}
            >
              <span className="text-[13.5px] font-medium">{p.name}</span>
              <span className="font-sans text-[12.5px]" style={{ color: COLORS.textSecondary }}>
                {p.cli}
              </span>
              <span
                className="inline-flex items-center gap-1.5 font-sans text-[11px]"
                style={{ color: p.detected ? "#6BCB77" : COLORS.textMuted }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "currentColor" }} />
                {p.detected ? "Detected" : "Missing"}
              </span>
            </div>
          ))}
        </div>

        <div className="flex flex-none items-center gap-2 p-5">
          <input
            className="vos-input flex-1"
            placeholder="Provider name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input className="vos-input flex-1" placeholder="command" value={cli} onChange={(e) => setCli(e.target.value)} />
          <button
            disabled={disabled}
            onClick={async () => {
              await addCustom(name.trim(), cli.trim());
              setName("");
              setCli("");
            }}
            className="rounded-md border px-3 py-2 font-sans text-[12.5px]"
            style={{
              color: disabled ? COLORS.textDim : COLORS.accent,
              background: disabled ? "transparent" : accentDim(),
              borderColor: disabled ? COLORS.borderDefault : accentBorder(),
              cursor: disabled ? "not-allowed" : "pointer",
            }}
          >
            ＋ Add
          </button>
        </div>
      </div>
    </div>
  );
}
