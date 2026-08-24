import { supabase } from "@/integrations/supabase/client";
import { childProfileStore, communityStore, householdStore, pregnancyStore, personStore } from "@/lib/storage/local-store";
import { db as localDb } from "@/lib/storage/db";
import { createAndQueue, currentUserId, isBrowser, isOffline, localRow, updateAndQueue } from "@/lib/storage/local-first";

// Types are pending regeneration; cast the client for now.
const db = supabase as unknown as {
  from: (t: string) => any;
  auth: { getUser: () => Promise<{ data: { user: { id: string } | null } }> };
};

async function uid(): Promise<string> {
  const { data } = await db.auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}

export async function listCommunities(): Promise<Array<{ id: string; name: string }>> {
  if (isBrowser()) {
    const local = await communityStore.list();
    if (!isOffline()) {
      try {
        const { data, error } = await db.from("communities").select("*").order("name");
        if (!error) {
          for (const row of data ?? []) {
            const existing = await communityStore.getByRemoteId(row.id);
            if (existing && ["pending", "failed", "conflict", "deleted"].includes(existing.syncStatus)) continue;
            await localDb.communities.put({
              ...row,
              localId: existing?.localId ?? row.id,
              remoteId: row.id,
              syncStatus: "synced",
              createdAt: row.created_at,
              updatedAt: row.updated_at,
              lastSyncedAt: new Date().toISOString(),
              syncError: null,
              version: existing?.version ?? 1,
            });
          }
        }
      } catch {
        // Keep locally persisted communities when the remote refresh is unavailable.
      }
    }
    return (await communityStore.list())
      .filter((row) => row.syncStatus !== "deleted")
      .map((row) => ({ id: row.remoteId ?? row.localId, name: row.name }));
  }
  const { data, error } = await db.from("communities").select("id, name").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function listHouseholds(): Promise<
  Array<{
    id: string;
    head_name: string;
    house_no: string;
    community_id: string | null;
    address: string | null;
    phone: string | null;
  }>
> {
  if (isBrowser()) {
    const local = await householdStore.list();
    if (local.length || isOffline()) return local.filter((row) => row.syncStatus !== "deleted").map((row) => ({ ...localRow(row), id: row.remoteId ?? row.localId })) as any;
  }
  const { data, error } = await db
    .from("households")
    .select("id, head_name, house_no, community_id, address, phone")
    .order("head_name");
  if (error) throw error;
  return data ?? [];
}

export async function listPersons(): Promise<
  Array<{
    id: string;
    full_name: string;
    sex: string | null;
    date_of_birth: string | null;
    household_id: string | null;
    phone: string | null;
    profile_types: string[] | null;
    priority_status: string | null;
    notes: string | null;
  }>
> {
  if (isBrowser()) {
    const local = await personStore.list();
    if (local.length || isOffline()) return local.filter((row) => row.syncStatus !== "deleted").map((row) => ({ ...localRow(row), id: row.remoteId ?? row.localId })) as any;
  }
  const { data, error } = await db
    .from("persons")
    .select(
      "id, full_name, sex, date_of_birth, household_id, phone, profile_types, priority_status, notes",
    )
    .order("full_name");
  if (error) throw error;
  return data ?? [];
}

export async function listPersonsFull(): Promise<any[]> {
  const { data, error } = await db.from("persons").select("*").order("full_name");
  if (error) throw error;
  return data ?? [];
}

export async function listPersonsByIds(ids: string[]): Promise<any[]> {
  if (ids.length === 0) return [];
  if (isBrowser()) {
    const local = (await personStore.list()).filter((row) => ids.includes(row.localId) || (row.remoteId ? ids.includes(row.remoteId) : false));
    if (isOffline() || local.length >= ids.length) {
      return local.filter((row) => row.syncStatus !== "deleted").map((row) => ({ ...localRow(row), id: row.remoteId ?? row.localId }));
    }
    const { data, error } = await db.from("persons").select("*").in("id", ids);
    if (!error) {
      const localRemoteIds = new Set(local.map((row) => row.remoteId ?? row.localId));
      return [
        ...local.filter((row) => row.syncStatus !== "deleted").map((row) => ({ ...localRow(row), id: row.remoteId ?? row.localId })),
        ...(data ?? []).filter((row: any) => !localRemoteIds.has(row.id)),
      ];
    }
  }
  const { data, error } = await db.from("persons").select("*").in("id", ids);
  if (error) throw error;
  return data ?? [];
}

export async function insertHousehold(v: {
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
  barriers?: string;
  priority_status?: string;
  draft?: boolean;
}) {
  const created_by = await uid();
  const { data, error } = await db
    .from("households")
    .insert({ ...v, created_by })
    .select("id")
    .single();
  if (error) throw error;
  return data as { id: string };
}

export async function insertPerson(v: {
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
}) {
  if (isBrowser()) {
    const record = await createAndQueue("persons", personStore, { ...v, created_by: await currentUserId() });
    return { id: record.localId };
  }
  const created_by = await uid();
  const { data, error } = await db
    .from("persons")
    .insert({ ...v, created_by })
    .select("id")
    .single();
  if (error) throw error;
  return data as { id: string };
}

export async function getPerson(id: string): Promise<{
  id: string;
  household_id: string | null;
  full_name: string;
  sex: string | null;
  date_of_birth: string | null;
  phone: string | null;
  notes: string | null;
  marital_status?: string | null;
  occupation?: string | null;
  education?: string | null;
  disability_status?: string | null;
  profile_types?: string[] | null;
  priority_status?: string | null;
} | null> {
  if (isBrowser()) {
    const local = (await personStore.get(id)) ?? (await personStore.getByRemoteId(id));
    if (local) return { ...localRow(local), id: local.remoteId ?? local.localId } as any;
    if (isOffline()) return null;
  }
  const { data, error } = await db.from("persons").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function listPersonsByHousehold(householdId: string): Promise<
  Array<{
    id: string;
    household_id: string | null;
    full_name: string;
    sex: string | null;
    date_of_birth: string | null;
    phone: string | null;
    notes: string | null;
  }>
> {
  const { data, error } = await db
    .from("persons")
    .select("id, household_id, full_name, sex, date_of_birth, phone, notes")
    .eq("household_id", householdId)
    .order("full_name");
  if (error) throw error;
  return data ?? [];
}

export async function insertPregnancy(v: {
  person_id: string;
  lmp_date?: string;
  edd_date?: string;
  gravida?: number;
  parity?: number;
  anc_visits?: number;
  gestation_weeks?: number | null;
  blood_pressure?: string | null;
  weight_kg?: number | null;
  status?: string;
  notes?: string;
}) {
  if (isBrowser()) {
    const record = await createAndQueue("pregnancies", pregnancyStore, { ...v, created_by: await currentUserId() });
    return { id: record.localId };
  }
  const created_by = await uid();
  const { data, error } = await db
    .from("pregnancies")
    .insert({ ...v, created_by })
    .select("id")
    .single();
  if (error) throw error;
  return data as { id: string };
}

export async function updatePregnancy(localId: string, updates: Partial<{
  lmp_date: string | null;
  edd_date: string | null;
  gravida: number | null;
  parity: number | null;
  anc_visits: number | null;
  status: string | null;
  notes: string | null;
}>): Promise<any> {
  if (!isBrowser()) throw new Error("Pregnancy updates require a browser");
  return localRow(await updateAndQueue("pregnancies", pregnancyStore, localId, updates as Record<string, unknown>));
}

export async function listPregnancies(): Promise<
  Array<{
    id: string;
    person_id: string;
    lmp_date: string | null;
    edd_date: string | null;
    anc_visits: number | null;
    status: string | null;
    notes: string | null;
    created_at: string;
  }>
> {
  if (isBrowser()) {
    const local = await pregnancyStore.list();
    if (local.length || isOffline()) {
      return local.filter((row) => row.syncStatus !== "deleted").map(localRow) as any;
    }
  }
  const { data, error } = await db
    .from("pregnancies")
    .select("id, person_id, lmp_date, edd_date, anc_visits, status, notes, created_at, gestation_weeks, blood_pressure, weight_kg")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function listPregnanciesForPerson(personId: string) {
  if (isBrowser()) {
    const local = await pregnancyStore.listByPerson(personId);
    if (local.length || isOffline()) {
      return local.filter((row) => row.syncStatus !== "deleted").map(localRow);
    }
  }
  const { data, error } = await db
    .from("pregnancies")
    .select("id, person_id, lmp_date, edd_date, gravida, parity, anc_visits, status, notes, created_at, gestation_weeks, blood_pressure, weight_kg")
    .eq("person_id", personId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getPregnancy(id: string): Promise<{
  id: string;
  person_id: string;
  lmp_date: string | null;
  edd_date: string | null;
  anc_visits: number | null;
  gestation_weeks: number | null;
  blood_pressure: string | null;
  weight_kg: number | null;
  created_at: string;
  gravida: number | null;
  parity: number | null;
  status: string | null;
  notes: string | null;
} | null> {
  if (isBrowser()) {
    const local =
      (await pregnancyStore.get(id)) ??
      (await pregnancyStore.getByRemoteId(id)) ??
      (await pregnancyStore.list()).find((row) => row.localId === id || row.remoteId === id);
    if (local) return localRow(local) as any;
    if (isOffline()) return null;
  }
  const { data, error } = await db
    .from("pregnancies")
    .select("id, person_id, lmp_date, edd_date, anc_visits, gravida, parity, status, notes, created_at, gestation_weeks, blood_pressure, weight_kg")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (data) return data;
  const { data: matches, error: listError } = await db
    .from("pregnancies")
    .select("id, person_id, lmp_date, edd_date, anc_visits, gravida, parity, status, notes, created_at, gestation_weeks, blood_pressure, weight_kg")
    .limit(200);
  if (listError) throw listError;
  return (matches ?? []).find((row: { id: string }) => row.id === id) ?? null;
}

export async function insertChild(v: {
  person_id: string;
  mother_person_id?: string;
  birth_weight_kg?: number;
  immunizations?: unknown;
  growth_notes?: string;
}) {
  if (isBrowser()) {
    const record = await createAndQueue("child_profiles", childProfileStore, { ...v, created_by: await currentUserId() });
    return { id: record.localId };
  }
  const created_by = await uid();
  const { data, error } = await db
    .from("child_profiles")
    .insert({ ...v, created_by })
    .select("id")
    .single();
  if (error) throw error;
  return data as { id: string };
}

export async function updateChildProfile(localId: string, updates: Partial<{
  birth_weight_kg: number | null;
  immunizations: unknown;
  growth_notes: string | null;
  mother_person_id: string | null;
}>): Promise<any> {
  if (!isBrowser()) throw new Error("Child profile updates require a browser");
  return localRow(await updateAndQueue("child_profiles", childProfileStore, localId, updates as Record<string, unknown>));
}

export async function getChildProfile(id: string): Promise<{
  id: string;
  person_id: string;
  mother_person_id: string | null;
  birth_weight_kg: number | null;
  immunizations: string[] | null;
  growth_notes: string | null;
} | null> {
  if (isBrowser()) {
    const local = (await childProfileStore.get(id)) ?? (await childProfileStore.getByRemoteId(id));
    if (local) return localRow(local) as any;
    if (isOffline()) return null;
  }
  const { data, error } = await db
    .from("child_profiles")
    .select("id, person_id, mother_person_id, birth_weight_kg, immunizations, growth_notes")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function listChildProfiles(): Promise<
  Array<{
    id: string;
    person_id: string;
    mother_person_id: string | null;
    birth_weight_kg: number | null;
    immunizations: string[] | null;
    growth_notes: string | null;
    created_at: string;
  }>
> {
  if (isBrowser()) {
    const local = await childProfileStore.list();
    if (!isOffline()) {
      try {
        const { data, error } = await db
          .from("child_profiles")
          .select("id, person_id, mother_person_id, birth_weight_kg, immunizations, growth_notes, created_at")
          .order("created_at", { ascending: false })
          .limit(200);
        if (!error) {
          for (const row of data ?? []) {
            const existing = await childProfileStore.getByRemoteId(row.id);
            if (existing && ["pending", "failed", "conflict", "deleted"].includes(existing.syncStatus)) continue;
            await localDb.child_profiles.put({
              ...row,
              localId: existing?.localId ?? row.id,
              remoteId: row.id,
              syncStatus: "synced",
              createdAt: row.created_at,
              updatedAt: row.updated_at ?? row.created_at,
              lastSyncedAt: new Date().toISOString(),
              syncError: null,
              version: existing?.version ?? 1,
            });
          }
        }
      } catch {
        // Keep locally persisted child records when the remote refresh is unavailable.
      }
    }
    const refreshed = await childProfileStore.list();
    if (refreshed.length || isOffline()) return refreshed.filter((row) => row.syncStatus !== "deleted").map(localRow) as any;
  }
  const { data, error } = await db
    .from("child_profiles")
    .select(
      "id, person_id, mother_person_id, birth_weight_kg, immunizations, growth_notes, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function listHouseholdsByCommunity(communityId: string): Promise<
  Array<{
    id: string;
    head_name: string;
    house_no: string;
    phone: string | null;
    address: string | null;
    community_id: string | null;
    notes: string | null;
  }>
> {
  const { data, error } = await db
    .from("households")
    .select("id, head_name, house_no, phone, address, community_id, notes")
    .eq("community_id", communityId)
    .order("head_name");
  if (error) throw error;
  return data ?? [];
}

export async function getHousehold(id: string): Promise<{
  id: string;
  community_id: string | null;
  head_name: string;
  house_no: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
} | null> {
  const { data, error } = await db
    .from("households")
    .select("id, community_id, head_name, house_no, phone, address, notes")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function getCommunity(id: string): Promise<{
  id: string;
  name: string;
  community_code: string | null;
  region: string | null;
  district: string | null;
  sub_district: string | null;
  chps_zone: string | null;
  chps_facility_id: string | null;
  supervisor_id: string | null;
  nearest_referral_facility_id: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  location_desc: string | null;
  primary_languages: string[] | null;
  common_health_challenges: string[] | null;
  accessibility: string | null;
  notes: string | null;
  status: string | null;
} | null> {
  if (isBrowser()) {
    const local = (await communityStore.get(id)) ?? (await communityStore.getByRemoteId(id));
    if (local) return { ...localRow(local), id: local.remoteId ?? local.localId } as any;
    if (isOffline()) return null;
  }
  const { data, error } = await db
    .from("communities")
    .select(
      "id, name, community_code, region, district, sub_district, chps_zone, chps_facility_id, supervisor_id, nearest_referral_facility_id, gps_lat, gps_lng, location_desc, primary_languages, common_health_challenges, accessibility, status",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function insertCommunity(v: {
  name: string;
  community_code?: string | null;
  region?: string | null;
  district?: string | null;
  sub_district?: string | null;
  chps_zone?: string | null;
  chps_facility_id?: string | null;
  supervisor_id?: string | null;
  nearest_referral_facility_id?: string | null;
  gps_lat?: number | null;
  gps_lng?: number | null;
  location_desc?: string | null;
  primary_languages?: string[] | null;
  common_health_challenges?: string[] | null;
  accessibility?: string | null;
  notes?: string | null;
  status?: string | null;
}) {
  if (isBrowser()) {
    const record = await createAndQueue("communities", communityStore, {
      ...v,
      created_by: await currentUserId(),
    });
    return { id: record.localId };
  }
  const created_by = await uid();
  const { data, error } = await db
    .from("communities")
    .insert({
      name: v.name,
      community_code: v.community_code,
      region: v.region,
      district: v.district,
      sub_district: v.sub_district,
      chps_zone: v.chps_zone,
      chps_facility_id: v.chps_facility_id,
      supervisor_id: v.supervisor_id,
      nearest_referral_facility_id: v.nearest_referral_facility_id,
      gps_lat: v.gps_lat,
      gps_lng: v.gps_lng,
      location_desc: v.location_desc,
      primary_languages: v.primary_languages,
      common_health_challenges: v.common_health_challenges,
      accessibility: v.accessibility,
      status: v.status,
      created_by,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data as { id: string };
}
