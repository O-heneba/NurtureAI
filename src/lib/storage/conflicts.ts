import { db } from "./db";
import { queueOperation } from "./sync-manager";
import { syncQueueStore } from "./local-store";
import type { ConflictStatus, LocalEntity, SyncConflict, SyncConflictHistory } from "./types";

function conflictId(entityType: string, localId: string): string {
  return `${entityType}:${localId}`;
}

export const conflictStore = {
  async list(): Promise<SyncConflict[]> {
    return db.sync_conflicts.where("status").equals("pending").toArray();
  },
  async get(id: string): Promise<SyncConflict | undefined> {
    return db.sync_conflicts.get(id);
  },
  async create(input: Omit<SyncConflict, "id" | "status">): Promise<SyncConflict> {
    const conflict: SyncConflict = { ...input, id: conflictId(input.entityType, input.localId), status: "pending" };
    await db.sync_conflicts.put(conflict);
    return conflict;
  },
  async updateStatus(id: string, status: ConflictStatus): Promise<void> {
    await db.sync_conflicts.update(id, { status });
  },
  async history(): Promise<SyncConflictHistory[]> {
    return db.sync_conflict_history.orderBy("resolvedAt").reverse().toArray();
  },
  async markHistorySync(conflictId: string, status: "synced" | "failed"): Promise<void> {
    const rows = await db.sync_conflict_history.toArray();
    await Promise.all(rows.filter((row) => row.id.startsWith(`${conflictId}:`)).map((row) => db.sync_conflict_history.update(row.id, { synchronizationStatus: status })));
  },
};

const tables: Record<string, { get: (id: string) => Promise<LocalEntity | undefined>; put: (value: LocalEntity) => Promise<unknown> }> = {
  households: db.households as any,
  persons: db.persons as any,
  pregnancies: db.pregnancies as any,
  child_profiles: db.child_profiles as any,
  assessments: db.assessments as any,
  referrals: db.referrals as any,
  follow_ups: db.follow_ups as any,
  follow_up_attempts: db.follow_up_attempts as any,
  follow_up_outcomes: db.follow_up_outcomes as any,
  person_notes: db.person_notes as any,
};

async function resolve(id: string, status: ConflictStatus, data?: Record<string, unknown>): Promise<void> {
  const conflict = await conflictStore.get(id);
  if (!conflict) throw new Error("Conflict not found");
  const table = tables[conflict.entityType];
  const local = await table.get(conflict.localId);
  if (!local) throw new Error("Local record not found");
  const selected = data ?? (status === "resolved-remote" ? conflict.remoteData : conflict.localData);
  const normalized = Object.fromEntries(Object.entries(selected).map(([key, value]) => {
    if (key === "id") return ["remoteId", value];
    if (key === "created_at") return ["createdAt", value];
    if (key === "updated_at") return ["updatedAt", value];
    return [key, value];
  }));
  const updated = { ...local, ...normalized, syncStatus: status === "resolved-remote" ? "synced" : "pending", syncError: null, lastSyncedAt: status === "resolved-remote" ? new Date().toISOString() : local.lastSyncedAt } as LocalEntity;
  await table.put(updated);
  const blocked = (await syncQueueStore.list()).filter(
    (operation) => operation.entityType === conflict.entityType && operation.localId === conflict.localId && operation.syncStatus === "conflict",
  );
  await Promise.all(blocked.map((operation) => syncQueueStore.delete(operation.id)));
  const resolution = status as "resolved-local" | "resolved-remote" | "resolved-merged";
  await db.sync_conflict_history.put({
    id: `${conflict.id}:${Date.now()}`,
    entityType: conflict.entityType,
    localId: conflict.localId,
    remoteId: conflict.remoteId,
    operationType: conflict.operationType,
    conflictCreatedAt: conflict.detectedAt,
    localSnapshot: conflict.localData,
    remoteSnapshot: conflict.remoteData,
    resolution,
    mergedSnapshot: status === "resolved-merged" ? selected : null,
    resolvedAt: new Date().toISOString(),
    synchronizationStatus: status === "resolved-remote" ? "synced" : "pending",
  });
  await conflictStore.updateStatus(conflict.id, status);
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("nurture-sync-status"));
  if (status !== "resolved-remote") {
    await queueOperation(conflict.entityType as never, conflict.localId, "update", selected, conflict.remoteId, conflict.id);
  }
}

export const conflictResolution = {
  keepLocal: (id: string) => resolve(id, "resolved-local"),
  keepRemote: (id: string) => resolve(id, "resolved-remote"),
  merge: (id: string, merged: Record<string, unknown>) => resolve(id, "resolved-merged", merged),
};
