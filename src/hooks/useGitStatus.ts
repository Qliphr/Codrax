import { useCallback, useEffect, useState } from "react";
import { gitStatus, type GitStatusResponse } from "@/lib/tauri";

export function useGitStatus(path: string) {
  const [status, setStatus] = useState<GitStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setStatus(await gitStatus(path));
    } catch (err) {
      console.error("git_status failed", err);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { status, loading, refresh };
}
