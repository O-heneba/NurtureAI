import { Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { getSyncStatus } from "@/lib/storage/sync-manager";

export function OfflineStatus({ compact = false }: { compact?: boolean }) {
  const [online, setOnline] = useState(true);
  const [sync, setSync] = useState(getSyncStatus());

  useEffect(() => {
    setOnline(navigator.onLine);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    const onSyncStatus = () => setSync(getSyncStatus());
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("nurture-sync-status", onSyncStatus);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("nurture-sync-status", onSyncStatus);
    };
  }, []);

  return (
    <div
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
            : "Local changes need attention before cloud synchronization"
      }
    >
      {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
      <span>
        {!online ? (compact ? "Offline · Local AI available" : "Offline") : sync.conflicts > 0 ? "Conflict" : sync.failed > 0 ? "Sync failed" : sync.pending > 0 ? "Pending sync" : sync.running ? "Syncing" : "Synced"}
      </span>
    </div>
  );
}
