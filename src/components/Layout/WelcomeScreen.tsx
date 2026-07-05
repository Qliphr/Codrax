import { COLORS, accentBorder, accentDim } from "@/lib/theme";

interface WelcomeScreenProps {
  onAddWorkspace: () => void;
  onLoadDemo: () => void;
}

export function WelcomeScreen({ onAddWorkspace, onLoadDemo }: WelcomeScreenProps) {
  return (
    <div
      className="flex h-screen w-screen flex-col items-center justify-center gap-7 text-center"
      style={{ background: COLORS.bgApp, color: COLORS.textPrimary }}
    >
      <img
        src="/logo.png"
        alt="Codrax"
        className="h-14 w-14 rounded-2xl"
        style={{ boxShadow: "0 12px 32px rgba(0,0,0,.4)" }}
      />

      <div className="flex flex-col gap-2.5">
        <div className="text-2xl font-semibold tracking-tight">Welcome to Codrax</div>
        <div className="max-w-md text-[13.5px] leading-relaxed" style={{ color: COLORS.textSecondary }}>
          Open a local git repo to start orchestrating AI agents on a Kanban board — Claude, Kimi, one card at a
          time.
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onAddWorkspace}
          className="rounded-md px-5 py-2.5 font-sans text-[13px] font-semibold text-white"
          style={{ background: COLORS.accent, boxShadow: "0 1px 2px rgba(0,0,0,.4)" }}
        >
          ＋ Open a workspace
        </button>
        <button
          onClick={onLoadDemo}
          className="rounded-md border px-5 py-2.5 font-sans text-[13px]"
          style={{ borderColor: accentBorder(), color: COLORS.accent, background: accentDim() }}
        >
          Try with demo data
        </button>
      </div>
    </div>
  );
}
