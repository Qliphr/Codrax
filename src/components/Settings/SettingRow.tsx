import type { ReactNode } from "react";
import { COLORS } from "@/lib/theme";

interface SettingRowProps {
  title: ReactNode;
  description?: string;
  children: ReactNode;
}

export function SettingRow({ title, description, children }: SettingRowProps) {
  return (
    <div
      className="flex items-start justify-between gap-4 rounded-lg border px-3.5 py-3"
      style={{ borderColor: COLORS.borderSubtle, background: COLORS.bgPanel }}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[12.5px] font-medium" style={{ color: COLORS.textSoft }}>
          {title}
        </span>
        {description ? (
          <span className="font-sans text-[10.5px] leading-relaxed" style={{ color: COLORS.textMuted }}>
            {description}
          </span>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center">{children}</div>
    </div>
  );
}
