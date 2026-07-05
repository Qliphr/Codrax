import type { ReactNode } from "react";
import { COLORS } from "@/lib/theme";
import { BellIcon, GearIcon, GridIcon, PanelIcon, WaveformIcon } from "@/lib/icons";

interface IconButtonProps {
  children: ReactNode;
  onClick?: () => void;
  badge?: number;
}

function IconButton({ children, onClick, badge }: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      className="relative flex h-8 w-8 items-center justify-center rounded-md border text-[#A39A90] transition-colors hover:bg-[#2C2725] hover:text-[color:var(--color-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{
        borderColor: COLORS.borderSubtle,
        boxShadow: "0 1px 2px rgba(0,0,0,.3)",
        outlineColor: COLORS.accent,
      }}
    >
      {children}
      {badge !== undefined && badge > 0 && (
        <span
          className="absolute -right-1 -top-1 flex h-[15px] min-w-[15px] items-center justify-center rounded-full px-[3px] font-sans text-[9.5px] font-bold text-white"
          style={{ background: "#FF3B78", boxShadow: `0 0 0 2px ${COLORS.bgSurface}` }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

interface ActivityBarProps {
  onToggleNotifs: () => void;
  onOpenSettings: () => void;
  unreadCount: number;
}

export function ActivityBar({ onToggleNotifs, onOpenSettings, unreadCount }: ActivityBarProps) {
  return (
    <>
      <IconButton>
        <GridIcon />
      </IconButton>
      <IconButton onClick={onToggleNotifs} badge={unreadCount}>
        <BellIcon />
      </IconButton>
      <IconButton>
        <WaveformIcon />
      </IconButton>
      <IconButton onClick={onOpenSettings}>
        <GearIcon />
      </IconButton>
      <div className="h-[18px] w-px" style={{ background: "#3A3532" }} />
      <IconButton>
        <PanelIcon />
      </IconButton>
    </>
  );
}
