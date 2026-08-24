/**
 * NurtureAI IndexedDB database setup using Dexie
 * Stores offline health data with sync metadata
 */
/**
 * IMPORTANT NOTES:
 * 
 * 1. SSR Compatibility: This module is imported on both client and server.
 *    Dexie gracefully handles missing IndexedDB on server-side and returns errors
 *    when attempting database operations. Database operations are only called from
 *    client-side code, so this is safe.
 * 
 * 2. Phase 2 Sync Considerations:
 *    - Relationship Fields: Indexes on person_id, household_id, follow_up_id, etc.
 *      When syncing, these IDs point to localIds of related offline records.
 *      Sync manager must ensure related records sync first, then update FKs.
 * 
 *    - Metadata Filtering: When syncing to Supabase, strip all SyncMetadata fields:
 *      Never send: localId, remoteId, syncStatus, lastSyncedAt, syncError, version
 *      Transform: createdAt→created_at, updatedAt→updated_at
 * 
 *    - Delete Safety: When record with remoteId is deleted, sync manager must
 *      track it for deletion sync before physical removal from DB.
 */

import Dexie, { type Table } from "dexie";
import type {
  LocalHousehold,
  LocalCommunity,
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
  SyncConflict,
  LocalReferralStatusHistory,
  LocalReferralOutcome,
  SyncConflictHistory,
} from "./types";
import type { SyncStatusRecord } from "./sync-status";

/**
 * NurtureAI IndexedDB database
 * Contains all tables needed for offline health workflows and sync queue
 */
export class NurtureDB extends Dexie {
  communities!: Table<LocalCommunity>;
  households!: Table<LocalHousehold>;
  persons!: Table<LocalPerson>;
  pregnancies!: Table<LocalPregnancy>;
  child_profiles!: Table<LocalChildProfile>;
  assessments!: Table<LocalAssessment>;
  referrals!: Table<LocalReferral>;
  follow_ups!: Table<LocalFollowUp>;
  follow_up_attempts!: Table<LocalFollowUpAttempt>;
  follow_up_outcomes!: Table<LocalFollowUpOutcome>;
  person_notes!: Table<LocalPersonNotes>;
  sync_queue!: Table<SyncQueueOperation>;
  sync_status!: Table<SyncStatusRecord>;
  sync_conflicts!: Table<SyncConflict>;
  referral_status_history!: Table<LocalReferralStatusHistory>;
  referral_outcomes!: Table<LocalReferralOutcome>;
  sync_conflict_history!: Table<SyncConflictHistory>;

  constructor() {
    super("nurture-db");
    this.version(1).stores({
      // Health data stores
      households: "&localId, remoteId, syncStatus, updatedAt, community_id",
      persons: "&localId, remoteId, syncStatus, updatedAt, household_id",
      pregnancies: "&localId, remoteId, syncStatus, updatedAt, person_id",
      child_profiles: "&localId, remoteId, syncStatus, updatedAt, person_id",
      assessments: "&localId, remoteId, syncStatus, updatedAt, person_id",
      referrals: "&localId, remoteId, syncStatus, updatedAt, person_id",
      follow_ups: "&localId, remoteId, syncStatus, updatedAt, person_id, due_date",
      follow_up_attempts: "&localId, remoteId, syncStatus, updatedAt, follow_up_id",
      follow_up_outcomes: "&localId, remoteId, syncStatus, updatedAt, follow_up_id",
      person_notes: "&localId, remoteId, syncStatus, updatedAt, person_id",

      // Sync queue
      sync_queue: "&id, syncStatus, priority, queuedAt, retryAfter",
    });
    this.version(2).stores({ sync_status: "&id" });
    this.version(3).stores({ sync_conflicts: "&id, entityType, localId, remoteId, status, detectedAt" });
    this.version(4).stores({
      referral_status_history: "&localId, referral_id, at, syncStatus",
      referral_outcomes: "&localId, referral_id, syncStatus",
      sync_conflict_history: "&id, entityType, localId, remoteId, resolvedAt, synchronizationStatus",
    });
    this.version(5).stores({
      communities: "&localId, remoteId, syncStatus, updatedAt, region, district",
    });
  }
}

/**
 * Singleton database instance
 * Access via: db.households.add(...), db.persons.get(...), etc.
 */
export const db = new NurtureDB();
