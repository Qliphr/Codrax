import { useState } from "react";
import { COLORS, accentDim, accentGlow } from "@/lib/theme";
import { ResetIcon } from "@/lib/icons";
import { ActivityBar } from "./ActivityBar";
import type { Workspace } from "@/lib/types";

export interface Notification {
  id: string;
  text: string;
  time: string;
  unread: boolean;
  color: string;
}

interface TopBarProps {
  workspace: Workspace;
  workspaces: Workspace[];
  workspaceCounts: Record<string, number>;
  missingWorkspaceIds: Set<string>;
  onSelectWorkspace: (id: string) => void;
  onAddWorkspace: () => void;
  onRelocateWorkspace: (id: string) => void;
  onRemoveWorkspace: (id: string) => void;
  activeCount: number;
  notifs: Notification[];
  notifsOpen: boolean;
  onToggleNotifs: () => void;
  onCloseNotifs: () => void;
  onClearNotifs: () => void;
  onOpenSettings: () => void;
  onReset: () => void;
}

export function TopBar({
  workspace,
  workspaces,
  workspaceCounts,
  missingWorkspaceIds,
  onSelectWorkspace,
  onAddWorkspace,
  onRelocateWorkspace,
  onRemoveWorkspace,
  activeCount,
  notifs,
  notifsOpen,
  onToggleNotifs,
  onCloseNotifs,
  onClearNotifs,
  onOpenSettings,
  onReset,
}: TopBarProps) {
  const unreadCount = notifs.filter((n) => n.unread).length;
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const isMac = typeof navigator !== "undefined" && /mac/i.test(navigator.platform);

  return (
    <div
      data-tauri-drag-region="deep"
      className="flex h-[46px] flex-none items-center gap-3.5 border-b px-3.5"
      style={{
        borderColor: COLORS.borderSubtle,
        background: COLORS.bgSurface,
        paddingLeft: isMac ? "78px" : undefined,
      }}
    >
      <div className="flex items-center gap-2">
        <img src="/logo.png" alt="Codrax" className="h-[22px] w-[22px] rounded-md" />
        <span className="text-sm font-semibold tracking-tight">Codrax</span>
      </div>

      <div className="h-[18px] w-px" style={{ background: "#3A3532" }} />

      <div className="relative">
        <button
          onClick={() => setSwitcherOpen((v) => !v)}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] hover:bg-[#2C2725]"
        >
          <span className="font-sans text-xs" style={{ color: COLORS.textSecondary }}>
            ~/dev/
          </span>
          <span className="font-medium">{workspace.name}</span>
          <span className="text-[11px]" style={{ color: "#948B81" }}>
            ▾
          </span>
        </button>

        {switcherOpen && (
          <>
            <div
              onClick={() => setSwitcherOpen(false)}
              data-tauri-drag-region="false"
              className="fixed inset-0 z-[59]"
            />
            <div
              data-tauri-drag-region="false"
              className="absolute left-0 top-[38px] z-[60] w-[280px] overflow-hidden rounded-[10px] border"
              style={{
                background: COLORS.bgSurface,
                borderColor: COLORS.borderDefault,
                boxShadow: "0 20px 50px rgba(0,0,0,.55)",
              }}
            >
              <div
                className="border-b px-3 py-2.5 font-sans text-[10px] uppercase tracking-wider"
                style={{ borderColor: COLORS.borderSubtle, color: COLORS.textMuted }}
              >
                Workspaces
              </div>
              <div className="max-h-[320px] overflow-y-auto p-1.5">
                {workspaces.map((ws) => {
                  const active = ws.id === workspace.id;
                  const missing = missingWorkspaceIds.has(ws.id);

                  if (missing) {
                    return (
                      <div
                        key={ws.id}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px]"
                        style={{ color: COLORS.textDim, opacity: 0.6 }}
                      >
                        <span className="h-2 w-2 flex-none rounded-sm" style={{ background: ws.dot }} />
                        <span className="flex-1 truncate line-through">{ws.name}</span>
                        <button
                          onClick={() => onRelocateWorkspace(ws.id)}
                          className="rounded px-1.5 py-px font-sans text-[10px]"
                          style={{ border: `1px solid ${COLORS.borderDefault}`, color: COLORS.textSecondary }}
                        >
                          Relocate
                        </button>
                        <button
                          onClick={() => onRemoveWorkspace(ws.id)}
                          className="rounded px-1.5 py-px font-sans text-[10px]"
                          style={{ border: `1px solid ${COLORS.borderDefault}`, color: "#FF4757" }}
                        >
                          Remove
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={ws.id}
                      onClick={() => {
                        onSelectWorkspace(ws.id);
                        setSwitcherOpen(false);
                      }}
                      data-tauri-drag-region="false"
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] hover:bg-[#2C2725]"
                      style={{
                        color: active ? COLORS.textPrimary : COLORS.textSecondary,
                        background: active ? "#2C2725" : "transparent",
                        fontWeight: active ? 500 : 400,
                      }}
                    >
                      <span className="h-2 w-2 flex-none rounded-sm" style={{ background: ws.dot }} />
                      <span className="flex-1 truncate">{ws.name}</span>
                      <span
                        className="min-w-[20px] rounded-md px-1.5 py-[2px] text-center font-sans text-[11px]"
                        style={{
                          color: active ? COLORS.accent : COLORS.textMuted,
                          background: active ? accentDim() : COLORS.bgSurface,
                        }}
                      >
                        {workspaceCounts[ws.id] ?? 0}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div
                onClick={() => {
                  onAddWorkspace();
                  setSwitcherOpen(false);
                }}
                data-tauri-drag-region="false"
                className="flex cursor-pointer items-center gap-2 border-t px-3 py-2.5 text-[13px] hover:bg-[#2C2725]"
                style={{ borderColor: COLORS.borderSubtle, color: COLORS.textDim }}
              >
                <span className="w-2 flex-none text-center">＋</span>
                <span>Add workspace</span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex-1" />

      <div
        className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5"
        style={{ background: COLORS.bgPanel, borderColor: COLORS.borderSubtle }}
      >
        <span
          className="h-[7px] w-[7px] animate-[dotPulse_1.6s_ease-in-out_infinite] rounded-full"
          style={{ background: COLORS.accent, boxShadow: `0 0 8px ${accentGlow()}` }}
        />
        <span className="font-sans text-xs" style={{ color: COLORS.textSoft }}>
          {activeCount} agents active
        </span>
      </div>

      <ActivityBar onToggleNotifs={onToggleNotifs} onOpenSettings={onOpenSettings} unreadCount={unreadCount} />

      {notifsOpen && (
        <div className="relative">
          <div onClick={onCloseNotifs} data-tauri-drag-region="false" className="fixed inset-0 z-[59]" />
          <div
            data-tauri-drag-region="false"
            className="absolute right-0 top-[40px] z-[60] w-[320px] overflow-hidden rounded-[10px] border"
            style={{
              background: COLORS.bgSurface,
              borderColor: COLORS.borderDefault,
              boxShadow: "0 20px 50px rgba(0,0,0,.55)",
            }}
          >
            <div
              className="flex items-center justify-between border-b px-3.5 py-3 text-[13px] font-semibold"
              style={{ borderColor: COLORS.borderSubtle }}
            >
              Notifications
              {notifs.length > 0 && (
                <button
                  onClick={onClearNotifs}
                  className="font-sans text-[11px] font-normal hover:underline"
                  style={{ color: COLORS.textMuted }}
                >
                  Clear
                </button>
              )}
            </div>
            <div className="max-h-[320px] overflow-y-auto">
              {notifs.length === 0 ? (
                <div className="p-6 text-center text-[12.5px]" style={{ color: COLORS.textDim }}>
                  You're all caught up
                </div>
              ) : (
                notifs.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-start gap-2.5 border-b px-3.5 py-[11px]"
                    style={{ borderColor: COLORS.borderSubtle }}
                  >
                    <span
                      className="mt-1.5 h-[7px] w-[7px] flex-none rounded-full"
                      style={{ background: n.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] leading-snug" style={{ color: COLORS.textSoft }}>
                        {n.text}
                      </div>
                      <div className="mt-[3px] font-sans text-[10.5px]" style={{ color: COLORS.textMuted }}>
                        {n.time}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="h-[18px] w-px" style={{ background: "#3A3532" }} />

      <button
        onClick={onReset}
        className="flex h-8 items-center gap-1.5 rounded-md border px-3 font-sans text-[12.5px] text-[#A39A90] hover:bg-[#2C2725] hover:text-[color:var(--color-text-primary)]"
        style={{ borderColor: COLORS.borderSubtle, boxShadow: "0 1px 2px rgba(0,0,0,.3)" }}
      >
        <ResetIcon />
        Reset
      </button>
    </div>
  );
}
