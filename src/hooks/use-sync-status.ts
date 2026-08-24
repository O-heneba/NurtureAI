import { useSyncExternalStore } from "react";
import { getSyncStatus, syncManager } from "@/lib/storage/sync-manager";

let cachedSnapshot = getSyncStatus();

function subscribeSync(listener: () => void) {
  let initial = true;
  return syncManager.subscribe((next) => {
    cachedSnapshot = next;
    if (initial) {
      initial = false;
      return;
    }
    listener();
  });
}

function getCachedSyncStatus() {
  return cachedSnapshot;
}

export function useSyncStatus() {
  const snapshot = useSyncExternalStore(
    subscribeSync,
    getCachedSyncStatus,
    getCachedSyncStatus,
  );
  return {
    syncing: snapshot.running && snapshot.event === "syncing",
    pending: snapshot.pending,
    failed: snapshot.failed,
    conflicts: snapshot.conflicts,
    lastSync: snapshot.lastSuccessfulSync ?? snapshot.lastSyncAt,
    progress: snapshot.progress,
    online: snapshot.online,
  };
}
