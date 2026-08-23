import { db } from "./db";
import type { NetworkStatus } from "./network-monitor";

export interface SyncStatusRecord {
  id: "current";
  lastSyncStartedAt: string | null;
  lastSyncCompletedAt: string | null;
  lastSuccessfulSync: string | null;
  currentlySyncing: boolean;
  pendingCount: number;
  failedCount: number;
  syncedCount: number;
  networkStatus: NetworkStatus;
  totalUploaded: number;
  totalFailed: number;
  totalRetried: number;
  lastDurationMs: number | null;
  queueLengthBefore: number;
  queueLengthAfter: number;
}

export const defaultSyncStatus: SyncStatusRecord = {
  id: "current",
  lastSyncStartedAt: null,
  lastSyncCompletedAt: null,
  lastSuccessfulSync: null,
  currentlySyncing: false,
  pendingCount: 0,
  failedCount: 0,
  syncedCount: 0,
  networkStatus: "online",
  totalUploaded: 0,
  totalFailed: 0,
  totalRetried: 0,
  lastDurationMs: null,
  queueLengthBefore: 0,
  queueLengthAfter: 0,
};

export async function getSyncStatusRecord(): Promise<SyncStatusRecord> {
  return { ...defaultSyncStatus, ...(await db.sync_status.get("current")) };
}

export async function updateSyncStatus(updates: Partial<SyncStatusRecord>): Promise<SyncStatusRecord> {
  const next = { ...(await getSyncStatusRecord()), ...updates };
  await db.sync_status.put(next);
  return next;
}
