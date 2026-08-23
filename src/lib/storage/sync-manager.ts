import { supabase } from "@/integrations/supabase/client";
import { db } from "./db";
import { syncQueueStore } from "./local-store";
import type { LocalEntity, SyncQueueOperation, SyncQueueOperationType } from "./types";

export type SyncEntityType =
  | "households"
  | "persons"
  | "pregnancies"
  | "child_profiles"
  | "assessments"
  | "referrals"
  | "follow_ups"
  | "follow_up_attempts"
  | "follow_up_outcomes"
  | "person_notes";

export interface SyncStatusSnapshot {
  running: boolean;
  online: boolean;
  pending: number;
  failed: number;
  conflicts: number;
  lastSyncAt: string | null;
  lastError: string | null;
}

const syncOrder: SyncEntityType[] = [
  "households",
  "persons",
  "pregnancies",
  "child_profiles",
  "assessments",
  "referrals",
  "follow_ups",
  "follow_up_attempts",
  "follow_up_outcomes",
  "person_notes",
];

const relationStores: Record<string, { table: string; field: string }[]> = {
  persons: [{ table: "households", field: "household_id" }],
  pregnancies: [{ table: "persons", field: "person_id" }],
  child_profiles: [
    { table: "persons", field: "person_id" },
    { table: "persons", field: "mother_person_id" },
  ],
  assessments: [{ table: "persons", field: "person_id" }],
  referrals: [
    { table: "persons", field: "person_id" },
    { table: "assessments", field: "assessment_id" },
  ],
  follow_ups: [
    { table: "persons", field: "person_id" },
    { table: "households", field: "household_id" },
    { table: "assessments", field: "assessment_id" },
    { table: "referrals", field: "referral_id" },
  ],
  follow_up_attempts: [{ table: "follow_ups", field: "follow_up_id" }],
  follow_up_outcomes: [{ table: "follow_ups", field: "follow_up_id" }],
  person_notes: [{ table: "persons", field: "person_id" }],
};

const localTables: Record<SyncEntityType, string> = {
  households: "households",
  persons: "persons",
  pregnancies: "pregnancies",
  child_profiles: "child_profiles",
  assessments: "assessments",
  referrals: "referrals",
  follow_ups: "follow_ups",
  follow_up_attempts: "follow_up_attempts",
  follow_up_outcomes: "follow_up_outcomes",
  person_notes: "person_notes",
};

const metadataKeys = new Set([
  "localId",
  "remoteId",
  "syncStatus",
  "lastSyncedAt",
  "syncError",
  "version",
]);

async function enqueuePersistedTombstones(): Promise<void> {
  for (const entityType of syncOrder) {
    const records = await (db as any)[localTables[entityType]].toArray();
    for (const record of records as LocalEntity[]) {
      if (record.syncStatus !== "deleted" || !record.remoteId) continue;
      const hasDelete = (await syncQueueStore.list()).some(
        (operation) =>
          operation.entityType === entityType &&
          operation.localId === record.localId &&
          operation.operationType === "delete" &&
          operation.syncStatus !== "conflict",
      );
      if (!hasDelete) await queueDelete(entityType, record);
    }
  }
}

type LocalTable = {
  get: (id: string) => Promise<LocalEntity | undefined>;
  put: (value: LocalEntity) => Promise<unknown>;
  delete: (id: string) => Promise<unknown>;
};

type SupabaseClientLike = {
  from: (table: string) => any;
};

class DependencyPendingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DependencyPendingError";
  }
}

class SyncConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SyncConflictError";
  }
}

function tableFor(entityType: SyncEntityType): LocalTable {
  return (db as unknown as Record<string, LocalTable>)[localTables[entityType]];
}

function isEntityType(value: string): value is SyncEntityType {
  return value in localTables;
}

function cleanPayload(record: LocalEntity, includeId: boolean): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (metadataKeys.has(key)) continue;
    if (key === "createdAt") payload.created_at = value;
    else if (key === "updatedAt") payload.updated_at = value;
    else payload[key] = value;
  }
  if (includeId) payload.id = record.remoteId ?? record.localId;
  return payload;
}

async function resolveForeignKeys(
  entityType: SyncEntityType,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const resolved = { ...payload };
  for (const relation of relationStores[entityType] ?? []) {
    const value = resolved[relation.field];
    if (typeof value !== "string") continue;
    const parent = await (db as unknown as Record<string, LocalTable>)[relation.table].get(value);
    if (!parent) continue;
    if (!parent.remoteId) {
      throw new DependencyPendingError(
        `${entityType}.${relation.field} is waiting for ${relation.table}/${value}`,
      );
    }
    resolved[relation.field] = parent.remoteId;
  }
  return resolved;
}

function isPermanentError(error: any): boolean {
  const code = String(error?.code ?? "");
  const status = Number(error?.status ?? error?.statusCode ?? 0);
  return status >= 400 && status < 500 && status !== 408 && status !== 409 && status !== 429;
}

function backoff(attemptCount: number): string {
  const delay = Math.min(60 * 60 * 1000, 1000 * 2 ** Math.min(attemptCount, 10));
  return new Date(Date.now() + delay).toISOString();
}

async function updateRecordStatus(
  operation: SyncQueueOperation,
  updates: Partial<LocalEntity>,
): Promise<void> {
  if (!isEntityType(operation.entityType)) return;
  const table = tableFor(operation.entityType);
  const record = await table.get(operation.localId);
  if (record) await table.put({ ...record, ...updates } as LocalEntity);
}

export async function queueOperation(
  entityType: SyncEntityType,
  localId: string,
  operationType: SyncQueueOperationType,
  payload: Record<string, unknown> = {},
  remoteId: string | null = null,
): Promise<SyncQueueOperation> {
  const existing = (await syncQueueStore.list()).find(
    (operation) =>
      operation.entityType === entityType &&
      operation.localId === localId &&
      operation.operationType === operationType &&
      ["pending", "failed"].includes(operation.syncStatus),
  );
  if (existing) {
    await syncQueueStore.update(existing.id, {
      payload,
      remoteId,
      syncStatus: "pending",
      retryAfter: null,
      lastError: null,
    });
    return { ...existing, payload, remoteId, syncStatus: "pending", retryAfter: null, lastError: null };
  }
  return syncQueueStore.add({
    entityType,
    localId,
    remoteId,
    operationType,
    payload,
    syncStatus: "pending",
    attemptCount: 0,
    lastAttemptedAt: null,
    lastError: null,
    queuedAt: new Date().toISOString(),
    retryAfter: null,
    priority: syncOrder.length - syncOrder.indexOf(entityType),
  });
}

export async function queueCreate(entityType: SyncEntityType, record: LocalEntity): Promise<SyncQueueOperation> {
  return queueOperation(
    entityType,
    record.localId,
    "create",
    record as unknown as Record<string, unknown>,
    record.remoteId,
  );
}

export async function queueUpdate(entityType: SyncEntityType, record: LocalEntity): Promise<SyncQueueOperation> {
  return queueOperation(
    entityType,
    record.localId,
    "update",
    record as unknown as Record<string, unknown>,
    record.remoteId,
  );
}

export async function queueDelete(entityType: SyncEntityType, record: LocalEntity): Promise<SyncQueueOperation | null> {
  if (!record.remoteId) {
    await tableFor(entityType).delete(record.localId);
    return null;
  }
  const tombstone = { ...record, syncStatus: "deleted" } as LocalEntity;
  await tableFor(entityType).put(tombstone);
  return queueOperation(entityType, record.localId, "delete", {}, record.remoteId);
}

async function performOperation(operation: SyncQueueOperation, client: SupabaseClientLike): Promise<void> {
  if (!isEntityType(operation.entityType)) throw new Error(`Unsupported entity type: ${operation.entityType}`);
  const table = client.from(operation.entityType);
  const record = await tableFor(operation.entityType).get(operation.localId);
  const remoteId = operation.remoteId ?? record?.remoteId;

  if (operation.operationType === "delete") {
    if (!remoteId) {
      await tableFor(operation.entityType).delete(operation.localId);
      return;
    }
    const { error } = await table.delete().eq("id", remoteId);
    if (error && error.code !== "PGRST116") throw error;
    await tableFor(operation.entityType).delete(operation.localId);
    return;
  }

  if (!record) throw new Error(`Local record missing: ${operation.entityType}/${operation.localId}`);
  const payload = await resolveForeignKeys(
    operation.entityType,
    cleanPayload(record, operation.operationType === "create"),
  );

  if (operation.operationType === "create") {
    const { data, error } = await table.insert(payload).select("*").single();
    if (error) {
      if (error.code === "23505") {
        const existing = await table.select("*").eq("id", record.remoteId ?? record.localId).maybeSingle();
        if (!existing.error && existing.data) {
          await updateRecordStatus(operation, {
            remoteId: existing.data.id,
            syncStatus: "synced",
            lastSyncedAt: new Date().toISOString(),
            syncError: null,
          });
          return;
        }
      }
      throw error;
    }
    await updateRecordStatus(operation, {
      remoteId: data.id,
      syncStatus: "synced",
      lastSyncedAt: new Date().toISOString(),
      syncError: null,
    });
    return;
  }

  if (!remoteId) throw new Error(`Cannot update without remote ID: ${operation.entityType}/${operation.localId}`);
  if (record.lastSyncedAt) {
    const remote = await table.select("updated_at").eq("id", remoteId).maybeSingle();
    if (remote.error) throw remote.error;
    if (remote.data?.updated_at && remote.data.updated_at > record.lastSyncedAt) {
      throw new SyncConflictError(`Remote ${operation.entityType}/${remoteId} changed since last sync`);
    }
  }
  const { error } = await table.update(payload).eq("id", remoteId);
  if (error) throw error;
  await updateRecordStatus(operation, {
    syncStatus: "synced",
    lastSyncedAt: new Date().toISOString(),
    syncError: null,
  });
}

export class SyncManager {
  private readonly client: SupabaseClientLike;
  private running = false;
  private syncing = false;
  private onlineHandler?: () => void;
  private snapshot: SyncStatusSnapshot = {
    running: false,
    online: true,
    pending: 0,
    failed: 0,
    conflicts: 0,
    lastSyncAt: null,
    lastError: null,
  };

  constructor(client: SupabaseClientLike = supabase as unknown as SupabaseClientLike) {
    this.client = client;
  }

  start(): void {
    if (this.running || typeof window === "undefined") return;
    this.running = true;
    this.onlineHandler = () => void this.syncNow();
    window.addEventListener("online", this.onlineHandler);
    this.snapshot = { ...this.snapshot, running: true, online: navigator.onLine };
    if (navigator.onLine) void this.syncNow();
  }

  stop(): void {
    if (this.onlineHandler && typeof window !== "undefined") {
      window.removeEventListener("online", this.onlineHandler);
    }
    this.onlineHandler = undefined;
    this.running = false;
    this.snapshot = { ...this.snapshot, running: false };
  }

  async syncNow(): Promise<SyncStatusSnapshot> {
    if (this.syncing || (typeof navigator !== "undefined" && navigator.onLine === false)) {
      return this.getStatus();
    }
    this.syncing = true;
    this.snapshot = { ...this.snapshot, online: true, lastError: null };
    try {
      await enqueuePersistedTombstones();
      const now = Date.now();
      const operations = (await syncQueueStore.list())
        .filter(
          (operation) =>
            ["pending", "failed"].includes(operation.syncStatus) &&
            (!operation.retryAfter || Date.parse(operation.retryAfter) <= now),
        )
        .sort(
          (left, right) =>
            syncOrder.indexOf(left.entityType as SyncEntityType) -
            syncOrder.indexOf(right.entityType as SyncEntityType),
        );
      for (const operation of operations) await this.process(operation);
      this.snapshot = { ...this.snapshot, lastSyncAt: new Date().toISOString() };
    } catch (error) {
      this.snapshot = { ...this.snapshot, lastError: error instanceof Error ? error.message : String(error) };
    } finally {
      this.syncing = false;
      await this.refreshStatus();
    }
    return this.getStatus();
  }

  getStatus(): SyncStatusSnapshot {
    return { ...this.snapshot };
  }

  private async process(operation: SyncQueueOperation): Promise<void> {
    const attemptCount = operation.attemptCount + 1;
    await syncQueueStore.update(operation.id, {
      syncStatus: "pending",
      attemptCount,
      lastAttemptedAt: new Date().toISOString(),
    });
    try {
      await performOperation(operation, this.client);
      await syncQueueStore.delete(operation.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (error instanceof SyncConflictError) {
        await syncQueueStore.update(operation.id, { syncStatus: "conflict", lastError: message, retryAfter: null });
        await updateRecordStatus(operation, { syncStatus: "conflict", syncError: message });
        return;
      }
      const permanent = isPermanentError(error) || attemptCount >= 8;
      await syncQueueStore.update(operation.id, {
        syncStatus: permanent ? "failed" : "failed",
        lastError: message,
        retryAfter: permanent ? null : backoff(attemptCount),
      });
      await updateRecordStatus(operation, { syncStatus: "failed", syncError: message });
      if (error instanceof DependencyPendingError) return;
    }
  }

  private async refreshStatus(): Promise<void> {
    const operations = await syncQueueStore.list();
    this.snapshot = {
      ...this.snapshot,
      pending: operations.filter((operation) => ["pending", "failed"].includes(operation.syncStatus)).length,
      failed: operations.filter((operation) => operation.syncStatus === "failed").length,
      conflicts: operations.filter((operation) => operation.syncStatus === "conflict").length,
    };
  }
}

export const syncManager = new SyncManager();
export const getSyncStatus = (): SyncStatusSnapshot => syncManager.getStatus();
