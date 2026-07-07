import { COLORS } from "@/lib/theme";
import { SettingRow } from "@/components/Settings/SettingRow";

export function AboutSection() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="Codrax" className="h-11 w-11 rounded-lg" />
        <div>
          <div className="text-[15px] font-semibold">Codrax</div>
          <div className="font-sans text-[12px]" style={{ color: COLORS.textMuted }}>
            Version 0.1.0
          </div>
        </div>
      </div>

      <p className="font-sans text-[12.5px] leading-relaxed" style={{ color: COLORS.textSecondary }}>
        Orchestration cockpit for vibe coders — a Kanban board that launches AI agents (Claude Code, Codex, Kimi…)
        in native terminals and auto-commits when a task is done.
      </p>

      <div className="flex flex-col gap-2">
        <SettingRow title="Repository">
          <span className="font-sans text-[12px]" style={{ color: COLORS.textSecondary }}>
            github.com/Qliphr/Codrax
          </span>
        </SettingRow>
        <SettingRow title="License">
          <span className="font-sans text-[12px]" style={{ color: COLORS.textSecondary }}>
            FSL (fair source)
          </span>
        </SettingRow>
        <SettingRow title="Stack">
          <span className="font-sans text-[12px]" style={{ color: COLORS.textSecondary }}>
            Tauri 2 · React 19 · Rust
          </span>
        </SettingRow>
      </div>
    </div>
  );
}
