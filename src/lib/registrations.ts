import { supabase } from "@/integrations/supabase/client";

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
  status?: string;
  notes?: string;
}) {
  const created_by = await uid();
  const { data, error } = await db
    .from("pregnancies")
    .insert({ ...v, created_by })
    .select("id")
    .single();
  if (error) throw error;
  return data as { id: string };
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
  const { data, error } = await db
    .from("pregnancies")
    .select("id, person_id, lmp_date, edd_date, anc_visits, status, notes, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function getPregnancy(id: string): Promise<{
  id: string;
  person_id: string;
  lmp_date: string | null;
  edd_date: string | null;
  anc_visits: number | null;
  gravida: number | null;
  parity: number | null;
  status: string | null;
  notes: string | null;
} | null> {
  const { data, error } = await db
    .from("pregnancies")
    .select("id, person_id, lmp_date, edd_date, anc_visits, gravida, parity, status, notes")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function insertChild(v: {
  person_id: string;
  mother_person_id?: string;
  birth_weight_kg?: number;
  immunizations?: unknown;
  growth_notes?: string;
}) {
  const created_by = await uid();
  const { data, error } = await db
    .from("child_profiles")
    .insert({ ...v, created_by })
    .select("id")
    .single();
  if (error) throw error;
  return data as { id: string };
}

export async function getChildProfile(id: string): Promise<{
  id: string;
  person_id: string;
  mother_person_id: string | null;
  birth_weight_kg: number | null;
  immunizations: string[] | null;
  growth_notes: string | null;
} | null> {
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
  const { data, error } = await db
    .from("communities")
    .select(
      "id, name, community_code, region, district, sub_district, chps_zone, chps_facility_id, supervisor_id, nearest_referral_facility_id, gps_lat, gps_lng, location_desc, primary_languages, common_health_challenges, accessibility, notes, status",
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
  const created_by = await uid();
  const { data, error } = await db
    .from("communities")
    .insert({ ...v, created_by })
    .select("id")
    .single();
  if (error) throw error;
  return data as { id: string };
}
