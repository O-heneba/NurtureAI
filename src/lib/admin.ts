import { supabase } from "@/integrations/supabase/client";

export type ProfileWithRoles = {
  id: string;
  full_name: string | null;
  facility: string | null;
  phone: string | null;
  roles: string[];
};

export async function listProfilesWithRoles(): Promise<ProfileWithRoles[]> {
  const [{ data: profiles }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, facility, phone"),
    supabase.from("user_roles").select("user_id, role"),
  ]);

  const roleMap: Record<string, string[]> = {};
  (roles ?? []).forEach((r: any) => {
    if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
    roleMap[r.user_id].push(r.role);
  });

  return (profiles ?? []).map((p: any) => ({
    id: p.id,
    full_name: p.full_name,
    facility: p.facility,
    phone: p.phone,
    roles: roleMap[p.id] ?? [],
  }));
}

export async function assignRole(
  user_id: string,
  role: "chps_worker" | "supervisor" | "administrator",
) {
  const { data, error } = await supabase
    .from("user_roles")
    .insert({ user_id, role })
    .select("id, user_id, role")
    .single();
  if (error) throw error;
  return data;
}

export async function removeRole(user_id: string, role: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .delete()
    .eq("user_id", user_id)
    .eq("role", role);
  if (error) throw error;
  return data;
}
