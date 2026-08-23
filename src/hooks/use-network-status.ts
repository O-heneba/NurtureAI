import { useSyncExternalStore } from "react";
import { networkMonitor } from "@/lib/storage/network-monitor";

export function useNetworkStatus() {
  const status = useSyncExternalStore(
    (listener) => networkMonitor.subscribe(() => listener()),
    () => networkMonitor.getStatus(),
    () => "online" as const,
  );
  return { online: status === "online", offline: status === "offline", reconnecting: false };
}
