import { useEffect, useState } from "react";
import { COLORS, accentBorder, accentDim } from "@/lib/theme";
import { useProviderStore } from "@/stores/provider.store";

export function ProvidersSection() {
  const { hydrate, loading, addCustom, rows } = useProviderStore();
  const [name, setName] = useState("");
  const [cli, setCli] = useState("");

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const providerRows = rows();
  const disabled = name.trim().length === 0 || cli.trim().length === 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h3 className="font-sans text-[11px] uppercase tracking-wider" style={{ color: COLORS.textMuted }}>
          Detected AI CLIs
        </h3>
        {loading ? (
          <span className="font-sans text-[10.5px]" style={{ color: COLORS.textDim }}>
            detecting…
          </span>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-lg border" style={{ borderColor: COLORS.borderSubtle }}>
        <div
          className="grid grid-cols-[1.4fr_1fr_1.1fr] border-b px-3.5 py-2 font-sans text-[10px] uppercase tracking-wider"
          style={{ borderColor: COLORS.borderSubtle, color: COLORS.textMuted, background: COLORS.bgPanel }}
        >
          <span>Provider</span>
          <span>CLI</span>
          <span>Status</span>
        </div>

        {providerRows.map((p) => (
          <div
            key={p.cli}
            className="grid grid-cols-[1.4fr_1fr_1.1fr] items-center border-b px-3.5 py-2.5 last:border-b-0"
            style={{ borderColor: COLORS.borderSubtle }}
          >
            <span className="text-[13px] font-medium">{p.name}</span>
            <span className="font-sans text-[12px]" style={{ color: COLORS.textSecondary }}>
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

      <div className="flex items-center gap-2">
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
  );
}
