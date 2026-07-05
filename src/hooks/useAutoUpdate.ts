import { useEffect } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { useToastStore } from "@/stores/toast.store";

// Checked once per app launch — no polling. GitHub Releases publishes `latest.json`
// (via the release workflow), the updater endpoint in tauri.conf.json points there.
export function useAutoUpdate() {
  const pushToast = useToastStore((s) => s.push);

  useEffect(() => {
    let cancelled = false;

    check()
      .then(async (update) => {
        if (!update || cancelled) return;

        await update.downloadAndInstall();
        if (cancelled) return;

        pushToast({
          kind: "info",
          message: `Codrax ${update.version} downloaded — restart to update.`,
          actionLabel: "Restart",
          onAction: () => void relaunch(),
        });
      })
      .catch((err) => {
        // Fail open — offline or GitHub unreachable shouldn't nag the user.
        console.warn("update check failed", err);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
