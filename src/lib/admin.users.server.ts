import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";

export type UserRoleRow = {
  id: string;
  user_id: string;
  role: Database["public"]["Enums"]["app_role"];
  created_at: string;
};

export type ProfileWithRoles = {
  id: string;
  full_name: string | null;
  facility: string | null;
  phone: string | null;
  roles: string[];
};

export async function listProfilesWithRoles(): Promise<ProfileWithRoles[]> {
  const [{ data: profiles, error: profilesError }, { data: roles, error: rolesError }] =
    await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name, facility, phone"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
    ]);

  if (profilesError) throw profilesError;
  if (rolesError) throw rolesError;

  const roleMap = new Map<string, string[]>();
  (roles ?? []).forEach((roleRow: any) => {
    const userRoles = roleMap.get(roleRow.user_id) ?? [];
    userRoles.push(roleRow.role);
    roleMap.set(roleRow.user_id, userRoles);
  });

  return (profiles ?? []).map((profile: any) => ({
    id: profile.id,
    full_name: profile.full_name,
    facility: profile.facility,
    phone: profile.phone,
    roles: roleMap.get(profile.id) ?? [],
  }));
}

export async function assignRole(user_id: string, role: Database["public"]["Enums"]["app_role"]) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .insert({ user_id, role })
    .select("*")
    .single();
  if (error) throw error;
  return data as UserRoleRow;
}

export async function removeRole(user_id: string, role: string) {
  const { error } = await supabaseAdmin
    .from("user_roles")
    .delete()
    .eq("user_id", user_id)
    .eq("role", role);
  if (error) throw error;
  return true;
}
