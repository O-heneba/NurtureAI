import { supabase } from "@/integrations/supabase/client";
import { followUpAttemptStore, followUpOutcomeStore, followUpStore } from "@/lib/storage/local-store";
import { createAndQueue, currentUserId, isBrowser, isOffline, localRow, updateAndQueue } from "@/lib/storage/local-first";

const db = supabase as unknown as {
  from: (t: string) => any;
  auth: { getUser: () => Promise<{ data: { user: { id: string } | null } }> };
};

async function uid(): Promise<string> {
  const { data } = await db.auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}

export type FollowUpType =
  | "post_referral"
  | "maternal"
  | "newborn"
  | "child_health"
  | "nutrition"
  | "medication"
  | "missed_appointment"
  | "general"
  | "household_visit"
  | "other";
export type FollowUpPriority = "routine" | "priority" | "urgent";
export type FollowUpStatus =
  "draft" | "scheduled" | "due" | "in_progress" | "completed" | "missed" | "cancelled";
export type ContactMethod =
  "household_visit" | "phone_call" | "community_visit" | "facility_coordination";

export interface FollowUpRow {
  id: string;
  person_id: string | null;
  household_id: string | null;
  community_id: string | null;
  assessment_id: string | null;
  referral_id: string | null;
  type: FollowUpType;
  purpose: string | null;
  priority: FollowUpPriority;
  due_date: string;
  assigned_to: string | null;
  contact_method: ContactMethod | null;
  status: FollowUpStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FollowUpAttempt {
  id: string;
  follow_up_id: string;
  attempted_at: string;
  method: ContactMethod | null;
  contacted: boolean;
  result: string | null;
  barrier: string | null;
  next_attempt_at: string | null;
  notes: string | null;
  actor: string | null;
}

export interface FollowUpOutcomeRow {
  id: string;
  follow_up_id: string;
  contact_status: string | null;
  current_condition: string | null;
  referral_completed: boolean | null;
  care_received: string | null;
  barriers: string[];
  new_symptoms: string | null;
  recommendations: string | null;
  next_follow_up_at: string | null;
  next_action: string | null;
  notes: string | null;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export async function listFollowUps(filter?: {
  scope?: "all" | "mine" | "due" | "missed" | "upcoming" | "completed";
  person_id?: string;
}): Promise<FollowUpRow[]> {
  if (isBrowser()) {
    let local = (await followUpStore.list()).filter((row) => row.syncStatus !== "deleted");
    if (filter?.person_id) local = local.filter((row) => row.person_id === filter.person_id);
    if (filter?.scope === "due") local = local.filter((row) => row.due_date <= todayIso() && ["scheduled", "due", "in_progress"].includes(row.status ?? ""));
    if (filter?.scope === "missed") local = local.filter((row) => row.status === "missed");
    if (filter?.scope === "upcoming") local = local.filter((row) => row.due_date > todayIso() && ["scheduled", "draft"].includes(row.status ?? ""));
    if (filter?.scope === "completed") local = local.filter((row) => row.status === "completed");
    if (local.length || isOffline()) return local.sort((a, b) => a.due_date.localeCompare(b.due_date)).slice(0, 200).map((row) => localRow(row) as FollowUpRow);
  }
  let q = db.from("follow_ups").select("*").order("due_date", { ascending: true }).limit(200);
  if (filter?.person_id) q = q.eq("person_id", filter.person_id);
  if (filter?.scope === "mine") {
    const { data: u } = await db.auth.getUser();
    if (u.user) q = q.eq("assigned_to", u.user.id);
  } else if (filter?.scope === "due") {
    q = q.lte("due_date", todayIso()).in("status", ["scheduled", "due", "in_progress"]);
  } else if (filter?.scope === "missed") {
    q = q.eq("status", "missed");
  } else if (filter?.scope === "upcoming") {
    q = q.gt("due_date", todayIso()).in("status", ["scheduled", "draft"]);
  } else if (filter?.scope === "completed") {
    q = q.eq("status", "completed");
  }
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getFollowUp(id: string): Promise<FollowUpRow | null> {
  if (isBrowser()) {
    const local = await followUpStore.get(id);
    if (local) return localRow(local) as FollowUpRow;
    const byRemote = (await followUpStore.list()).find((row) => row.remoteId === id);
    if (byRemote) return localRow(byRemote) as FollowUpRow;
    if (isOffline()) return null;
  }
  const { data, error } = await db.from("follow_ups").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function listAttempts(follow_up_id: string): Promise<FollowUpAttempt[]> {
  if (isBrowser()) {
    const local = await followUpAttemptStore.listByFollowUp(follow_up_id);
    if (local.length || isOffline()) return local.sort((a, b) => a.attempted_at.localeCompare(b.attempted_at)).map((row) => ({ ...localRow(row), id: row.remoteId ?? row.localId }) as FollowUpAttempt);
  }
  const { data, error } = await db
    .from("follow_up_attempts")
    .select("*")
    .eq("follow_up_id", follow_up_id)
    .order("attempted_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getFollowUpOutcome(follow_up_id: string): Promise<FollowUpOutcomeRow | null> {
  if (isBrowser()) {
    const local = await followUpOutcomeStore.getByFollowUp(follow_up_id);
    if (local) return { ...localRow(local), id: local.remoteId ?? local.localId } as FollowUpOutcomeRow;
    if (isOffline()) return null;
  }
  const { data, error } = await db
    .from("follow_up_outcomes")
    .select("*")
    .eq("follow_up_id", follow_up_id)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function createFollowUp(v: {
  person_id?: string | null;
  household_id?: string | null;
  community_id?: string | null;
  assessment_id?: string | null;
  referral_id?: string | null;
  type: FollowUpType;
  purpose?: string;
  priority?: FollowUpPriority;
  due_date: string;
  assigned_to?: string | null;
  contact_method?: ContactMethod;
  notes?: string;
}): Promise<FollowUpRow> {
  if (isBrowser()) {
    const record = await createAndQueue("follow_ups", followUpStore, { ...v, assigned_to: v.assigned_to ?? await currentUserId(), status: "scheduled", created_by: await currentUserId() });
    return localRow(record) as FollowUpRow;
  }
  const actor = await uid();
  const payload = {
    person_id: v.person_id ?? null,
    household_id: v.household_id ?? null,
    community_id: v.community_id ?? null,
    assessment_id: v.assessment_id ?? null,
    referral_id: v.referral_id ?? null,
    type: v.type,
    purpose: v.purpose ?? null,
    priority: v.priority ?? "routine",
    due_date: v.due_date,
    assigned_to: v.assigned_to ?? actor,
    contact_method: v.contact_method ?? null,
    status: "scheduled" as FollowUpStatus,
    notes: v.notes ?? null,
    created_by: actor,
  };
  const { data, error } = await db.from("follow_ups").insert(payload).select("*").single();
  if (error) throw error;
  return data as FollowUpRow;
}

export async function recordAttempt(v: {
  follow_up_id: string;
  method: ContactMethod;
  contacted: boolean;
  result?: string;
  barrier?: string;
  next_attempt_at?: string;
  notes?: string;
}): Promise<FollowUpAttempt> {
  if (isBrowser()) {
    const record = await createAndQueue("follow_up_attempts", followUpAttemptStore, { ...v, result: v.result ?? null, barrier: v.barrier ?? null, next_attempt_at: v.next_attempt_at ?? null, notes: v.notes ?? null, actor: await currentUserId() });
    if (v.contacted) {
      const followUp = await followUpStore.get(v.follow_up_id);
      if (followUp) await updateAndQueue("follow_ups", followUpStore, followUp.localId, { status: "in_progress" });
    }
    return { ...localRow(record), id: record.localId } as FollowUpAttempt;
  }
  const actor = await uid();
  const { data, error } = await db
    .from("follow_up_attempts")
    .insert({
      follow_up_id: v.follow_up_id,
      method: v.method,
      contacted: v.contacted,
      result: v.result ?? null,
      barrier: v.barrier ?? null,
      next_attempt_at: v.next_attempt_at ?? null,
      notes: v.notes ?? null,
      actor,
    })
    .select("*")
    .single();
  if (error) throw error;
  if (v.contacted) {
    await db.from("follow_ups").update({ status: "in_progress" }).eq("id", v.follow_up_id);
  }
  return data as FollowUpAttempt;
}

export async function completeFollowUp(v: {
  follow_up_id: string;
  contact_status: string;
  current_condition?: string;
  referral_completed?: boolean;
  care_received?: string;
  barriers?: string[];
  new_symptoms?: string;
  recommendations?: string;
  next_follow_up_at?: string;
  next_action?: string;
  notes?: string;
}): Promise<FollowUpOutcomeRow> {
  if (isBrowser()) {
    const existing = await followUpOutcomeStore.getByFollowUp(v.follow_up_id);
    const payload = { ...v, barriers: v.barriers ?? [], care_received: v.care_received ?? null, new_symptoms: v.new_symptoms ?? null, recommendations: v.recommendations ?? null, next_follow_up_at: v.next_follow_up_at ?? null, next_action: v.next_action ?? null, notes: v.notes ?? null, recorded_by: await currentUserId() };
    const outcome = existing ? await updateAndQueue("follow_up_outcomes", followUpOutcomeStore, existing.localId, payload) : await createAndQueue("follow_up_outcomes", followUpOutcomeStore, payload);
    const followUp = await followUpStore.get(v.follow_up_id);
    if (followUp) await updateAndQueue("follow_ups", followUpStore, followUp.localId, { status: "completed" });
    return { ...localRow(outcome), id: outcome.localId } as FollowUpOutcomeRow;
  }
  const actor = await uid();
  const existing = await getFollowUpOutcome(v.follow_up_id);
  const payload = {
    follow_up_id: v.follow_up_id,
    contact_status: v.contact_status,
    current_condition: v.current_condition ?? null,
    referral_completed: v.referral_completed ?? null,
    care_received: v.care_received ?? null,
    barriers: v.barriers ?? [],
    new_symptoms: v.new_symptoms ?? null,
    recommendations: v.recommendations ?? null,
    next_follow_up_at: v.next_follow_up_at ?? null,
    next_action: v.next_action ?? null,
    notes: v.notes ?? null,
    recorded_by: actor,
  };
  let out: FollowUpOutcomeRow;
  if (existing) {
    const { data, error } = await db
      .from("follow_up_outcomes")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw error;
    out = data as FollowUpOutcomeRow;
  } else {
    const { data, error } = await db
      .from("follow_up_outcomes")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;
    out = data as FollowUpOutcomeRow;
  }
  await db.from("follow_ups").update({ status: "completed" }).eq("id", v.follow_up_id);
  return out;
}

export async function markMissed(id: string): Promise<void> {
  if (isBrowser()) {
    const local = (await followUpStore.get(id)) ?? (await followUpStore.list()).find((row) => row.remoteId === id);
    if (!local) throw new Error("Not found");
    await updateAndQueue("follow_ups", followUpStore, local.localId, { status: "missed" });
    return;
  }
  await db.from("follow_ups").update({ status: "missed" }).eq("id", id);
}
export async function cancelFollowUp(id: string): Promise<void> {
  if (isBrowser()) {
    const local = (await followUpStore.get(id)) ?? (await followUpStore.list()).find((row) => row.remoteId === id);
    if (!local) throw new Error("Not found");
    await updateAndQueue("follow_ups", followUpStore, local.localId, { status: "cancelled" });
    return;
  }
  await db.from("follow_ups").update({ status: "cancelled" }).eq("id", id);
}
