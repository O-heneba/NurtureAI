import { RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { getSyncStatus, syncManager } from "@/lib/storage/sync-manager";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { toast } from "sonner";

export function OfflineStatus({ compact = false }: { compact?: boolean }) {
  const { online } = useNetworkStatus();
  const [sync, setSync] = useState(getSyncStatus());
  const [syncing, setSyncing] = useState(false);
  const previousEvent = useRef(sync.event);

  useEffect(() => {
    const onSyncStatus = () => setSync(getSyncStatus());
    const onSyncNotification = (event: Event) => {
      const next = (event as CustomEvent<typeof sync>).detail;
      if (!next || previousEvent.current === next.event) return;
      if (next.event === "syncing") toast.info("Sync started");
      if (next.event === "success" && next.progress.completed > 0) toast.success(`${next.progress.completed} records synchronized`);
      if (next.event === "failed") toast.error("Sync failed. Review Pending Sync Changes to retry.");
      previousEvent.current = next.event;
    };
    window.addEventListener("nurture-sync-status", onSyncStatus);
    window.addEventListener("nurture-sync-status", onSyncNotification);
    return () => {
      window.removeEventListener("nurture-sync-status", onSyncStatus);
      window.removeEventListener("nurture-sync-status", onSyncNotification);
    };
  }, []);

  async function resync() {
    if (!online || syncing) return;
    setSyncing(true);
    try {
      const next = sync.failed > 0 || sync.pending > 0 ? await syncManager.retryFailed() : await syncManager.syncNow();
      toast.success(next.failed > 0 ? "Sync retried; some records still need attention" : "Sync complete");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setSyncing(false);
      setSync(getSyncStatus());
    }
  }

  return (
    <button
      type="button"
      onClick={() => void resync()}
      disabled={!online || syncing}
      role="status"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
        online && sync.conflicts === 0 && sync.failed === 0
          ? "border-success/30 bg-success/10 text-success"
          : "border-warning/30 bg-warning/10 text-warning",
      )}
      title={
          online && sync.conflicts === 0 && sync.failed === 0
          ? "Cloud features are available"
        : `${sync.lastError ? `${sync.lastError}. ` : ""}Click to retry synchronization`
      }
    >
      {online ? sync.event === "syncing" ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
      <span>
        {!online ? (sync.event === "waiting-network" ? "Waiting for Internet" : compact ? "Offline · Local AI available" : "Offline") : sync.event === "syncing" ? `Syncing${sync.progress.total ? ` (${sync.progress.completed}/${sync.progress.total})` : ""}` : sync.conflicts > 0 ? "Conflict requires review" : sync.failed > 0 ? "Failed Sync" : sync.pending > 0 ? `Pending Sync (${sync.pending})` : "Synced"}
      </span>
    </button>
  );
}
