import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type AuthServerContext = {
  supabase: typeof supabaseAdmin;
  userId: string;
  claims: Record<string, unknown>;
};

const authProtected = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]);
const authProtectedGet = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]);

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

// ===== COMMUNITIES =====
export const fetchCommunities = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin.from("communities").select("*").order("name");
  if (error) throw error;
  return data ?? [];
});

export const fetchCommunityById = createServerFn({ method: "GET" }).handler(
  async ({ data: id }) => {
    const { data, error } = await supabaseAdmin
      .from("communities")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  },
);

export const createCommunity = authProtected.handler(async ({ data: payload, context }) => {
  const supabase = context.supabase as AuthServerContext["supabase"];
  const { data: user, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user.user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("communities")
    .insert({
      ...payload,
      created_by: user.user.id,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
});

export const fetchRegions = authProtectedGet.handler(async () => {
  const admin = await import("./admin.geography.server");
  return admin.listRegions();
});

export const createRegion = authProtected.handler(async ({ data: payload, context }) => {
  const supabase = context.supabase as AuthServerContext["supabase"];
  await requireAdministrator(supabase);
  const admin = await import("./admin.geography.server");
  return admin.createRegion(payload.name);
});

export const updateRegion = authProtected.handler(async ({ data: payload, context }) => {
  const supabase = context.supabase as AuthServerContext["supabase"];
  await requireAdministrator(supabase);
  const admin = await import("./admin.geography.server");
  return admin.updateRegion(payload.id, payload.name);
});

export const deleteRegion = authProtected.handler(async ({ data: payload, context }) => {
  const supabase = context.supabase as AuthServerContext["supabase"];
  await requireAdministrator(supabase);
  const admin = await import("./admin.geography.server");
  return admin.deleteRegion(payload.id);
});

export const fetchDistricts = createServerFn({ method: "GET" }).handler(
  async ({ data: region_id }) => {
    const admin = await import("./admin.geography.server");
    return admin.listDistricts(region_id);
  },
);

export const createDistrict = authProtected.handler(async ({ data: payload, context }) => {
  const supabase = context.supabase as AuthServerContext["supabase"];
  await requireAdministrator(supabase);
  const admin = await import("./admin.geography.server");
  return admin.createDistrict(payload);
});

export const updateDistrict = authProtected.handler(async ({ data: payload, context }) => {
  const supabase = context.supabase as AuthServerContext["supabase"];
  await requireAdministrator(supabase);
  const admin = await import("./admin.geography.server");
  return admin.updateDistrict(payload.id, payload);
});

export const deleteDistrict = authProtected.handler(async ({ data: payload, context }) => {
  const supabase = context.supabase as AuthServerContext["supabase"];
  await requireAdministrator(supabase);
  const admin = await import("./admin.geography.server");
  return admin.deleteDistrict(payload.id);
});

export const fetchSubDistricts = createServerFn({ method: "GET" }).handler(
  async ({ data: district_id }) => {
    const admin = await import("./admin.geography.server");
    return admin.listSubDistricts(district_id);
  },
);

export const createSubDistrict = authProtected.handler(async ({ data: payload, context }) => {
  const supabase = context.supabase as AuthServerContext["supabase"];
  await requireAdministrator(supabase);
  const admin = await import("./admin.geography.server");
  return admin.createSubDistrict(payload);
});

export const updateSubDistrict = authProtected.handler(async ({ data: payload, context }) => {
  const supabase = context.supabase as AuthServerContext["supabase"];
  await requireAdministrator(supabase);
  const admin = await import("./admin.geography.server");
  return admin.updateSubDistrict(payload.id, payload);
});

export const deleteSubDistrict = authProtected.handler(async ({ data: payload, context }) => {
  const supabase = context.supabase as AuthServerContext["supabase"];
  await requireAdministrator(supabase);
  const admin = await import("./admin.geography.server");
  return admin.deleteSubDistrict(payload.id);
});

export const seedGeography = authProtected.handler(async ({ context }) => {
  const supabase = context.supabase as AuthServerContext["supabase"];
  await requireAdministrator(supabase);
  const admin = await import("./admin.geography.server");
  const geoCommunities = (await import("../../data/northern-ghana-communities.json"))
    .default as Array<any>;
  return admin.seedGeographyFromJson(geoCommunities);
});

export const listProfilesWithRoles = authProtectedGet.handler(async ({ context }) => {
  const supabase = context.supabase as AuthServerContext["supabase"];
  await requireAdministrator(supabase);
  const admin = await import("./admin.users.server");
  return admin.listProfilesWithRoles();
});

export const assignRole = authProtected.handler(async ({ data: payload, context }) => {
  const supabase = context.supabase as AuthServerContext["supabase"];
  await requireAdministrator(supabase);
  const admin = await import("./admin.users.server");
  return admin.assignRole(payload.user_id, payload.role);
});

export const removeRole = authProtected.handler(async ({ data: payload, context }) => {
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
  .middleware([requireSupabaseAuth])
  .handler(async ({ data: id, context }) => {
    const supabase = context.supabase as AuthServerContext["supabase"];
    const { data, error } = await supabase.from("households").select("*").eq("id", id).single();
    if (error) throw error;
    return data;
  });

export const fetchHouseholdsByCommunity = createServerFn({ method: "GET" })
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

export const createHousehold = authProtected.handler(async ({ data: payload, context }) => {
  const supabase = context.supabase as AuthServerContext["supabase"];
  const { data: user, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user.user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("households")
    .insert({
      ...payload,
      created_by: user.user.id,
    })
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
  .middleware([requireSupabaseAuth])
  .handler(async ({ data: id, context }) => {
    const supabase = context.supabase as AuthServerContext["supabase"];
    const { data, error } = await supabase.from("persons").select("*").eq("id", id).single();
    if (error) throw error;
    return data;
  });

export const fetchPersonsByHousehold = createServerFn({ method: "GET" })
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

export const createPerson = authProtected.handler(async ({ data: payload, context }) => {
  const supabase = context.supabase as AuthServerContext["supabase"];
  const { data: user, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user.user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("persons")
    .insert({
      ...payload,
      created_by: user.user.id,
    })
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
  .middleware([requireSupabaseAuth])
  .handler(async ({ data: id, context }) => {
    const supabase = context.supabase as AuthServerContext["supabase"];
    const { data, error } = await supabase.from("assessments").select("*").eq("id", id).single();
    if (error) throw error;
    return data;
  });

export const createAssessment = authProtected.handler(async ({ data: payload, context }) => {
  const supabase = context.supabase as AuthServerContext["supabase"];
  const { data: user, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user.user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("assessments")
    .insert({
      ...payload,
      created_by: user.user.id,
    })
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
  .middleware([requireSupabaseAuth])
  .handler(async ({ data: id, context }) => {
    const supabase = context.supabase as AuthServerContext["supabase"];
    const { data, error } = await supabase.from("referrals").select("*").eq("id", id).single();
    if (error) throw error;
    return data;
  });

export const createReferral = authProtected.handler(async ({ data: payload, context }) => {
  const supabase = context.supabase as AuthServerContext["supabase"];
  const { data: user, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user.user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("referrals")
    .insert({
      ...payload,
      created_by: user.user.id,
    })
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
  .middleware([requireSupabaseAuth])
  .handler(async ({ data: id, context }) => {
    const supabase = context.supabase as AuthServerContext["supabase"];
    const { data, error } = await supabase.from("follow_ups").select("*").eq("id", id).single();
    if (error) throw error;
    return data;
  });

export const createFollowUp = authProtected.handler(async ({ data: payload, context }) => {
  const supabase = context.supabase as AuthServerContext["supabase"];
  const { data: user, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user.user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("follow_ups")
    .insert({
      ...payload,
      created_by: user.user.id,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
});
