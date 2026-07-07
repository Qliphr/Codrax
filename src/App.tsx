import { useEffect, useMemo, useState } from "react";
import { COLORS } from "@/lib/theme";
import { autoCommit, checkGitIdentity, gitChangedPaths, openPreview } from "@/lib/tauri";
import { timeAgo } from "@/lib/time";
import { CLAUDE_STEP_INDEX, KIMI_STEP_INDEX, type Card, type ColumnKey, type Workspace } from "@/lib/types";
import { TopBar } from "@/components/Layout/TopBar";
import { WelcomeScreen } from "@/components/Layout/WelcomeScreen";
import { Sidebar, type BoardView } from "@/components/Sidebar/Sidebar";
import { KanbanBoard } from "@/components/Board/KanbanBoard";
import { NewTaskModal } from "@/components/Board/NewTaskModal";
import { CardDetail } from "@/components/Board/CardDetail";
import { SettingsModal } from "@/components/Settings/SettingsModal";
import { TerminalGrid } from "@/components/Terminals/TerminalGrid";
import { ToastStack } from "@/components/Toast";
import { useKanbanStore } from "@/stores/kanban.store";
import { useToastStore } from "@/stores/toast.store";
import { useWorkspaceStore } from "@/stores/workspace.store";
import { useNotificationStore } from "@/stores/notification.store";
import { usePipeline } from "@/hooks/usePipeline";
import { useAutoUpdate } from "@/hooks/useAutoUpdate";

export default function App() {
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [view, setView] = useState<BoardView>("board");
  const [notifsOpen, setNotifsOpen] = useState(false);
  const [newTaskColumn, setNewTaskColumn] = useState<ColumnKey | null>(null);
  const [identityOk, setIdentityOk] = useState<boolean | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const {
    workspaces,
    missingIds: missingWorkspaceIds,
    hydrated: workspacesHydrated,
    hydrate: hydrateWorkspaces,
    addWorkspace,
    loadDemoWorkspaces,
    removeWorkspace,
    relocateWorkspace,
    renameWorkspace,
  } = useWorkspaceStore();
  const { cards, hydrate: hydrateKanban, moveCard, addCard, deleteCard, setBaselinePaths } = useKanbanStore();
  const {
    startAgent,
    startFreeTerminal,
    stopAgent,
    killTerminal,
    scheduleDoneCleanup,
    cancelDoneCleanup,
    handleAgentExit,
    handleTurnDone,
    advance,
  } = usePipeline();
  const pushToast = useToastStore((s) => s.push);
  const { notifications, push: pushNotification, markAllRead, clear: clearNotifications } = useNotificationStore();

  useAutoUpdate();

  useEffect(() => {
    hydrateWorkspaces();
  }, [hydrateWorkspaces]);

  useEffect(() => {
    if (!activeWorkspaceId && workspaces.length > 0) {
      setActiveWorkspaceId(workspaces[0].id);
    }
  }, [workspaces, activeWorkspaceId]);

  const workspace = workspaces.find((w) => w.id === activeWorkspaceId);

  useEffect(() => {
    if (workspace) hydrateKanban(workspace.id);
  }, [workspace, hydrateKanban]);

  useEffect(() => {
    // Fail open — a check-failure shouldn't nag the user, only a confirmed missing identity should.
    checkGitIdentity()
      .then(setIdentityOk)
      .catch(() => setIdentityOk(true));
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isPreviewShortcut = (e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "p";
      if (isPreviewShortcut && workspace) {
        e.preventDefault();
        void handleOpenPreview(workspace);
        return;
      }
      const isNewTaskShortcut = (e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === "t";
      if (isNewTaskShortcut) {
        e.preventDefault();
        if (view === "terminals") {
          handleNewTerminal();
        } else {
          setNewTaskColumn("todo");
        }
      }
      const isViewSwitchShortcut = e.shiftKey && e.key === "Tab";
      if (isViewSwitchShortcut) {
        e.preventDefault();
        setView((v) => (v === "board" ? "terminals" : "board"));
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace, view]);

  const activeCount = useMemo(() => cards.filter((c) => c.pipeline.includes("active")).length, [cards]);

  async function handleOpenPreview(ws: Workspace) {
    const url = ws.settings.previewUrl || `http://localhost:${ws.settings.previewPort}`;
    try {
      await openPreview(url);
    } catch (err) {
      pushToast({ kind: "error", message: `Could not open preview: ${String(err)}` });
      return;
    }
    // Best-effort reachability probe — the window still opens either way, per the "never
    // block on it, just warn" rule; the iframe shows the browser's own error if unreachable.
    try {
      await fetch(url, { mode: "no-cors", signal: AbortSignal.timeout(1500) });
    } catch {
      pushToast({ kind: "warning", message: `Nothing responds on ${url} — is your dev server running?` });
    }
  }

  async function handleAddWorkspace() {
    const created = await addWorkspace().catch((err) => {
      console.error("failed to add workspace", err);
      return null;
    });
    if (created) {
      setActiveWorkspaceId(created.id);
      pushNotification(`Added workspace "${created.name}".`, COLORS.textMuted);
    }
  }

  async function runAutoCommit(card: Card) {
    if (!workspace) return;

    // Scope the commit to what this task actually touched: anything changed now that
    // wasn't already dirty at the task's baseline (captured when it went in-progress).
    // No baseline (e.g. repo had no git, or task was created before this existed) falls
    // back to committing everything, same as before.
    let scope: string[] | undefined;
    if (card.baselinePaths) {
      try {
        const current = await gitChangedPaths(workspace.path);
        const baseline = new Set(card.baselinePaths);
        scope = current.filter((p) => !baseline.has(p));
      } catch {
        scope = undefined;
      }
    }

    let result;
    try {
      result = await autoCommit(workspace.path, card.title, scope);
    } catch (err) {
      pushToast({ kind: "error", message: `Could not commit "${card.title}": ${String(err)}` });
      return;
    }

    if (result.kind === "nothingToCommit") {
      pushToast({ kind: "info", message: "Nothing to commit." });
    } else if (result.kind === "committed") {
      pushToast({ kind: "info", message: `Committed "${card.title}".` });
      pushNotification(`Committed "${card.title}".`, COLORS.textMuted);
    } else {
      // The card already stayed in Done — a failed commit never blocks the board.
      pushToast({
        kind: "error",
        message: `Commit failed for "${card.title}": ${result.message}`,
        actionLabel: "Retry",
        onAction: () => void runAutoCommit(card),
      });
      pushNotification(`Commit failed for "${card.title}" — ${result.message}`, "#FF4757");
    }
  }

  function handleMoveCard(cardId: string, nextStatus: ColumnKey) {
    const card = cards.find((c) => c.id === cardId);
    if (!card || card.status === nextStatus) return;

    if (card.status === "done" && nextStatus !== "done") {
      cancelDoneCleanup(cardId);
    }

    if ((card.status === "in-progress" || card.status === "in-review") && card.terminalId) {
      const confirmed = window.confirm("Stop the running agent for this task?");
      if (!confirmed) return;
      void stopAgent(card);
    }

    moveCard(cardId, nextStatus);

    // Column drives which agent runs: In Progress always (re)starts Claude, In Review always (re)starts Kimi.
    if (nextStatus === "in-progress") {
      void startAgent(card, workspace?.path, CLAUDE_STEP_INDEX);
      if (workspace) {
        gitChangedPaths(workspace.path)
          .then((paths) => setBaselinePaths(cardId, paths))
          .catch(() => setBaselinePaths(cardId, null));
      }
    }
    if (nextStatus === "in-review") {
      void startAgent(card, workspace?.path, KIMI_STEP_INDEX);
    }
    if (nextStatus === "done") {
      scheduleDoneCleanup(card);
      void runAutoCommit(card);
    }
  }

  function handleAgentExitEvent(card: Card, exitCode: number) {
    handleAgentExit(card, exitCode);
    if (exitCode === 0) {
      pushNotification(`Agent finished on "${card.title}".`, COLORS.accent);
    } else {
      pushNotification(`Agent failed on "${card.title}" — exited with code ${exitCode}.`, "#FF4757");
    }
  }

  function handleTurnDoneEvent(card: Card, exitCode: number) {
    void handleTurnDone(card, exitCode, workspace?.path);
    if (exitCode === 0) {
      pushNotification(`Agent finished on "${card.title}".`, COLORS.accent);
    } else {
      pushNotification(`Agent failed on "${card.title}" — exited with code ${exitCode}.`, "#FF4757");
    }
  }

  function handleManualClose(card: Card | null, terminalId: string) {
    if (card) void stopAgent(card);
    else void killTerminal(terminalId);
  }

  function handleDeleteCard(card: Card) {
    const confirmed = window.confirm(`Delete task "${card.title}"? This cannot be undone.`);
    if (!confirmed) return;
    if (card.terminalId) void stopAgent(card);
    cancelDoneCleanup(card.id);
    setSelectedCardId(null);
    deleteCard(card.id);
  }

  function handleOpenInTerminal(card: Card) {
    if (!card.terminalId) return;
    setView("terminals");
    setSelectedCardId(null);
  }

  function handleNewTerminal() {
    const paneNum = startFreeTerminal(workspace?.path);
    if (paneNum === null) {
      pushToast({ kind: "warning", message: "No idle terminal pane available — close one first." });
      return;
    }
    setView("terminals");
  }

  const selectedCard = cards.find((c) => c.id === selectedCardId) ?? null;

  const workspaceCounts = Object.fromEntries(
    workspaces.map((ws) => [ws.id, ws.id === workspace?.id ? cards.filter((c) => c.status !== "done").length : 0]),
  );

  const notifsForTopBar = notifications.map((n) => ({
    id: n.id,
    text: n.text,
    time: timeAgo(n.timestamp),
    unread: n.unread,
    color: n.color,
  }));

  if (!workspacesHydrated) {
    return (
      <div
        className="flex h-screen w-screen items-center justify-center text-sm"
        style={{ background: COLORS.bgApp, color: COLORS.textMuted }}
      >
        Loading workspaces…
      </div>
    );
  }

  if (workspaces.length === 0) {
    return <WelcomeScreen onAddWorkspace={() => void handleAddWorkspace()} onLoadDemo={loadDemoWorkspaces} />;
  }

  if (!workspace) {
    return (
      <div
        className="flex h-screen w-screen items-center justify-center text-sm"
        style={{ background: COLORS.bgApp, color: COLORS.textMuted }}
      >
        Loading workspaces…
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden text-[14px]" style={{ background: COLORS.bgApp, color: COLORS.textPrimary }}>
      <TopBar
        workspace={workspace}
        workspaces={workspaces}
        workspaceCounts={workspaceCounts}
        missingWorkspaceIds={missingWorkspaceIds}
        onSelectWorkspace={setActiveWorkspaceId}
        onAddWorkspace={() => void handleAddWorkspace()}
        onRelocateWorkspace={(id) => void relocateWorkspace(id)}
        onRemoveWorkspace={removeWorkspace}
        activeCount={activeCount}
        notifs={notifsForTopBar}
        notifsOpen={notifsOpen}
        onToggleNotifs={() =>
          setNotifsOpen((v) => {
            const next = !v;
            if (next) markAllRead();
            return next;
          })
        }
        onCloseNotifs={() => setNotifsOpen(false)}
        onClearNotifs={clearNotifications}
        onOpenSettings={() => setSettingsOpen(true)}
        onReset={() => setActiveWorkspaceId(workspaces[0]?.id ?? null)}
      />

      {identityOk === false && (
        <div
          className="flex flex-none items-center gap-3 border-b px-5 py-2 font-sans text-xs"
          style={{ borderColor: COLORS.borderSubtle, background: "#3A2A1A", color: COLORS.textSoft }}
        >
          <span>⚠ Git identity not configured — commits will fail.</span>
          <code className="rounded bg-black/30 px-1.5 py-0.5">git config --global user.name "Your Name"</code>
          <code className="rounded bg-black/30 px-1.5 py-0.5">git config --global user.email you@example.com</code>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <Sidebar
          workspaces={workspaces}
          activeWorkspaceId={workspace.id}
          workspaceCounts={workspaceCounts}
          missingWorkspaceIds={missingWorkspaceIds}
          onSelectWorkspace={setActiveWorkspaceId}
          onAddWorkspace={() => void handleAddWorkspace()}
          onRelocateWorkspace={(id) => void relocateWorkspace(id)}
          onRemoveWorkspace={removeWorkspace}
          onRenameWorkspace={renameWorkspace}
          view={view}
          onSetView={setView}
        />

        <div className="flex min-w-0 flex-1 flex-col" style={{ background: COLORS.bgApp }}>
          <div className={`flex min-h-0 flex-1 flex-col ${view === "board" ? "" : "hidden"}`}>
            <KanbanBoard
              cards={cards}
              activeCount={activeCount}
              onCreateTask={(column) => setNewTaskColumn(column)}
              onMoveCard={handleMoveCard}
              onCardClick={(card) => setSelectedCardId(card.id)}
            />
          </div>
          <div className={`flex min-h-0 flex-1 flex-col ${view === "terminals" ? "" : "hidden"}`}>
            <TerminalGrid
              cards={cards}
              onExit={handleAgentExitEvent}
              onTurnDone={handleTurnDoneEvent}
              onManualClose={handleManualClose}
              onNewTerminal={handleNewTerminal}
              onMoveCard={handleMoveCard}
            />
          </div>
        </div>
      </div>

      <NewTaskModal
        open={newTaskColumn !== null}
        initialColumn={newTaskColumn ?? "todo"}
        onClose={() => setNewTaskColumn(null)}
        onCreate={(input) => {
          addCard(input);
          setNewTaskColumn(null);
        }}
      />

      <CardDetail
        card={selectedCard}
        onClose={() => setSelectedCardId(null)}
        onMoveCard={handleMoveCard}
        onAdvance={(card) => void advance(card, workspace.path)}
        onOpenInTerminal={handleOpenInTerminal}
        onDelete={handleDeleteCard}
      />

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} workspace={workspace} />

      <ToastStack />
    </div>
  );
}
