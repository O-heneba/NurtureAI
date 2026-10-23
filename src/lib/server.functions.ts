import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import bundledCommunities from "../../data/northern-ghana-community-records.json";

type AuthServerContext = {
  supabase: typeof supabaseAdmin;
  userId: string;
  claims: Record<string, unknown>;
};

const authProtected = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]);
const authProtectedGet = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]);

function assertPayload<T>(input: unknown, label: string): T {
  if (!input || typeof input !== "object") {
    throw new Error(`${label} payload is required`);
  }
  return ("data" in input ? input.data : input) as T;
}

async function requireAdministrator(supabase: AuthServerContext["supabase"]) {
  const { data: user, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user.user) throw new Error("Not authenticated");

  const { data, error } = await supabase.rpc("has_role", {
    _role: "administrator",
    _user_id: user.user.id,
  });

  if (error) throw error;
  if (!data) throw new Error("Unauthorized: administrator role required");
}

type CommunityListRow = {
  id?: string;
  name?: string;
  district?: string | null;
  region?: string | null;
  community_code?: string | null;
  sub_district?: string | null;
  chps_zone?: string | null;
  status?: string | null;
  common_health_challenges?: string[] | null;
};

export function sanitizeCommunityRecords(
  rows: CommunityListRow[] = [],
  fallbackRows: CommunityListRow[] = [],
): CommunityListRow[] {
  const source = rows.length > 0 ? rows : fallbackRows;
  const seen = new Set<string>();

  return source.filter((row) => {
    const name = String(row.name ?? "").trim();
    const district = String(row.district ?? "").trim();
    const region = String(row.region ?? "").trim();
    const communityCode = String(row.community_code ?? "").trim();

    if (!name) return false;

    const districtCode = district
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
    const isLegacy =
      districtCode &&
      (communityCode === districtCode || name.toLowerCase() === district.toLowerCase());

    if (isLegacy) return false;

    const identity = [name, district, region, communityCode]
      .map((value) => String(value ?? "").trim().toLowerCase())
      .join("::");

    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

export const fetchCommunities = authProtectedGet.handler(async ({ context }) => {
  const { data, error } = await context.supabase.from("communities").select("*").order("name");
  const rows = error ? [] : (data ?? []);
  return sanitizeCommunityRecords(rows as CommunityListRow[], bundledCommunities as CommunityListRow[]);
});

export const fetchCommunityById = createServerFn({ method: "GET" })
  .validator((input: unknown) => assertPayload<string>(input, "Community id"))
  .handler(async ({ data: id }) => {
    const { data, error } = await supabaseAdmin
      .from("communities")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  });

export const createCommunity = authProtected
  .validator((input: unknown) => assertPayload<Record<string, unknown>>(input, "Community"))
  .handler(async ({ data: payload, context }) => {
    const supabase = context.supabase as AuthServerContext["supabase"];
    const { data: user, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user.user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("communities")
      .insert({
        ...payload,
        created_by: user.user.id,
      } as any)
      .select()
      .single();
    if (error) throw error;
    return data;
  });

export const fetchRegions = authProtectedGet.handler(async () => {
  const admin = await import("./admin.geography.server");
  return admin.listRegions();
});

export const createRegion = authProtected
  .validator((input: unknown) => assertPayload<{ name: string }>(input, "Region"))
  .handler(async ({ data: payload, context }) => {
    const supabase = context.supabase as AuthServerContext["supabase"];
    await requireAdministrator(supabase);
    const admin = await import("./admin.geography.server");
    return admin.createRegion(payload.name);
  });

export const updateRegion = authProtected
  .validator((input: unknown) => assertPayload<{ id: string; name: string }>(input, "Region"))
  .handler(async ({ data: payload, context }) => {
    const supabase = context.supabase as AuthServerContext["supabase"];
    await requireAdministrator(supabase);
    const admin = await import("./admin.geography.server");
    return admin.updateRegion(payload.id, payload.name);
  });

export const deleteRegion = authProtected
  .validator((input: unknown) => assertPayload<{ id: string }>(input, "Region"))
  .handler(async ({ data: payload, context }) => {
    const supabase = context.supabase as AuthServerContext["supabase"];
    await requireAdministrator(supabase);
    const admin = await import("./admin.geography.server");
    return admin.deleteRegion(payload.id);
  });

export const fetchDistricts = createServerFn({ method: "GET" })
  .validator((input: unknown) => assertPayload<string>(input, "Region id"))
  .handler(async ({ data: region_id }) => {
  const admin = await import("./admin.geography.server");
  return admin.listDistricts(region_id);
  });

export const createDistrict = authProtected
  .validator((input: unknown) =>
    assertPayload<{
      name: string;
      region_id: string;
      gps_lat?: number | null;
      gps_lng?: number | null;
    }>(input, "District"),
  )
  .handler(async ({ data: payload, context }) => {
    const supabase = context.supabase as AuthServerContext["supabase"];
    await requireAdministrator(supabase);
    const admin = await import("./admin.geography.server");
    return admin.createDistrict(payload);
  });

export const updateDistrict = authProtected
  .validator((input: unknown) =>
    assertPayload<{
      id: string;
      name: string;
      region_id: string;
      gps_lat?: number | null;
      gps_lng?: number | null;
    }>(input, "District"),
  )
  .handler(async ({ data: payload, context }) => {
    const supabase = context.supabase as AuthServerContext["supabase"];
    await requireAdministrator(supabase);
    const admin = await import("./admin.geography.server");
    return admin.updateDistrict(payload.id, payload);
  });

export const deleteDistrict = authProtected
  .validator((input: unknown) => assertPayload<{ id: string }>(input, "District"))
  .handler(async ({ data: payload, context }) => {
    const supabase = context.supabase as AuthServerContext["supabase"];
    await requireAdministrator(supabase);
    const admin = await import("./admin.geography.server");
    return admin.deleteDistrict(payload.id);
  });

export const fetchSubDistricts = createServerFn({ method: "GET" })
  .validator((input: unknown) => assertPayload<string>(input, "District id"))
  .handler(async ({ data: district_id }) => {
  const admin = await import("./admin.geography.server");
  return admin.listSubDistricts(district_id);
  });

export const createSubDistrict = authProtected
  .validator((input: unknown) =>
    assertPayload<{ name: string; district_id: string }>(input, "Sub-district"),
  )
  .handler(async ({ data: payload, context }) => {
    const supabase = context.supabase as AuthServerContext["supabase"];
    await requireAdministrator(supabase);
    const admin = await import("./admin.geography.server");
    return admin.createSubDistrict(payload);
  });

export const updateSubDistrict = authProtected
  .validator((input: unknown) =>
    assertPayload<{ id: string; name: string; district_id: string }>(input, "Sub-district"),
  )
  .handler(async ({ data: payload, context }) => {
    const supabase = context.supabase as AuthServerContext["supabase"];
    await requireAdministrator(supabase);
    const admin = await import("./admin.geography.server");
    return admin.updateSubDistrict(payload.id, payload);
  });

export const deleteSubDistrict = authProtected
  .validator((input: unknown) => assertPayload<{ id: string }>(input, "Sub-district"))
  .handler(async ({ data: payload, context }) => {
    const supabase = context.supabase as AuthServerContext["supabase"];
    await requireAdministrator(supabase);
    const admin = await import("./admin.geography.server");
    return admin.deleteSubDistrict(payload.id);
  });

export const seedGeography = authProtected.handler(async ({ context }) => {
  const supabase = context.supabase as AuthServerContext["supabase"];
  await requireAdministrator(supabase);
  const admin = await import("./admin.geography.server");
  const geoCommunities = (await import("../../data/northern-ghana-communities.json")).default as Array<any>;
  return admin.seedGeographyFromJson(geoCommunities);
});

export const seedCommunities = authProtected.handler(async ({ context }) => {
  const supabase = context.supabase as AuthServerContext["supabase"];
  await requireAdministrator(supabase);
  const admin = await import("./admin.geography.server");
  const communities = (await import("../../data/northern-ghana-community-records.json")).default as Array<any>;
  return admin.seedCommunitiesFromJson(communities);
});

export const listProfilesWithRoles = authProtectedGet.handler(async ({ context }) => {
  const supabase = context.supabase as AuthServerContext["supabase"];
  await requireAdministrator(supabase);
  const admin = await import("./admin.users.server");
  return admin.listProfilesWithRoles();
});

export const assignRole = authProtected
  .validator((input: unknown) =>
    assertPayload<{ user_id: string; role: "chps_worker" | "supervisor" | "administrator" }>(
      input,
      "Role assignment",
    ),
  )
  .handler(async ({ data: payload, context }) => {
    const supabase = context.supabase as AuthServerContext["supabase"];
    await requireAdministrator(supabase);
    const admin = await import("./admin.users.server");
    return admin.assignRole(payload.user_id, payload.role);
  });

export const removeRole = authProtected
  .validator((input: unknown) =>
    assertPayload<{ user_id: string; role: "chps_worker" | "supervisor" | "administrator" }>(
      input,
      "Role assignment",
    ),
  )
  .handler(async ({ data: payload, context }) => {
    const supabase = context.supabase as AuthServerContext["supabase"];
    await requireAdministrator(supabase);
    const admin = await import("./admin.users.server");
    return admin.removeRole(payload.user_id, payload.role);
  });

export const fetchHouseholds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as AuthServerContext["supabase"];
    const { data, error } = await supabase.from("households").select("*").order("head_name");
    if (error) throw error;
    return data ?? [];
  });

export const fetchHouseholdById = createServerFn({ method: "GET" })
  .validator((input: unknown) => assertPayload<string>(input, "Household id"))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data: id, context }) => {
    const supabase = context.supabase as AuthServerContext["supabase"];
    const { data, error } = await supabase.from("households").select("*").eq("id", id).single();
    if (error) throw error;
    return data;
  });

export const fetchHouseholdsByCommunity = createServerFn({ method: "GET" })
  .validator((input: unknown) => assertPayload<string>(input, "Community id"))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data: communityId, context }) => {
    const supabase = context.supabase as AuthServerContext["supabase"];
    const { data, error } = await supabase
      .from("households")
      .select("*")
      .eq("community_id", communityId)
      .order("head_name");
    if (error) throw error;
    return data ?? [];
  });

export const createHousehold = authProtected
  .validator((input: unknown) => assertPayload<Record<string, unknown>>(input, "Household"))
  .handler(async ({ data: payload, context }) => {
    const supabase = context.supabase as AuthServerContext["supabase"];
    const { data: user, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user.user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("households")
      .insert({
        ...payload,
        created_by: user.user.id,
      } as any)
      .select()
      .single();
    if (error) throw error;
    return data;
  });

export const fetchPersons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as AuthServerContext["supabase"];
    const { data, error } = await supabase.from("persons").select("*").order("full_name");
    if (error) throw error;
    return data ?? [];
  });

export const fetchPersonById = createServerFn({ method: "GET" })
  .validator((input: unknown) => assertPayload<string>(input, "Person id"))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data: id, context }) => {
    const supabase = context.supabase as AuthServerContext["supabase"];
    const { data, error } = await supabase.from("persons").select("*").eq("id", id).single();
    if (error) throw error;
    return data;
  });

export const fetchPersonsByHousehold = createServerFn({ method: "GET" })
  .validator((input: unknown) => assertPayload<string>(input, "Household id"))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data: householdId, context }) => {
    const supabase = context.supabase as AuthServerContext["supabase"];
    const { data, error } = await supabase
      .from("persons")
      .select("*")
      .eq("household_id", householdId)
      .order("full_name");
    if (error) throw error;
    return data ?? [];
  });

export const createPerson = authProtected
  .validator((input: unknown) => assertPayload<Record<string, unknown>>(input, "Person"))
  .handler(async ({ data: payload, context }) => {
    const supabase = context.supabase as AuthServerContext["supabase"];
    const { data: user, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user.user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("persons")
      .insert({
        ...payload,
        created_by: user.user.id,
      } as any)
      .select()
      .single();
    if (error) throw error;
    return data;
  });

export const fetchAssessments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as AuthServerContext["supabase"];
    const { data, error } = await supabase
      .from("assessments")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const fetchAssessmentById = createServerFn({ method: "GET" })
  .validator((input: unknown) => assertPayload<string>(input, "Assessment id"))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data: id, context }) => {
    const supabase = context.supabase as AuthServerContext["supabase"];
    const { data, error } = await supabase.from("assessments").select("*").eq("id", id).single();
    if (error) throw error;
    return data;
  });

export const createAssessment = authProtected
  .validator((input: unknown) => assertPayload<Record<string, unknown>>(input, "Assessment"))
  .handler(async ({ data: payload, context }) => {
    const supabase = context.supabase as AuthServerContext["supabase"];
    const { data: user, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user.user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("assessments")
      .insert({
        ...payload,
        created_by: user.user.id,
      } as any)
      .select()
      .single();
    if (error) throw error;
    return data;
  });

export const fetchReferrals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as AuthServerContext["supabase"];
    const { data, error } = await supabase
      .from("referrals")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const fetchReferralById = createServerFn({ method: "GET" })
  .validator((input: unknown) => assertPayload<string>(input, "Referral id"))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data: id, context }) => {
    const supabase = context.supabase as AuthServerContext["supabase"];
    const { data, error } = await supabase.from("referrals").select("*").eq("id", id).single();
    if (error) throw error;
    return data;
  });

export const createReferral = authProtected
  .validator((input: unknown) => assertPayload<Record<string, unknown>>(input, "Referral"))
  .handler(async ({ data: payload, context }) => {
    const supabase = context.supabase as AuthServerContext["supabase"];
    const { data: user, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user.user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("referrals")
      .insert({
        ...payload,
        created_by: user.user.id,
      } as any)
      .select()
      .single();
    if (error) throw error;
    return data;
  });

export const fetchFollowUps = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as AuthServerContext["supabase"];
    const { data, error } = await supabase.from("follow_ups").select("*").order("due_date");
    if (error) throw error;
    return data ?? [];
  });

export const fetchFollowUpById = createServerFn({ method: "GET" })
  .validator((input: unknown) => assertPayload<string>(input, "Follow-up id"))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data: id, context }) => {
    const supabase = context.supabase as AuthServerContext["supabase"];
    const { data, error } = await supabase.from("follow_ups").select("*").eq("id", id).single();
    if (error) throw error;
    return data;
  });

export const createFollowUp = authProtected
  .validator((input: unknown) => assertPayload<Record<string, unknown>>(input, "Follow-up"))
  .handler(async ({ data: payload, context }) => {
    const supabase = context.supabase as AuthServerContext["supabase"];
    const { data: user, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user.user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("follow_ups")
      .insert({
        ...payload,
        created_by: user.user.id,
      } as any)
      .select()
      .single();
    if (error) throw error;
    return data;
  });
