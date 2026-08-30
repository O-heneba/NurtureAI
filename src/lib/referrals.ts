import { supabase } from "@/integrations/supabase/client";
import { referralOutcomeStore, referralStatusHistoryStore, referralStore } from "@/lib/storage/local-store";
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

export type Urgency = "routine" | "priority" | "urgent" | "emergency";
export type ReferralStatus =
  | "draft"
  | "submitted"
  | "acknowledged"
  | "accepted"
  | "in_progress"
  | "completed"
  | "declined"
  | "cancelled"
  | "pending";

export interface FacilityRow {
  id: string;
  name: string;
  type: string;
  region: string | null;
  district: string | null;
  sub_district: string | null;
  contact_phone: string | null;
  services: string[];
  address: string | null;
}

export interface ReferralRow {
  id: string;
  person_id: string | null;
  assessment_id: string | null;
  facility: string | null;
  facility_id: string | null;
  reason: string | null;
  category: string | null;
  symptoms: string | null;
  findings: string | null;
  requested_service: string | null;
  urgency: Urgency;
  status: ReferralStatus;
  follow_up_required: boolean;
  submitted_at: string | null;
  acknowledged_at: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReferralOutcome {
  id: string;
  referral_id: string;
  seen: boolean | null;
  attended_at: string | null;
  facility_attended: string | null;
  service_received: string | null;
  outcome: string | null;
  further_action_required: boolean;
  barrier: string | null;
  notes: string | null;
}

async function localReferralId(id: string): Promise<string> {
  const local = (await referralStore.get(id)) ?? (await referralStore.getByRemoteId(id));
  return local?.localId ?? id;
}

export async function listFacilities(): Promise<FacilityRow[]> {
  const { data, error } = await db.from("facilities").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function listReferrals(filter?: {
  status?: ReferralStatus | "all";
  urgency?: Urgency | "all";
  person_id?: string;
}): Promise<ReferralRow[]> {
  if (isBrowser()) {
    let local = await referralStore.list();
    local = local.filter((row) => row.syncStatus !== "deleted");
    if (filter?.person_id) local = local.filter((row) => row.person_id === filter.person_id);
    if (filter?.status && filter.status !== "all") local = local.filter((row) => row.status === filter.status);
    if (filter?.urgency && filter.urgency !== "all") local = local.filter((row) => row.urgency === filter.urgency);
    if (local.length || isOffline()) return local.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 200).map((row) => localRow(row) as ReferralRow);
  }
  let q = db.from("referrals").select("*").order("created_at", { ascending: false }).limit(200);
  if (filter?.status && filter.status !== "all") q = q.eq("status", filter.status);
  if (filter?.urgency && filter.urgency !== "all") q = q.eq("urgency", filter.urgency);
  if (filter?.person_id) q = q.eq("person_id", filter.person_id);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getReferral(id: string): Promise<ReferralRow | null> {
  if (isBrowser()) {
    const local = (await referralStore.get(id)) ?? (await referralStore.getByRemoteId(id));
    if (local) return localRow(local) as ReferralRow;
    if (isOffline()) return null;
  }
  const { data, error } = await db.from("referrals").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function listReferralHistory(referral_id: string) {
  if (isBrowser()) {
    const local = await referralStatusHistoryStore.listByReferral(await localReferralId(referral_id));
    if (local.length || isOffline()) return local.map((row) => ({ id: row.remoteId ?? row.localId, from_status: row.from_status, to_status: row.to_status, note: row.note, at: row.at, actor: row.actor }));
  }
  const { data, error } = await db
    .from("referral_status_history")
    .select("*")
    .eq("referral_id", referral_id)
    .order("at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Array<{
    id: string;
    from_status: string | null;
    to_status: string;
    note: string | null;
    at: string;
    actor: string | null;
  }>;
}

export async function getReferralOutcome(referral_id: string): Promise<ReferralOutcome | null> {
  if (isBrowser()) {
    const local = await referralOutcomeStore.getByReferral(await localReferralId(referral_id));
    if (local) return { ...local, id: local.remoteId ?? local.localId } as ReferralOutcome;
    if (isOffline()) return null;
  }
  const { data, error } = await db
    .from("referral_outcomes")
    .select("*")
    .eq("referral_id", referral_id)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function createReferral(v: {
  person_id: string;
  assessment_id?: string | null;
  facility_id?: string | null;
  facility?: string | null;
  category?: string;
  reason: string;
  symptoms?: string;
  findings?: string;
  requested_service?: string;
  urgency: Urgency;
  follow_up_required?: boolean;
  submit?: boolean;
}): Promise<ReferralRow> {
  if (isBrowser()) {
    const actor = await currentUserId();
    const status: ReferralStatus = v.submit ? "submitted" : "draft";
    const record = await createAndQueue("referrals", referralStore, {
      person_id: v.person_id,
      assessment_id: v.assessment_id ?? null,
      facility_id: v.facility_id ?? null,
      facility: v.facility ?? null,
      category: v.category ?? null,
      reason: v.reason,
      symptoms: v.symptoms ?? null,
      findings: v.findings ?? null,
      requested_service: v.requested_service ?? null,
      urgency: v.urgency,
      status,
      follow_up_required: v.follow_up_required ?? true,
      submitted_at: v.submit ? new Date().toISOString() : null,
      created_by: actor,
    });
    await createAndQueue("referral_status_history", referralStatusHistoryStore, { referral_id: record.localId, from_status: null, to_status: status, note: v.submit ? "Referral submitted" : "Referral drafted", actor, at: new Date().toISOString() });
    return localRow(record) as ReferralRow;
  }
  const actor = await uid();
  const now = new Date().toISOString();
  const status: ReferralStatus = v.submit ? "submitted" : "draft";
  const payload = {
    person_id: v.person_id,
    assessment_id: v.assessment_id ?? null,
    facility_id: v.facility_id ?? null,
    facility: v.facility ?? null,
    category: v.category ?? null,
    reason: v.reason,
    symptoms: v.symptoms ?? null,
    findings: v.findings ?? null,
    requested_service: v.requested_service ?? null,
    urgency: v.urgency,
    status,
    follow_up_required: v.follow_up_required ?? true,
    submitted_at: v.submit ? now : null,
    created_by: actor,
  };
  const { data, error } = await db.from("referrals").insert(payload).select("*").single();
  if (error) throw error;
  await db.from("referral_status_history").insert({
    referral_id: data.id,
    from_status: null,
    to_status: status,
    actor,
    note: v.submit ? "Referral submitted" : "Referral drafted",    at: now,  });
  return data as ReferralRow;
}

export async function updateReferralStatus(
  id: string,
  to: ReferralStatus,
  note?: string,
): Promise<ReferralRow> {
  if (isBrowser()) {
    const cur = await getReferral(id);
    if (!cur) throw new Error("Not found");
    const local = (await referralStore.get(id)) ?? (await referralStore.getByRemoteId(id));
    if (!local) throw new Error("Local record not found");
    const patch: Record<string, unknown> = { status: to };
    const now = new Date().toISOString();
    if (to === "submitted" && !cur.submitted_at) patch.submitted_at = now;
    if (to === "acknowledged" && !cur.acknowledged_at) patch.acknowledged_at = now;
    if (to === "completed" && !cur.completed_at) patch.completed_at = now;
    const updated = await updateAndQueue("referrals", referralStore, local.localId, patch);
    await createAndQueue("referral_status_history", referralStatusHistoryStore, { referral_id: local.localId, from_status: cur.status, to_status: to, note: note ?? null, actor: await currentUserId(), at: now });
    return localRow(updated) as ReferralRow;
  }
  const actor = await uid();
  const cur = await getReferral(id);
  if (!cur) throw new Error("Not found");
  const patch: Record<string, unknown> = { status: to };
  const now = new Date().toISOString();
  if (to === "submitted" && !cur.submitted_at) patch.submitted_at = now;
  if (to === "acknowledged" && !cur.acknowledged_at) patch.acknowledged_at = now;
  if (to === "completed" && !cur.completed_at) patch.completed_at = now;
  const { data, error } = await db
    .from("referrals")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  await db.from("referral_status_history").insert({
    referral_id: id,
    from_status: cur.status,
    to_status: to,
    actor,
    note: note ?? null,
    at: now,
  });
  return data as ReferralRow;
}

export async function recordReferralOutcome(v: {
  referral_id: string;
  seen: boolean;
  attended_at?: string;
  facility_attended?: string;
  service_received?: string;
  outcome?: string;
  further_action_required?: boolean;
  barrier?: string;
  notes?: string;
}): Promise<ReferralOutcome> {
  if (isBrowser()) {
    const localReferral = await localReferralId(v.referral_id);
    const existing = await referralOutcomeStore.getByReferral(localReferral);
    const payload = { ...v, referral_id: localReferral, attended_at: v.attended_at ?? null, facility_attended: v.facility_attended ?? null, service_received: v.service_received ?? null, outcome: v.outcome ?? null, further_action_required: v.further_action_required ?? false, barrier: v.barrier ?? null, notes: v.notes ?? null, recorded_by: await currentUserId() };
    const local = existing ? await updateAndQueue("referral_outcomes", referralOutcomeStore, existing.localId, payload) : await createAndQueue("referral_outcomes", referralOutcomeStore, { ...payload, referral_id: localReferral });
    if (!local) throw new Error("Referral outcome not found");
    return { ...localRow(local), id: local.localId } as ReferralOutcome;
  }
  const actor = await uid();
  const existing = await getReferralOutcome(v.referral_id);
  const payload = {
    referral_id: v.referral_id,
    seen: v.seen,
    attended_at: v.attended_at ?? null,
    facility_attended: v.facility_attended ?? null,
    service_received: v.service_received ?? null,
    outcome: v.outcome ?? null,
    further_action_required: v.further_action_required ?? false,
    barrier: v.barrier ?? null,
    notes: v.notes ?? null,
    recorded_by: actor,
  };
  if (existing) {
    const { data, error } = await db
      .from("referral_outcomes")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw error;
    return data as ReferralOutcome;
  }
  const { data, error } = await db.from("referral_outcomes").insert(payload).select("*").single();
  if (error) throw error;
  return data as ReferralOutcome;
}
