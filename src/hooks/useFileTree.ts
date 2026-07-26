import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { listFiles, unwatchWorkspace, watchWorkspace } from "@/lib/tauri";
import type { FileEntry } from "@/lib/types";

export function useFileTree(path: string, showHidden: boolean) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listFiles(path, showHidden)
      .then((entries) => {
        if (!cancelled) setFiles(entries);
      })
      .catch((err) => {
        console.error("list_files failed", err);
        if (!cancelled) setFiles([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [path, showHidden, refreshToken]);

  // Watches the workspace root on the Rust side so external edits (an AI agent writing
  // files via a terminal pane, git checkout, editor saves, ...) refresh the tree too.
  useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | undefined;

    watchWorkspace(path).catch((err) => console.error("watch_workspace failed", err));
    listen(`fs://changed/${path}`, () => {
      if (!cancelled) setRefreshToken((t) => t + 1);
    }).then((fn) => {
      if (cancelled) fn();
      else unlisten = fn;
    });

    return () => {
      cancelled = true;
      unlisten?.();
      void unwatchWorkspace(path);
    };
  }, [path]);

  return { files, loading };
}
