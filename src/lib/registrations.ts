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

export async function listHouseholds(): Promise<Array<{ id: string; head_name: string; house_no: string }>> {
  const { data, error } = await db.from("households").select("id, head_name, house_no").order("head_name");
  if (error) throw error;
  return data ?? [];
}

export async function listPersons(): Promise<Array<{ id: string; full_name: string; sex: string | null }>> {
  const { data, error } = await db.from("persons").select("id, full_name, sex").order("full_name");
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
}) {
  const created_by = await uid();
  const { data, error } = await db.from("households").insert({ ...v, created_by }).select("id").single();
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
}) {
  const created_by = await uid();
  const { data, error } = await db.from("persons").insert({ ...v, created_by }).select("id").single();
  if (error) throw error;
  return data as { id: string };
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
  const { data, error } = await db.from("pregnancies").insert({ ...v, created_by }).select("id").single();
  if (error) throw error;
  return data as { id: string };
}

export async function insertChild(v: {
  person_id: string;
  mother_person_id?: string;
  birth_weight_kg?: number;
  immunizations?: unknown;
  growth_notes?: string;
}) {
  const created_by = await uid();
  const { data, error } = await db.from("child_profiles").insert({ ...v, created_by }).select("id").single();
  if (error) throw error;
  return data as { id: string };
}
