import { supabase } from "@/integrations/supabase/client";
import { db } from "./db";
import { syncQueueStore } from "./local-store";
import { networkMonitor, type NetworkStatus } from "./network-monitor";
import { DEFAULT_BATCH_SIZE, listReadyQueue } from "./queue";
import { getSyncStatusRecord, updateSyncStatus } from "./sync-status";
import { conflictStore } from "./conflicts";
import type { LocalEntity, SyncQueueOperation, SyncQueueOperationType } from "./types";

export type SyncEntityType =
  | "communities"
  | "households"
  | "persons"
  | "pregnancies"
  | "child_profiles"
  | "assessments"
  | "referrals"
  | "referral_status_history"
  | "referral_outcomes"
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
  event: SyncEvent;
  progress: { completed: number; total: number };
  lastSuccessfulSync: string | null;
}

export type SyncEvent = "idle" | "syncing" | "success" | "failed" | "waiting-network";

export type SyncListener = (snapshot: SyncStatusSnapshot) => void;

const syncOrder: SyncEntityType[] = [
  "communities",
  "households",
  "persons",
  "pregnancies",
  "child_profiles",
  "assessments",
  "referrals",
  "referral_status_history",
  "referral_outcomes",
  "follow_ups",
  "follow_up_attempts",
  "follow_up_outcomes",
  "person_notes",
];

const relationStores: Record<string, { table: string; field: string }[]> = {
  households: [{ table: "communities", field: "community_id" }],
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
  referral_status_history: [{ table: "referrals", field: "referral_id" }],
  referral_outcomes: [{ table: "referrals", field: "referral_id" }],
  follow_up_attempts: [{ table: "follow_ups", field: "follow_up_id" }],
  follow_up_outcomes: [{ table: "follow_ups", field: "follow_up_id" }],
  person_notes: [{ table: "persons", field: "person_id" }],
};

const localTables: Record<SyncEntityType, string> = {
  communities: "communities",
  households: "households",
  persons: "persons",
  pregnancies: "pregnancies",
  child_profiles: "child_profiles",
  assessments: "assessments",
  referrals: "referrals",
  referral_status_history: "referral_status_history",
  referral_outcomes: "referral_outcomes",
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
  where?: (index: string) => { equals: (value: string) => { first: () => Promise<LocalEntity | undefined> } };
  put: (value: LocalEntity) => Promise<unknown>;
  delete: (id: string) => Promise<unknown>;
};

type SupabaseClientLike = {
  from: (table: string) => any;
  auth?: { getUser: () => Promise<{ data: { user: { id: string } | null } }> };
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
  if (record && "date_of_birth" in record && typeof payload.date_of_birth === "string") {
    const match = payload.date_of_birth.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match) payload.date_of_birth = `${match[3]}-${match[2]}-${match[1]}`;
  }
  if (recordType(record) === "referral_status_history") {
    delete payload.created_at;
    delete payload.updated_at;
  }
  if (recordType(record) === "follow_up_attempts" || recordType(record) === "follow_up_outcomes") {
    delete payload.created_at;
    delete payload.updated_at;
    delete payload.created_by;
  }
  if (recordType(record) === "follow_up_attempts") {
    delete payload.recorded_by;
  }
  if (recordType(record) === "follow_up_outcomes") {
    delete payload.actor;
  }
  if (recordType(record) === "persons") {
    const education = typeof payload.education === "string" ? payload.education.trim() : payload.education;
    if (!education) payload.education = null;
    else if (education === "None") payload.education = "None/Informal";
    else if (!["None/Informal", "Primary", "JHS", "SHS", "Tertiary"].includes(String(education))) {
      payload.education = null;
    }
  }
  if (includeId) payload.id = record.remoteId ?? record.localId;
  return payload;
}

function recordType(record: LocalEntity): SyncEntityType {
  if ("follow_up_id" in record) {
    if ("contact_status" in record) return "follow_up_outcomes";
    return "follow_up_attempts";
  }
  if ("referral_id" in record && "to_status" in record && "at" in record) return "referral_status_history";
  if ("full_name" in record) return "persons";
  if ("community_code" in record) return "communities";
  if ("head_name" in record) return "households";
  if ("assessment_type" in record) return "assessments";
  if ("birth_weight_kg" in record) return "child_profiles";
  if ("due_date" in record) return "follow_ups";
  if ("referral_id" in record) return "referral_outcomes";
  return "pregnancies";
}

async function resolveForeignKeys(
  entityType: SyncEntityType,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const resolved = { ...payload };
  for (const relation of relationStores[entityType] ?? []) {
    const value = resolved[relation.field];
    if (typeof value !== "string") continue;
    const parentTable = (db as unknown as Record<string, LocalTable>)[relation.table];
    const parent = await parentTable.get(value) ?? await parentTable.where?.("remoteId").equals(value).first();
    if (!parent) {
      if (entityType === "persons" && relation.field === "household_id") {
        resolved[relation.field] = null;
      }
      continue;
    }
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

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const value = error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    const parts = [value.message, value.details, value.hint, value.code]
      .filter(Boolean)
      .map(String)
      .join(" · ");
    if (String(value.code) === "42501") {
      return `${parts || "Permission denied"}. Check that you are signed in and retry synchronization.`;
    }
    return parts || "Unknown synchronization error";
  }
  return String(error);
}

function backoff(attemptCount: number): string {
  const delays = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000, 6 * 60 * 60_000, 24 * 60 * 60_000];
  const delay = delays[Math.min(attemptCount - 1, delays.length - 1)];
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
  conflictId: string | null = null,
): Promise<SyncQueueOperation> {
  const existing = (await syncQueueStore.list()).find(
    (operation) =>
      operation.entityType === entityType &&
      operation.localId === localId &&
      operation.operationType === operationType &&
      ["pending", "syncing", "retrying", "failed"].includes(operation.syncStatus),
  );
  if (existing) {
    await syncQueueStore.update(existing.id, {
      payload,
      remoteId,
      syncStatus: "pending",
      retryAfter: null,
      lastError: null,
      conflictId,
    });
    return { ...existing, payload, remoteId, syncStatus: "pending", retryAfter: null, lastError: null, conflictId };
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
    conflictId,
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
    const queued = await syncQueueStore.list();
    await Promise.all(
      queued
        .filter(
          (operation) =>
            operation.entityType === entityType &&
            operation.localId === record.localId &&
            operation.operationType !== "delete",
        )
        .map((operation) => syncQueueStore.delete(operation.id)),
    );
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
  if (operation.entityType === "persons" && payload.household_id === null && record.household_id && !record.household_id.startsWith("remote-")) {
    await tableFor(operation.entityType).put({
      ...record,
      household_id: null,
      updatedAt: new Date().toISOString(),
      syncStatus: "pending",
      syncError: null,
      version: record.version + 1,
    } as LocalEntity);
  }
  const ownerTables = new Set([
    "communities",
    "households",
    "persons",
    "pregnancies",
    "child_profiles",
    "assessments",
    "referrals",
    "follow_ups",
  ]);
  if (operation.operationType === "create" && ownerTables.has(operation.entityType) && client.auth) {
    const user = await client.auth.getUser();
    if (!user.data.user) throw new Error("Cannot sync household: sign in again and retry");
    payload.created_by = user.data.user.id;
  }

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

  if (!remoteId) {
    if (operation.entityType === "persons" && payload.household_id === null) {
      await updateRecordStatus(operation, {
        household_id: null,
        syncStatus: "synced",
        lastSyncedAt: new Date().toISOString(),
        syncError: null,
      });
      await syncQueueStore.delete(operation.id);
      return;
    }
    throw new Error(`Cannot update without remote ID: ${operation.entityType}/${operation.localId}`);
  }
  if (record.lastSyncedAt) {
    const remote = await table.select("*").eq("id", remoteId).maybeSingle();
    if (remote.error) throw remote.error;
    if (remote.data?.updated_at && remote.data.updated_at > record.lastSyncedAt) {
      await conflictStore.create({
        entityType: operation.entityType,
        localId: operation.localId,
        remoteId,
        localVersion: record.version,
        remoteVersion: remote.data.updated_at,
        detectedAt: new Date().toISOString(),
        localData: { ...record },
        remoteData: remote.data,
        operationType: operation.operationType,
      });
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
  private readonly batchSize: number;
  private running = false;
  private syncing = false;
  private onlineHandler?: () => void;
  private unsubscribeNetwork?: () => void;
  private listeners = new Set<SyncListener>();
  private activeSync?: Promise<SyncStatusSnapshot>;
  private snapshot: SyncStatusSnapshot = {
    running: false,
    online: true,
    pending: 0,
    failed: 0,
    conflicts: 0,
    lastSyncAt: null,
    lastError: null,
    event: "idle",
    progress: { completed: 0, total: 0 },
    lastSuccessfulSync: null,
  };

  constructor(
    client: SupabaseClientLike = supabase as unknown as SupabaseClientLike,
    options: { batchSize?: number } = {},
  ) {
    this.client = client;
    this.batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
  }

  start(): void {
    if (this.running || typeof window === "undefined") return;
    this.running = true;
    this.onlineHandler = () => this.scheduleSync();
    networkMonitor.start();
    this.unsubscribeNetwork = networkMonitor.subscribe((status) => this.handleNetwork(status));
    this.snapshot = { ...this.snapshot, running: true, online: networkMonitor.isOnline() };
    void this.refreshStatus();
    if (networkMonitor.isOnline()) this.scheduleSync();
  }

  stop(): void {
    if (this.onlineHandler && typeof window !== "undefined") window.removeEventListener("online", this.onlineHandler);
    this.unsubscribeNetwork?.();
    this.unsubscribeNetwork = undefined;
    this.onlineHandler = undefined;
    this.running = false;
    this.snapshot = { ...this.snapshot, running: false, event: "idle" };
    this.emit();
  }

  syncNow(): Promise<SyncStatusSnapshot> {
    if (this.syncing) {
      return this.activeSync ?? Promise.resolve(this.getStatus());
    }
    this.activeSync = this.runSync();
    return this.activeSync;
  }

  async retryFailed(): Promise<SyncStatusSnapshot> {
    const retryable = (await syncQueueStore.list()).filter(
      (operation) => ["failed", "pending", "retrying"].includes(operation.syncStatus),
    );
    await Promise.all(
      retryable.map(async (operation) => {
        await syncQueueStore.update(operation.id, {
          syncStatus: "pending",
          retryAfter: null,
          lastError: null,
        });
        await updateRecordStatus(operation, { syncStatus: "pending", syncError: null });
      }),
    );
    return this.syncNow();
  }

  private async runSync(): Promise<SyncStatusSnapshot> {
    if (this.running && !networkMonitor.isOnline()) {
      this.setEvent("waiting-network", { online: false });
      await this.refreshStatus();
      return this.getStatus();
    }
    this.syncing = true;
    const startedAt = Date.now();
    const before = await syncQueueStore.count();
    this.snapshot = { ...this.snapshot, online: true, lastError: null, event: "syncing", progress: { completed: 0, total: before } };
    await updateSyncStatus({ lastSyncStartedAt: new Date(startedAt).toISOString(), currentlySyncing: true, networkStatus: "online", queueLengthBefore: before });
    this.emit();
    let completed = 0;
    try {
      await enqueuePersistedTombstones();
      while (!this.running || networkMonitor.isOnline()) {
        const operations = await listReadyQueue(this.batchSize);
        if (operations.length === 0) break;
        for (const operation of operations) {
          await this.process(operation);
          completed += 1;
        }
        this.snapshot = { ...this.snapshot, progress: { completed, total: Math.max(before, completed) } };
        this.emit();
      }
      const completedAt = new Date().toISOString();
      const remaining = await syncQueueStore.list();
      const hasFailure = remaining.some((operation) => operation.syncStatus === "failed");
      this.snapshot = { ...this.snapshot, lastSyncAt: completedAt, lastSuccessfulSync: hasFailure ? this.snapshot.lastSuccessfulSync : completedAt, event: hasFailure ? "failed" : "success" };
      const stored = await getSyncStatusRecord();
      await updateSyncStatus({ lastSyncCompletedAt: completedAt, lastSuccessfulSync: hasFailure ? stored.lastSuccessfulSync : completedAt, currentlySyncing: false, syncedCount: completed, totalUploaded: stored.totalUploaded + completed, lastDurationMs: Date.now() - startedAt, queueLengthAfter: remaining.length });
    } catch (error) {
      this.snapshot = { ...this.snapshot, lastError: error instanceof Error ? error.message : String(error) };
      this.setEvent("failed");
    } finally {
      this.syncing = false;
      await this.refreshStatus();
      this.activeSync = undefined;
    }
    return this.getStatus();
  }

  getStatus(): SyncStatusSnapshot {
    return { ...this.snapshot };
  }

  isRunning(): boolean {
    return this.running;
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => this.listeners.delete(listener);
  }

  private scheduleSync(): void {
    if (!this.running) return;
    if (this.syncing) return;
    void this.syncNow();
  }

  private handleNetwork(status: NetworkStatus): void {
    this.snapshot = { ...this.snapshot, online: status === "online" };
    if (status === "offline") this.setEvent("waiting-network");
    else if (this.running) this.scheduleSync();
    this.emit();
  }

  private setEvent(event: SyncEvent, updates: Partial<SyncStatusSnapshot> = {}): void {
    this.snapshot = { ...this.snapshot, ...updates, event };
    this.emit();
  }

  private emit(): void {
    const snapshot = this.getStatus();
    for (const listener of this.listeners) listener(snapshot);
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("nurture-sync-status", { detail: snapshot }));
  }

  private async process(operation: SyncQueueOperation): Promise<void> {
    const attemptCount = operation.attemptCount + 1;
    await syncQueueStore.update(operation.id, {
      syncStatus: "syncing",
      attemptCount,
      lastAttemptedAt: new Date().toISOString(),
    });
    try {
      await performOperation(operation, this.client);
      await syncQueueStore.delete(operation.id);
      if (operation.conflictId) await conflictStore.markHistorySync(operation.conflictId, "synced");
    } catch (error) {
      const message = errorMessage(error);
      if (error instanceof SyncConflictError) {
        await syncQueueStore.update(operation.id, { syncStatus: "conflict", lastError: message, retryAfter: null, conflictId: `${operation.entityType}:${operation.localId}` });
        await updateRecordStatus(operation, { syncStatus: "conflict", syncError: message });
        return;
      }
      if (error instanceof DependencyPendingError) {
        await syncQueueStore.update(operation.id, {
          syncStatus: "pending",
          lastError: message,
          retryAfter: backoff(attemptCount),
        });
        return;
      }
      const permanent = isPermanentError(error) || attemptCount >= 8;
      await syncQueueStore.update(operation.id, {
        syncStatus: "failed",
        lastError: message,
        retryAfter: permanent ? null : backoff(attemptCount),
      });
      this.snapshot = { ...this.snapshot, lastError: message, event: "failed" };
      this.emit();
      const metrics = await getSyncStatusRecord();
      await updateSyncStatus({
        totalFailed: metrics.totalFailed + 1,
        totalRetried: metrics.totalRetried + (attemptCount > 1 ? 1 : 0),
      });
      if (operation.conflictId) await conflictStore.markHistorySync(operation.conflictId, "failed");
      await updateRecordStatus(operation, { syncStatus: "failed", syncError: message });
    }
  }

  private async refreshStatus(): Promise<void> {
    const operations = await syncQueueStore.list();
    this.snapshot = {
      ...this.snapshot,
      pending: operations.filter((operation) => ["pending", "syncing", "retrying", "failed"].includes(operation.syncStatus)).length,
      failed: operations.filter((operation) => operation.syncStatus === "failed").length,
      conflicts: operations.filter((operation) => operation.syncStatus === "conflict").length,
    };
    await updateSyncStatus({
      currentlySyncing: this.syncing,
      pendingCount: this.snapshot.pending,
      failedCount: this.snapshot.failed,
      networkStatus: this.snapshot.online ? "online" : "offline",
    });
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("nurture-sync-status"));
  }
}

export const syncManager = new SyncManager();
export const getSyncStatus = (): SyncStatusSnapshot => syncManager.getStatus();
