import { useSyncExternalStore } from "react";
import { getSyncStatus, syncManager } from "@/lib/storage/sync-manager";

export function useSyncStatus() {
  const snapshot = useSyncExternalStore(
    (listener) => syncManager.subscribe(() => listener()),
    getSyncStatus,
    getSyncStatus,
  );
  return {
    syncing: snapshot.running && snapshot.event === "syncing",
    pending: snapshot.pending,
    failed: snapshot.failed,
    lastSync: snapshot.lastSuccessfulSync ?? snapshot.lastSyncAt,
    progress: snapshot.progress,
    online: snapshot.online,
  };
}
