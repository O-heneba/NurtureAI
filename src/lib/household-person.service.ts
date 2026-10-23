import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/storage/db";
import { householdStore, personStore, syncQueueStore } from "@/lib/storage/local-store";
import { queueCreate, queueUpdate } from "@/lib/storage/sync-manager";
import type { LocalHousehold, LocalPerson, SyncStatus } from "@/lib/storage/types";

const remote = supabase as unknown as {
  from: (table: string) => any;
  rpc: (functionName: string, args: Record<string, unknown>) => Promise<{ error: any }>;
  auth: { getUser: () => Promise<{ data: { user: { id: string } | null } }> };
};

export type WorkflowStatus = SyncStatus | "remote";
export const WORKFLOW_DATA_CHANGED_EVENT = "nurture:workflow-data-changed";

export type HouseholdWorkflowRow = Omit<LocalHousehold, "address" | "community_id" | "phone"> & {
  id: string;
  address: string | null;
  community_id: string | null;
  phone: string | null;
  workflowStatus: WorkflowStatus;
};

export type PersonWorkflowRow = Omit<LocalPerson, "full_name" | "household_id" | "phone"> & {
  id: string;
  full_name: string;
  household_id: string | null;
  phone: string | null;
  workflowStatus: WorkflowStatus;
};

const browser = () => typeof indexedDB !== "undefined";
const explicitlyOffline = () => typeof navigator !== "undefined" && navigator.onLine === false;

async function currentUserId(): Promise<string | null> {
  try {
    const { data } = await remote.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

function householdRow(record: LocalHousehold): HouseholdWorkflowRow {
  return {
    ...record,
    id: record.remoteId ?? record.localId,
    address: record.address ?? null,
    community_id: record.community_id ?? null,
    phone: record.phone ?? null,
    workflowStatus: record.syncStatus,
  };
}

function personRow(record: LocalPerson): PersonWorkflowRow {
  return {
    ...record,
    id: record.remoteId ?? record.localId,
    full_name: record.full_name,
    household_id: record.household_id ?? null,
    phone: record.phone ?? null,
    workflowStatus: record.syncStatus,
  };
}

function isLocallyDirty(status: SyncStatus): boolean {
  return status === "pending" || status === "failed" || status === "conflict" || status === "deleted";
}

async function cacheHouseholds(rows: any[]): Promise<void> {
  if (!browser()) return;
  for (const row of rows) {
    const existing = await householdStore.getByRemoteId(row.id);
    if (existing && isLocallyDirty(existing.syncStatus)) continue;
    const record: LocalHousehold = {
      ...row,
      localId: existing?.localId ?? row.id,
      remoteId: row.id,
      syncStatus: "synced",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastSyncedAt: new Date().toISOString(),
      syncError: null,
      version: existing?.version ?? 1,
    };
    await db.households.put(record);
  }
}

async function cachePersons(rows: any[]): Promise<void> {
  if (!browser()) return;
  for (const row of rows) {
    const existing = await personStore.getByRemoteId(row.id);
    if (existing && isLocallyDirty(existing.syncStatus)) continue;
    const record: LocalPerson = {
      ...row,
      localId: existing?.localId ?? row.id,
      remoteId: row.id,
      syncStatus: "synced",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastSyncedAt: new Date().toISOString(),
      syncError: null,
      version: existing?.version ?? 1,
    };
    await db.persons.put(record);
  }
}

async function assertHouseholdExists(householdId: string | null | undefined): Promise<void> {
  if (!householdId) return;
  const local = (await householdStore.get(householdId)) ?? (await householdStore.getByRemoteId(householdId));
  if (local) return;
  if (!browser()) return;
  const { data, error } = await remote.from("households").select("id").eq("id", householdId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`Household ${householdId} does not exist`);
}

export async function listWorkflowHouseholds(): Promise<HouseholdWorkflowRow[]> {
  if (!browser()) return listRemoteHouseholds();
  const local = await householdStore.list();
  if (!explicitlyOffline()) {
    try {
      const { data, error } = await remote.from("households").select("*").order("head_name");
      if (!error) await cacheHouseholds(data ?? []);
    } catch {
      // Local data remains the source of truth when refresh is unavailable.
    }
  }
  return (await householdStore.list()).filter((row) => row.syncStatus !== "deleted").map(householdRow);
}

async function listRemoteHouseholds(): Promise<HouseholdWorkflowRow[]> {
  const { data, error } = await remote.from("households").select("*").order("head_name");
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    ...row,
    localId: row.id,
    remoteId: row.id,
    syncStatus: "synced",
    workflowStatus: "remote",
  }));
}

export async function listWorkflowPersons(): Promise<PersonWorkflowRow[]> {
  if (!browser()) return listRemotePersons();
  if (!explicitlyOffline()) {
    try {
      const { data, error } = await remote.from("persons").select("*").order("full_name");
      if (!error) await cachePersons(data ?? []);
    } catch {
      // Local data remains the source of truth when refresh is unavailable.
    }
  }
  return (await personStore.list()).filter((row) => row.syncStatus !== "deleted").map(personRow);
}

async function listRemotePersons(): Promise<PersonWorkflowRow[]> {
  const { data, error } = await remote.from("persons").select("*").order("full_name");
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    ...row,
    localId: row.id,
    remoteId: row.id,
    syncStatus: "synced",
    workflowStatus: "remote",
  }));
}

export async function getWorkflowHousehold(id: string): Promise<HouseholdWorkflowRow | null> {
  if (browser()) {
    const local = (await householdStore.get(id)) ?? (await householdStore.getByRemoteId(id));
    if (local) return householdRow(local);
  }
  if (explicitlyOffline()) return null;
  const { data, error } = await remote.from("households").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data
    ? { ...data, id: data.id, localId: data.id, remoteId: data.id, syncStatus: "synced", workflowStatus: "remote" }
    : null;
}

export async function getWorkflowPerson(id: string): Promise<PersonWorkflowRow | null> {
  if (browser()) {
    const local = (await personStore.get(id)) ?? (await personStore.getByRemoteId(id));
    if (local) return personRow(local);
  }
  if (explicitlyOffline()) return null;
  const { data, error } = await remote.from("persons").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data
    ? { ...data, id: data.id, localId: data.id, remoteId: data.id, syncStatus: "synced", workflowStatus: "remote" }
    : null;
}

export async function listWorkflowPersonsByHousehold(householdId: string): Promise<PersonWorkflowRow[]> {
  if (browser()) {
    const local = await personStore.listByHousehold(householdId);
    if (local.length || explicitlyOffline()) return local.filter((row) => row.syncStatus !== "deleted").map(personRow);
  }
  if (explicitlyOffline()) return [];
  const { data, error } = await remote.from("persons").select("*").eq("household_id", householdId).order("full_name");
  if (error) throw error;
  return (data ?? []).map((row: any) => ({ ...row, id: row.id, localId: row.id, remoteId: row.id, syncStatus: "synced", workflowStatus: "remote" }));
}

export async function createWorkflowHousehold(input: {
  community_id: string;
  house_no: string;
  head_name: string;
  phone?: string;
  address?: string;
  gps?: string;
  notes?: string;
  address_description?: string;
  location_notes?: string;
  composition_breakdown?: string;
  living_conditions?: string;
  barriers?: string[];
  priority_status?: string;
  draft?: boolean;
}): Promise<HouseholdWorkflowRow> {
  if (!browser()) throw new Error("Household creation requires a browser");
  const created_by = await currentUserId();
  const record = await householdStore.create({ ...input, barriers: input.barriers ?? [], created_by });
  await queueCreate("households", record);
  return householdRow(record);
}

export async function createWorkflowPerson(input: {
  household_id?: string;
  full_name: string;
  sex?: string;
  date_of_birth?: string;
  phone?: string;
  national_id?: string;
  notes?: string;
  preferred_name?: string;
  marital_status?: string;
  occupation?: string;
  education?: string;
  disability_status?: string;
  emergency_contact?: string;
  profile_types?: string[];
  priority_status?: string;
  draft?: boolean;
}): Promise<PersonWorkflowRow> {
  if (!browser()) throw new Error("Person creation requires a browser");
  await assertHouseholdExists(input.household_id ?? null);
  const created_by = await currentUserId();
  const record = await personStore.create({ ...input, created_by });
  await queueCreate("persons", record);
  return personRow(record);
}

export async function updateWorkflowHousehold(
  id: string,
  updates: Partial<Omit<LocalHousehold, "localId" | "remoteId" | "syncStatus" | "createdAt" | "updatedAt" | "lastSyncedAt" | "syncError" | "version">>,
): Promise<HouseholdWorkflowRow> {
  if (!browser()) throw new Error("Household editing requires a browser");
  const existing = (await householdStore.get(id)) ?? (await householdStore.getByRemoteId(id));
  if (!existing) throw new Error("Household not found locally");
  const updated = await householdStore.update(existing.localId, updates);
  if (!updated) throw new Error("Household could not be updated");
  await queueUpdate("households", updated);
  return householdRow(updated);
}

export async function updateWorkflowPerson(
  id: string,
  updates: Partial<Omit<LocalPerson, "localId" | "remoteId" | "syncStatus" | "createdAt" | "updatedAt" | "lastSyncedAt" | "syncError" | "version">>,
): Promise<PersonWorkflowRow> {
  if (!browser()) throw new Error("Person editing requires a browser");
  const existing = (await personStore.get(id)) ?? (await personStore.getByRemoteId(id));
  if (!existing) throw new Error("Person not found locally");
  const nextHouseholdId = updates.household_id ?? existing.household_id ?? null;
  await assertHouseholdExists(nextHouseholdId);
  const updated = await personStore.update(existing.localId, updates);
  if (!updated) throw new Error("Person could not be updated");
  await queueUpdate("persons", updated);
  return personRow(updated);
}

export async function deleteWorkflowPerson(id: string): Promise<void> {
  if (!browser()) throw new Error("Person deletion requires a browser");
  if (explicitlyOffline()) throw new Error("Connect to the internet before deleting a person");

  const existing = (await personStore.get(id)) ?? (await personStore.getByRemoteId(id));
  if (!existing) throw new Error("Person not found locally");
  const remoteId = existing.remoteId ?? existing.localId;
  const { error } = await remote.rpc("delete_person_cascade", { target_person_id: remoteId });
  if (error) {
    throw new Error(error.message || error.details || error.hint || "Person could not be deleted");
  }

  const personIds = Array.from(new Set([existing.localId, existing.remoteId].filter(Boolean))) as string[];
  const [pregnancies, childProfiles, assessments, referrals, followUps, notes] = await Promise.all([
    Promise.all(personIds.map((personId) => db.pregnancies.where("person_id").equals(personId).toArray())).then((rows) => rows.flat()),
    Promise.all(personIds.map((personId) => db.child_profiles.where("person_id").equals(personId).toArray())).then((rows) => rows.flat()),
    Promise.all(personIds.map((personId) => db.assessments.where("person_id").equals(personId).toArray())).then((rows) => rows.flat()),
    Promise.all(personIds.map((personId) => db.referrals.where("person_id").equals(personId).toArray())).then((rows) => rows.flat()),
    Promise.all(personIds.map((personId) => db.follow_ups.where("person_id").equals(personId).toArray())).then((rows) => rows.flat()),
    Promise.all(personIds.map((personId) => db.person_notes.where("person_id").equals(personId).toArray())).then((rows) => rows.flat()),
  ]);
  const referralIds = referrals.map((row) => row.localId);
  const followUpIds = followUps.map((row) => row.localId);
  const [referralHistory, referralOutcomes, followUpAttempts, followUpOutcomes] = await Promise.all([
    Promise.all(referralIds.map((referralId) => db.referral_status_history.where("referral_id").equals(referralId).toArray())).then((rows) => rows.flat()),
    Promise.all(referralIds.map((referralId) => db.referral_outcomes.where("referral_id").equals(referralId).toArray())).then((rows) => rows.flat()),
    Promise.all(followUpIds.map((followUpId) => db.follow_up_attempts.where("follow_up_id").equals(followUpId).toArray())).then((rows) => rows.flat()),
    Promise.all(followUpIds.map((followUpId) => db.follow_up_outcomes.where("follow_up_id").equals(followUpId).toArray())).then((rows) => rows.flat()),
  ]);
  const survivingChildProfiles = (await db.child_profiles.toArray()).filter(
    (row) => row.mother_person_id && personIds.includes(row.mother_person_id),
  );
  await Promise.all(
    survivingChildProfiles.map((row) =>
      db.child_profiles.update(row.localId, {
        mother_person_id: null,
        updatedAt: new Date().toISOString(),
        syncStatus: "synced",
      }),
    ),
  );
  const recordsToDelete = [
    ...pregnancies,
    ...childProfiles,
    ...assessments,
    ...referrals,
    ...followUps,
    ...notes,
    ...referralHistory,
    ...referralOutcomes,
    ...followUpAttempts,
    ...followUpOutcomes,
  ];
  await Promise.all([
    db.pregnancies.bulkDelete(pregnancies.map((row) => row.localId)),
    db.child_profiles.bulkDelete(childProfiles.map((row) => row.localId)),
    db.assessments.bulkDelete(assessments.map((row) => row.localId)),
    db.referrals.bulkDelete(referrals.map((row) => row.localId)),
    db.follow_ups.bulkDelete(followUps.map((row) => row.localId)),
    db.person_notes.bulkDelete(notes.map((row) => row.localId)),
    db.referral_status_history.bulkDelete(referralHistory.map((row) => row.localId)),
    db.referral_outcomes.bulkDelete(referralOutcomes.map((row) => row.localId)),
    db.follow_up_attempts.bulkDelete(followUpAttempts.map((row) => row.localId)),
    db.follow_up_outcomes.bulkDelete(followUpOutcomes.map((row) => row.localId)),
    db.persons.delete(existing.localId),
  ]);
  const deletedIds = new Set([existing.localId, ...recordsToDelete.map((row) => row.localId)]);
  const queued = await syncQueueStore.list();
  await Promise.all(queued.filter((operation) => deletedIds.has(operation.localId)).map((operation) => syncQueueStore.delete(operation.id)));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(WORKFLOW_DATA_CHANGED_EVENT, { detail: { type: "person-deleted", personId: remoteId } }));
  }
}
