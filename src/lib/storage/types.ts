/**
 * Local storage types for NurtureAI offline support
 * All local records include sync metadata for future synchronization
 */

export type SyncStatus = "pending" | "synced" | "failed" | "conflict" | "deleted";

/**
 * Base sync metadata attached to all locally stored records
 */
/**
 * IMPORTANT for Phase 2 Sync:
 * - localId, remoteId, syncStatus, lastSyncedAt, syncError, version are METADATA ONLY
 * - These fields MUST NOT be sent to Supabase in INSERT/UPDATE operations
 * - Field name mapping: camelCase (local) → snake_case (Supabase)
 *   - createdAt → created_at
 *   - updatedAt → updated_at
 *   - remoteId becomes 'id' in Supabase
 *   - localId is used only for local tracking
 * - Synced records (remoteId != null) being deleted must be marked for delete, not immediately removed
 */
export interface SyncMetadata {
  /** Local unique identifier (UUID v4) - NOT sent to Supabase */
  localId: string;
  /** Remote ID after successful sync (null for records not yet synced) - becomes 'id' in Supabase */
  remoteId: string | null;
  /** Current synchronization status - NOT sent to Supabase */
  syncStatus: SyncStatus;
  /** Timestamp of record creation (camelCase locally, snake_case in Supabase: created_at) */
  createdAt: string;
  /** Timestamp of last update (camelCase locally, snake_case in Supabase: updated_at) */
  updatedAt: string;
  /** Timestamp of last successful sync (null if never synced) - NOT sent to Supabase */
  lastSyncedAt: string | null;
  /** Error message if sync failed - NOT sent to Supabase */
  syncError?: string | null;
  /** Version/revision for future conflict detection - NOT sent to Supabase */
  version: number;
}

/**
 * Local household record with sync metadata
 * Mirrors: public.households
 */
export interface LocalHousehold extends SyncMetadata {
  address?: string | null;
  address_description?: string | null;
  barriers?: string[] | null;
  community_id?: string | null;
  composition_breakdown?: string | null;
  created_by?: string | null;
  data_completeness?: number | null;
  draft?: boolean | null;
  gps?: string | null;
  head_name: string;
  house_no: string;
  living_conditions?: string | null;
  location_notes?: string | null;
  notes?: string | null;
  phone?: string | null;
  next_follow_up_at?: string | null;
  priority_status?: string | null;
}

/**
 * Local person record with sync metadata
 * Mirrors: public.persons
 */
export interface LocalPerson extends SyncMetadata {
  created_by?: string | null;
  date_of_birth?: string | null;
  data_completeness?: number | null;
  disability_status?: string | null;
  draft?: boolean | null;
  education?: string | null;
  emergency_contact?: string | null;
  full_name: string;
  household_id?: string | null;
  marital_status?: string | null;
  national_id?: string | null;
  notes?: string | null;
  occupation?: string | null;
  phone?: string | null;
  preferred_name?: string | null;
  priority_status?: string | null;
  profile_types?: string[] | null;
  sex?: string | null;
}

/**
 * Local pregnancy/ANC record with sync metadata
 * Mirrors: public.pregnancies
 */
export interface LocalPregnancy extends SyncMetadata {
  anc_visits?: number | null;
  created_by?: string | null;
  edd_date?: string | null;
  gravida?: number | null;
  lmp_date?: string | null;
  notes?: string | null;
  parity?: number | null;
  person_id: string;
  status?: string | null;
}

/**
 * Local child profile record with sync metadata
 * Mirrors: public.child_profiles
 */
export interface LocalChildProfile extends SyncMetadata {
  birth_weight_kg?: number | null;
  created_by?: string | null;
  growth_notes?: string | null;
  immunizations?: Record<string, any> | null;
  mother_person_id?: string | null;
  person_id: string;
}

/**
 * Local assessment record with sync metadata
 * Mirrors: public.assessments
 */
export interface LocalAssessment extends SyncMetadata {
  ai_result?: Record<string, any> | null;
  assessment_type: string;
  created_by?: string | null;
  inputs: Record<string, any>;
  person_id?: string | null;
  risk_level?: string | null;
  risk_score?: number | null;
  summary?: string | null;
}

/**
 * Local referral record with sync metadata
 * Mirrors: public.referrals
 */
export interface LocalReferral extends SyncMetadata {
  acknowledged_at?: string | null;
  assessment_id?: string | null;
  category?: string | null;
  completed_at?: string | null;
  created_by?: string | null;
  facility: string;
  facility_id?: string | null;
  findings?: string | null;
  follow_up_required?: boolean;
  notes?: string | null;
  person_id?: string | null;
  reason: string;
  requested_service?: string | null;
  status?: string;
  submitted_at?: string | null;
  symptoms?: string | null;
  urgency?: string | null;
}

/**
 * Local follow-up record with sync metadata
 * Mirrors: public.follow_ups
 */
export interface LocalFollowUp extends SyncMetadata {
  assessment_id?: string | null;
  assigned_to?: string | null;
  community_id?: string | null;
  contact_method?: string | null;
  created_by?: string | null;
  due_date: string;
  household_id?: string | null;
  notes?: string | null;
  person_id?: string | null;
  priority?: string;
  purpose?: string | null;
  referral_id?: string | null;
  status?: string;
  type: string;
}

/**
 * Local follow-up attempt record with sync metadata
 * Mirrors: public.follow_up_attempts
 */
export interface LocalFollowUpAttempt extends SyncMetadata {
  actor?: string | null;
  attempted_at: string;
  barrier?: string | null;
  contacted: boolean;
  follow_up_id: string;
  method?: string | null;
  next_attempt_at?: string | null;
  notes?: string | null;
  result?: string | null;
}

/**
 * Local follow-up outcome record with sync metadata
 * Mirrors: public.follow_up_outcomes
 */
export interface LocalFollowUpOutcome extends SyncMetadata {
  barriers?: string[];
  care_received?: string | null;
  contact_status?: string | null;
  current_condition?: string | null;
  follow_up_id: string;
  new_symptoms?: string | null;
  next_action?: string | null;
  next_follow_up_at?: string | null;
  notes?: string | null;
  recommendations?: string | null;
  recorded_by?: string | null;
  referral_completed?: boolean | null;
}

/**
 * Local person notes record with sync metadata
 * Mirrors: public.person_notes
 */
export interface LocalPersonNotes extends SyncMetadata {
  author_id?: string | null;
  person_id: string;
  text: string;
  type: "ANC" | "Assessment" | "Referral" | "General" | "Follow-up";
}

/**
 * Sync queue operation record
 * Tracks pending operations for future synchronization
 */
export type SyncQueueOperationType = "create" | "update" | "delete";

export interface SyncQueueOperation {
  id: string;
  /** Entity table name (households, persons, assessments, etc.) */
  entityType: string;
  /** Local ID of the entity being synced */
  localId: string;
  /** Remote ID if known */
  remoteId?: string | null;
  /** Operation type */
  operationType: SyncQueueOperationType;
  /** Serialized payload */
  payload: Record<string, any>;
  /** Sync status */
  syncStatus: SyncStatus;
  /** Number of sync attempts */
  attemptCount: number;
  /** Timestamp of last attempted sync */
  lastAttemptedAt?: string | null;
  /** Error from last failed attempt */
  lastError?: string | null;
  /** Timestamp when operation was queued */
  queuedAt: string;
  /** Timestamp when operation should be retried */
  retryAfter?: string | null;
  /** Priority for sync ordering (higher = sync first) */
  priority: number;
}

/**
 * Union type for all local entity types
 */
export type LocalEntity =
  | LocalHousehold
  | LocalPerson
  | LocalPregnancy
  | LocalChildProfile
  | LocalAssessment
  | LocalReferral
  | LocalFollowUp
  | LocalFollowUpAttempt
  | LocalFollowUpOutcome
  | LocalPersonNotes;
