import { useCallback, useEffect, useState } from "react";
import { gitLog, type GitLogResponse } from "@/lib/tauri";

export function useGitLog(path: string) {
  const [log, setLog] = useState<GitLogResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setLog(await gitLog(path));
    } catch (err) {
      console.error("git_log failed", err);
      setLog(null);
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { log, loading, refresh };
}
