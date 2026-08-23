import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type RegionRow = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type DistrictRow = {
  id: string;
  name: string;
  region_id: string;
  gps_lat: number | null;
  gps_lng: number | null;
  created_at: string;
  updated_at: string;
};

export type SubDistrictRow = {
  id: string;
  name: string;
  district_id: string;
  created_at: string;
  updated_at: string;
};

export async function listRegions(): Promise<RegionRow[]> {
  const { data, error } = await supabaseAdmin.from("regions").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function createRegion(name: string) {
  const { data, error } = await supabaseAdmin.from("regions").insert({ name }).select("*").single();
  if (error) throw error;
  return data as RegionRow;
}

export async function updateRegion(id: string, name: string) {
  const { data, error } = await supabaseAdmin
    .from("regions")
    .update({ name })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as RegionRow;
}

export async function deleteRegion(id: string) {
  const { error } = await supabaseAdmin.from("regions").delete().eq("id", id);
  if (error) throw error;
  return true;
}

export async function listDistricts(region_id?: string): Promise<DistrictRow[]> {
  const query = supabaseAdmin.from("districts").select("*").order("name");
  const { data, error } = region_id ? await query.eq("region_id", region_id) : await query;
  if (error) throw error;
  return data ?? [];
}

export async function createDistrict(payload: {
  name: string;
  region_id: string;
  gps_lat?: number | null;
  gps_lng?: number | null;
}) {
  const { data, error } = await supabaseAdmin
    .from("districts")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return data as DistrictRow;
}

export async function updateDistrict(
  id: string,
  payload: { name: string; region_id: string; gps_lat?: number | null; gps_lng?: number | null },
) {
  const { data, error } = await supabaseAdmin
    .from("districts")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as DistrictRow;
}

export async function deleteDistrict(id: string) {
  const { error } = await supabaseAdmin.from("districts").delete().eq("id", id);
  if (error) throw error;
  return true;
}

export async function listSubDistricts(district_id?: string): Promise<SubDistrictRow[]> {
  const query = supabaseAdmin.from("sub_districts").select("*").order("name");
  const { data, error } = district_id ? await query.eq("district_id", district_id) : await query;
  if (error) throw error;
  return data ?? [];
}

export async function createSubDistrict(payload: { name: string; district_id: string }) {
  const { data, error } = await supabaseAdmin
    .from("sub_districts")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return data as SubDistrictRow;
}

export async function updateSubDistrict(
  id: string,
  payload: { name: string; district_id: string },
) {
  const { data, error } = await supabaseAdmin
    .from("sub_districts")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as SubDistrictRow;
}

export async function deleteSubDistrict(id: string) {
  const { error } = await supabaseAdmin.from("sub_districts").delete().eq("id", id);
  if (error) throw error;
  return true;
}

const directionRegex = /^([+-]?\d+(?:\.\d+)?)(?:\s*([NSEW]))?$/i;

function parseGpsCoordinate(value: string) {
  if (!value) return null;
  const cleaned = value.replace(/°/g, "").trim();
  const match = cleaned.match(directionRegex);
  if (!match) return null;
  let num = Number(match[1]);
  const direction = match[2]?.toUpperCase();
  if (direction === "S" || direction === "W") num = -Math.abs(num);
  return Number.isNaN(num) ? null : num;
}

export async function seedGeographyFromJson(data: Array<any>) {
  const { data: existingRegions } = await supabaseAdmin.from("regions").select("id, name");
  const { data: existingDistricts } = await supabaseAdmin
    .from("districts")
    .select("id, name, region_id");

  const regionsByName = new Map<string, string>();
  const districtsByKey = new Map<string, string>();
  let added = 0;

  for (const row of existingRegions ?? []) {
    regionsByName.set(String(row.name).trim(), row.id);
  }
  for (const row of existingDistricts ?? []) {
    const key = `${row.region_id}::${String(row.name).trim()}`;
    districtsByKey.set(key, row.id);
  }

  for (const row of data) {
    const regionName = String(row.Region || "").trim();
    const districtName = String(row.District || "").trim();
    const subDistrictsRaw = String(row["Sub-districts / Councils"] || "").trim();
    const gpsLat = parseGpsCoordinate(String(row["GPS Latitude"] || ""));
    const gpsLng = parseGpsCoordinate(String(row["GPS Longitude"] || ""));

    if (!regionName || !districtName) continue;

    let regionId = regionsByName.get(regionName);
    if (!regionId) {
      const { data: region, error: regionError } = await supabaseAdmin
        .from("regions")
        .insert({ name: regionName })
        .select("id")
        .single();
      if (regionError) throw regionError;
      if (!region) throw new Error("Failed to create region");
      regionId = region.id;
      regionsByName.set(regionName, regionId);
      added += 1;
    }

    const districtKey = `${regionId}::${districtName}`;
    let districtId = districtsByKey.get(districtKey);
    if (!districtId) {
      const { data: district, error: districtError } = await supabaseAdmin
        .from("districts")
        .insert({ name: districtName, region_id: regionId, gps_lat: gpsLat, gps_lng: gpsLng })
        .select("id")
        .single();
      if (districtError) throw districtError;
      if (!district) throw new Error("Failed to create district");
      districtId = district.id;
      districtsByKey.set(districtKey, districtId);
      added += 1;
    }

    const subDistrictNames = subDistrictsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    for (const subDistrictName of subDistrictNames) {
      const { data: existing, error: existingError } = await supabaseAdmin
        .from("sub_districts")
        .select("id")
        .eq("district_id", districtId)
        .eq("name", subDistrictName)
        .limit(1)
        .maybeSingle();
      if (existingError) throw existingError;
      if (existing) continue;
      const { error } = await supabaseAdmin
        .from("sub_districts")
        .insert({ name: subDistrictName, district_id: districtId });
      if (error) throw error;
      added += 1;
    }
  }

  return added;
}
