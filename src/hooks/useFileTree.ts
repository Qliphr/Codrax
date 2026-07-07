import { useEffect, useState } from "react";
import { listFiles } from "@/lib/tauri";
import type { FileEntry } from "@/lib/types";

export function useFileTree(path: string, showHidden: boolean) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, [path, showHidden]);

  return { files, loading };
}
