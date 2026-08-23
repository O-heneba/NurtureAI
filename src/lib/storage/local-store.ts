/**
 * Local persistence API for NurtureAI
 * Provides typed CRUD operations on IndexedDB
 * Phase 1: Local operations only (no sync yet)
 */

import { db } from "./db";
import type {
  SyncMetadata,
  LocalHousehold,
  LocalPerson,
  LocalPregnancy,
  LocalChildProfile,
  LocalAssessment,
  LocalReferral,
  LocalFollowUp,
  LocalFollowUpAttempt,
  LocalFollowUpOutcome,
  LocalPersonNotes,
  SyncQueueOperation,
  LocalEntity,
} from "./types";

/**
 * Generate a UUID v4 using crypto.randomUUID()
 * Falls back to a simple implementation if not available
 */
function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Create base sync metadata for a new local record
 */
function createSyncMetadata(): SyncMetadata {
  const now = new Date().toISOString();
  return {
    localId: generateUUID(),
    remoteId: null,
    syncStatus: "pending",
    createdAt: now,
    updatedAt: now,
    lastSyncedAt: null,
    syncError: null,
    version: 1,
  };
}

/**
 * Update sync metadata timestamp on record modification
 */
function updateSyncTimestamp(metadata: SyncMetadata): SyncMetadata {
  return {
    ...metadata,
    updatedAt: new Date().toISOString(),
    version: metadata.version + 1,
  };
}

async function deletePreservingSync<T extends LocalEntity>(
  table: {
    get: (id: string) => Promise<T | undefined>;
    put: (record: T) => Promise<unknown>;
    delete: (id: string) => Promise<unknown>;
  },
  localId: string,
): Promise<boolean> {
  const existing = await table.get(localId);
  if (!existing) return false;
  if (existing.remoteId) {
    await table.put({ ...existing, syncStatus: "deleted", updatedAt: new Date().toISOString() });
    return true;
  }
  await table.delete(localId);
  return true;
}

/**
 * Household operations
 */
export const householdStore = {
  async create(data: Omit<LocalHousehold, keyof SyncMetadata>): Promise<LocalHousehold> {
    const household: LocalHousehold = {
      ...data,
      ...createSyncMetadata(),
    };
    await db.households.add(household);
    return household;
  },

  async get(localId: string): Promise<LocalHousehold | undefined> {
    return db.households.get(localId);
  },

  async getByRemoteId(remoteId: string): Promise<LocalHousehold | undefined> {
    return db.households.where("remoteId").equals(remoteId).first();
  },

  async list(): Promise<LocalHousehold[]> {
    return db.households.toArray();
  },

  async listByCommunity(communityId: string): Promise<LocalHousehold[]> {
    return db.households.where("community_id").equals(communityId).toArray();
  },

  async listUnsyncedOrFailed(): Promise<LocalHousehold[]> {
    return db.households
      .where("syncStatus")
      .anyOf(["pending", "failed", "conflict", "deleted"])
      .toArray();
  },

  async update(
    localId: string,
    updates: Partial<Omit<LocalHousehold, keyof SyncMetadata>>,
  ): Promise<LocalHousehold | undefined> {
    const existing = await db.households.get(localId);
    if (!existing) return undefined;

    const updated: LocalHousehold = {
      ...existing,
      ...updates,
      ...updateSyncTimestamp(existing),
    };

    await db.households.put(updated);
    return updated;
  },

  async delete(localId: string): Promise<boolean> {
    return deletePreservingSync(db.households, localId);
  },

  async count(): Promise<number> {
    return db.households.count();
  },
};

/**
 * Person operations
 */
export const personStore = {
  async create(data: Omit<LocalPerson, keyof SyncMetadata>): Promise<LocalPerson> {
    const person: LocalPerson = {
      ...data,
      ...createSyncMetadata(),
    };
    await db.persons.add(person);
    return person;
  },

  async get(localId: string): Promise<LocalPerson | undefined> {
    return db.persons.get(localId);
  },

  async getByRemoteId(remoteId: string): Promise<LocalPerson | undefined> {
    return db.persons.where("remoteId").equals(remoteId).first();
  },

  async list(): Promise<LocalPerson[]> {
    return db.persons.toArray();
  },

  async listByHousehold(householdId: string): Promise<LocalPerson[]> {
    return db.persons.where("household_id").equals(householdId).toArray();
  },

  async listUnsyncedOrFailed(): Promise<LocalPerson[]> {
    return db.persons.where("syncStatus").anyOf(["pending", "failed", "conflict", "deleted"]).toArray();
  },

  async update(
    localId: string,
    updates: Partial<Omit<LocalPerson, keyof SyncMetadata>>,
  ): Promise<LocalPerson | undefined> {
    const existing = await db.persons.get(localId);
    if (!existing) return undefined;

    const updated: LocalPerson = {
      ...existing,
      ...updates,
      ...updateSyncTimestamp(existing),
    };

    await db.persons.put(updated);
    return updated;
  },

  async delete(localId: string): Promise<boolean> {
    const existing = await db.persons.get(localId);
    if (!existing) return false;
    if (existing.remoteId) return deletePreservingSync(db.persons, localId);
    await db.persons.delete(localId);
    return true;
  },

  async count(): Promise<number> {
    return db.persons.count();
  },
};

/**
 * Pregnancy/ANC operations
 */
export const pregnancyStore = {
  async create(data: Omit<LocalPregnancy, keyof SyncMetadata>): Promise<LocalPregnancy> {
    const pregnancy: LocalPregnancy = {
      ...data,
      ...createSyncMetadata(),
    };
    await db.pregnancies.add(pregnancy);
    return pregnancy;
  },

  async get(localId: string): Promise<LocalPregnancy | undefined> {
    return db.pregnancies.get(localId);
  },

  async getByRemoteId(remoteId: string): Promise<LocalPregnancy | undefined> {
    return db.pregnancies.where("remoteId").equals(remoteId).first();
  },

  async list(): Promise<LocalPregnancy[]> {
    return db.pregnancies.toArray();
  },

  async listByPerson(personId: string): Promise<LocalPregnancy[]> {
    return db.pregnancies.where("person_id").equals(personId).toArray();
  },

  async listUnsyncedOrFailed(): Promise<LocalPregnancy[]> {
    return db.pregnancies
      .where("syncStatus")
      .anyOf(["pending", "failed", "conflict", "deleted"])
      .toArray();
  },

  async update(
    localId: string,
    updates: Partial<Omit<LocalPregnancy, keyof SyncMetadata>>,
  ): Promise<LocalPregnancy | undefined> {
    const existing = await db.pregnancies.get(localId);
    if (!existing) return undefined;

    const updated: LocalPregnancy = {
      ...existing,
      ...updates,
      ...updateSyncTimestamp(existing),
    };

    await db.pregnancies.put(updated);
    return updated;
  },

  async delete(localId: string): Promise<boolean> {
    const existing = await db.pregnancies.get(localId);
    if (!existing) return false;
    if (existing.remoteId) return deletePreservingSync(db.pregnancies, localId);
    await db.pregnancies.delete(localId);
    return true;
  },

  async count(): Promise<number> {
    return db.pregnancies.count();
  },
};

/**
 * Child profile operations
 */
export const childProfileStore = {
  async create(data: Omit<LocalChildProfile, keyof SyncMetadata>): Promise<LocalChildProfile> {
    const profile: LocalChildProfile = {
      ...data,
      ...createSyncMetadata(),
    };
    await db.child_profiles.add(profile);
    return profile;
  },

  async get(localId: string): Promise<LocalChildProfile | undefined> {
    return db.child_profiles.get(localId);
  },

  async getByRemoteId(remoteId: string): Promise<LocalChildProfile | undefined> {
    return db.child_profiles.where("remoteId").equals(remoteId).first();
  },

  async list(): Promise<LocalChildProfile[]> {
    return db.child_profiles.toArray();
  },

  async listByPerson(personId: string): Promise<LocalChildProfile[]> {
    return db.child_profiles.where("person_id").equals(personId).toArray();
  },

  async listUnsyncedOrFailed(): Promise<LocalChildProfile[]> {
    return db.child_profiles
      .where("syncStatus")
      .anyOf(["pending", "failed", "conflict", "deleted"])
      .toArray();
  },

  async update(
    localId: string,
    updates: Partial<Omit<LocalChildProfile, keyof SyncMetadata>>,
  ): Promise<LocalChildProfile | undefined> {
    const existing = await db.child_profiles.get(localId);
    if (!existing) return undefined;

    const updated: LocalChildProfile = {
      ...existing,
      ...updates,
      ...updateSyncTimestamp(existing),
    };

    await db.child_profiles.put(updated);
    return updated;
  },

  async delete(localId: string): Promise<boolean> {
    const existing = await db.child_profiles.get(localId);
    if (!existing) return false;
    if (existing.remoteId) return deletePreservingSync(db.child_profiles, localId);
    await db.child_profiles.delete(localId);
    return true;
  },

  async count(): Promise<number> {
    return db.child_profiles.count();
  },
};

/**
 * Assessment operations
 */
export const assessmentStore = {
  async create(data: Omit<LocalAssessment, keyof SyncMetadata>): Promise<LocalAssessment> {
    const assessment: LocalAssessment = {
      ...data,
      ...createSyncMetadata(),
    };
    await db.assessments.add(assessment);
    return assessment;
  },

  async get(localId: string): Promise<LocalAssessment | undefined> {
    return db.assessments.get(localId);
  },

  async getByRemoteId(remoteId: string): Promise<LocalAssessment | undefined> {
    return db.assessments.where("remoteId").equals(remoteId).first();
  },

  async list(): Promise<LocalAssessment[]> {
    return db.assessments.toArray();
  },

  async listByPerson(personId: string): Promise<LocalAssessment[]> {
    return db.assessments.where("person_id").equals(personId).toArray();
  },

  async listUnsyncedOrFailed(): Promise<LocalAssessment[]> {
    return db.assessments
      .where("syncStatus")
      .anyOf(["pending", "failed", "conflict", "deleted"])
      .toArray();
  },

  async update(
    localId: string,
    updates: Partial<Omit<LocalAssessment, keyof SyncMetadata>>,
  ): Promise<LocalAssessment | undefined> {
    const existing = await db.assessments.get(localId);
    if (!existing) return undefined;

    const updated: LocalAssessment = {
      ...existing,
      ...updates,
      ...updateSyncTimestamp(existing),
    };

    await db.assessments.put(updated);
    return updated;
  },

  async delete(localId: string): Promise<boolean> {
    const existing = await db.assessments.get(localId);
    if (!existing) return false;
    if (existing.remoteId) return deletePreservingSync(db.assessments, localId);
    await db.assessments.delete(localId);
    return true;
  },

  async count(): Promise<number> {
    return db.assessments.count();
  },
};

/**
 * Referral operations
 */
export const referralStore = {
  async create(data: Omit<LocalReferral, keyof SyncMetadata>): Promise<LocalReferral> {
    const referral: LocalReferral = {
      ...data,
      ...createSyncMetadata(),
    };
    await db.referrals.add(referral);
    return referral;
  },

  async get(localId: string): Promise<LocalReferral | undefined> {
    return db.referrals.get(localId);
  },

  async getByRemoteId(remoteId: string): Promise<LocalReferral | undefined> {
    return db.referrals.where("remoteId").equals(remoteId).first();
  },

  async list(): Promise<LocalReferral[]> {
    return db.referrals.toArray();
  },

  async listByPerson(personId: string): Promise<LocalReferral[]> {
    return db.referrals.where("person_id").equals(personId).toArray();
  },

  async listUnsyncedOrFailed(): Promise<LocalReferral[]> {
    return db.referrals
      .where("syncStatus")
      .anyOf(["pending", "failed", "conflict", "deleted"])
      .toArray();
  },

  async update(
    localId: string,
    updates: Partial<Omit<LocalReferral, keyof SyncMetadata>>,
  ): Promise<LocalReferral | undefined> {
    const existing = await db.referrals.get(localId);
    if (!existing) return undefined;

    const updated: LocalReferral = {
      ...existing,
      ...updates,
      ...updateSyncTimestamp(existing),
    };

    await db.referrals.put(updated);
    return updated;
  },

  async delete(localId: string): Promise<boolean> {
    const existing = await db.referrals.get(localId);
    if (!existing) return false;
    if (existing.remoteId) return deletePreservingSync(db.referrals, localId);
    await db.referrals.delete(localId);
    return true;
  },

  async count(): Promise<number> {
    return db.referrals.count();
  },
};

/**
 * Follow-up operations
 */
export const followUpStore = {
  async create(data: Omit<LocalFollowUp, keyof SyncMetadata>): Promise<LocalFollowUp> {
    const followUp: LocalFollowUp = {
      ...data,
      ...createSyncMetadata(),
    };
    await db.follow_ups.add(followUp);
    return followUp;
  },

  async get(localId: string): Promise<LocalFollowUp | undefined> {
    return db.follow_ups.get(localId);
  },

  async getByRemoteId(remoteId: string): Promise<LocalFollowUp | undefined> {
    return db.follow_ups.where("remoteId").equals(remoteId).first();
  },

  async list(): Promise<LocalFollowUp[]> {
    return db.follow_ups.toArray();
  },

  async listByPerson(personId: string): Promise<LocalFollowUp[]> {
    return db.follow_ups.where("person_id").equals(personId).toArray();
  },

  async listUnsyncedOrFailed(): Promise<LocalFollowUp[]> {
    return db.follow_ups
      .where("syncStatus")
      .anyOf(["pending", "failed", "conflict", "deleted"])
      .toArray();
  },

  async update(
    localId: string,
    updates: Partial<Omit<LocalFollowUp, keyof SyncMetadata>>,
  ): Promise<LocalFollowUp | undefined> {
    const existing = await db.follow_ups.get(localId);
    if (!existing) return undefined;

    const updated: LocalFollowUp = {
      ...existing,
      ...updates,
      ...updateSyncTimestamp(existing),
    };

    await db.follow_ups.put(updated);
    return updated;
  },

  async delete(localId: string): Promise<boolean> {
    const existing = await db.follow_ups.get(localId);
    if (!existing) return false;
    if (existing.remoteId) return deletePreservingSync(db.follow_ups, localId);
    await db.follow_ups.delete(localId);
    return true;
  },

  async count(): Promise<number> {
    return db.follow_ups.count();
  },
};

/**
 * Follow-up attempt operations
 */
export const followUpAttemptStore = {
  async create(data: Omit<LocalFollowUpAttempt, keyof SyncMetadata>): Promise<LocalFollowUpAttempt> {
    const attempt: LocalFollowUpAttempt = {
      ...data,
      ...createSyncMetadata(),
    };
    await db.follow_up_attempts.add(attempt);
    return attempt;
  },

  async get(localId: string): Promise<LocalFollowUpAttempt | undefined> {
    return db.follow_up_attempts.get(localId);
  },

  async list(): Promise<LocalFollowUpAttempt[]> {
    return db.follow_up_attempts.toArray();
  },

  async listByFollowUp(followUpId: string): Promise<LocalFollowUpAttempt[]> {
    return db.follow_up_attempts.where("follow_up_id").equals(followUpId).toArray();
  },

  async update(
    localId: string,
    updates: Partial<Omit<LocalFollowUpAttempt, keyof SyncMetadata>>,
  ): Promise<LocalFollowUpAttempt | undefined> {
    const existing = await db.follow_up_attempts.get(localId);
    if (!existing) return undefined;

    const updated: LocalFollowUpAttempt = {
      ...existing,
      ...updates,
      ...updateSyncTimestamp(existing),
    };

    await db.follow_up_attempts.put(updated);
    return updated;
  },

  async count(): Promise<number> {
    return db.follow_up_attempts.count();
  },
};

/**
 * Follow-up outcome operations
 */
export const followUpOutcomeStore = {
  async create(data: Omit<LocalFollowUpOutcome, keyof SyncMetadata>): Promise<LocalFollowUpOutcome> {
    const outcome: LocalFollowUpOutcome = {
      ...data,
      ...createSyncMetadata(),
    };
    await db.follow_up_outcomes.add(outcome);
    return outcome;
  },

  async get(localId: string): Promise<LocalFollowUpOutcome | undefined> {
    return db.follow_up_outcomes.get(localId);
  },

  async getByFollowUp(followUpId: string): Promise<LocalFollowUpOutcome | undefined> {
    return db.follow_up_outcomes.where("follow_up_id").equals(followUpId).first();
  },

  async list(): Promise<LocalFollowUpOutcome[]> {
    return db.follow_up_outcomes.toArray();
  },

  async update(
    localId: string,
    updates: Partial<Omit<LocalFollowUpOutcome, keyof SyncMetadata>>,
  ): Promise<LocalFollowUpOutcome | undefined> {
    const existing = await db.follow_up_outcomes.get(localId);
    if (!existing) return undefined;

    const updated: LocalFollowUpOutcome = {
      ...existing,
      ...updates,
      ...updateSyncTimestamp(existing),
    };

    await db.follow_up_outcomes.put(updated);
    return updated;
  },

  async count(): Promise<number> {
    return db.follow_up_outcomes.count();
  },
};

/**
 * Person notes operations
 */
export const personNotesStore = {
  async create(data: Omit<LocalPersonNotes, keyof SyncMetadata>): Promise<LocalPersonNotes> {
    const notes: LocalPersonNotes = {
      ...data,
      ...createSyncMetadata(),
    };
    await db.person_notes.add(notes);
    return notes;
  },

  async get(localId: string): Promise<LocalPersonNotes | undefined> {
    return db.person_notes.get(localId);
  },

  async list(): Promise<LocalPersonNotes[]> {
    return db.person_notes.toArray();
  },

  async listByPerson(personId: string): Promise<LocalPersonNotes[]> {
    return db.person_notes.where("person_id").equals(personId).toArray();
  },

  async listUnsyncedOrFailed(): Promise<LocalPersonNotes[]> {
    return db.person_notes
      .where("syncStatus")
      .anyOf(["pending", "failed", "conflict", "deleted"])
      .toArray();
  },

  async update(
    localId: string,
    updates: Partial<Omit<LocalPersonNotes, keyof SyncMetadata>>,
  ): Promise<LocalPersonNotes | undefined> {
    const existing = await db.person_notes.get(localId);
    if (!existing) return undefined;

    const updated: LocalPersonNotes = {
      ...existing,
      ...updates,
      ...updateSyncTimestamp(existing),
    };

    await db.person_notes.put(updated);
    return updated;
  },

  async count(): Promise<number> {
    return db.person_notes.count();
  },
};

/**
 * Sync queue operations (for future synchronization)
 */
export const syncQueueStore = {
  async add(operation: Omit<SyncQueueOperation, "id">): Promise<SyncQueueOperation> {
    const op: SyncQueueOperation = {
      ...operation,
      id: generateUUID(),
    };
    await db.sync_queue.add(op);
    return op;
  },

  async get(id: string): Promise<SyncQueueOperation | undefined> {
    return db.sync_queue.get(id);
  },

  async list(): Promise<SyncQueueOperation[]> {
    return db.sync_queue.toArray();
  },

  async listPending(): Promise<SyncQueueOperation[]> {
    return db.sync_queue.where("syncStatus").equals("pending").toArray();
  },

  async listByPriority(): Promise<SyncQueueOperation[]> {
    return db.sync_queue.orderBy("priority").reverse().toArray();
  },

  async update(id: string, updates: Partial<SyncQueueOperation>): Promise<boolean> {
    const count = await db.sync_queue.update(id, updates);
    return count > 0;
  },

  async delete(id: string): Promise<boolean> {
    const existing = await db.sync_queue.get(id);
    if (!existing) return false;
    await db.sync_queue.delete(id);
    return true;
  },

  async clear(): Promise<void> {
    await db.sync_queue.clear();
  },

  async count(): Promise<number> {
    return db.sync_queue.count();
  },
};

/**
 * Utility: Get all unsynced or failed records across all entity types
 */
export async function getAllUnsyncedRecords() {
  const [households, persons, pregnancies, childProfiles, assessments, referrals, followUps, personNotes] =
    await Promise.all([
      householdStore.listUnsyncedOrFailed(),
      personStore.listUnsyncedOrFailed(),
      pregnancyStore.listUnsyncedOrFailed(),
      childProfileStore.listUnsyncedOrFailed(),
      assessmentStore.listUnsyncedOrFailed(),
      referralStore.listUnsyncedOrFailed(),
      followUpStore.listUnsyncedOrFailed(),
      personNotesStore.listUnsyncedOrFailed(),
    ]);

  return {
    households,
    persons,
    pregnancies,
    childProfiles,
    assessments,
    referrals,
    followUps,
    personNotes,
  };
}

/**
 * Utility: Get count of all unsynced records
 */
export async function getUnsyncedCount(): Promise<number> {
  const unsyncedRecords = await getAllUnsyncedRecords();
  return (
    unsyncedRecords.households.length +
    unsyncedRecords.persons.length +
    unsyncedRecords.pregnancies.length +
    unsyncedRecords.childProfiles.length +
    unsyncedRecords.assessments.length +
    unsyncedRecords.referrals.length +
    unsyncedRecords.followUps.length +
    unsyncedRecords.personNotes.length
  );
}
