export type CommunityMetricCommunity = {
  id: string;
  name: string;
  district?: string | null;
  region?: string | null;
  sub_district?: string | null;
  chps_zone?: string | null;
  status?: string | null;
};

export type CommunityMetricHousehold = {
  id: string;
  community_id?: string | null;
};

export type CommunityMetricPerson = {
  id: string;
  household_id?: string | null;
  profile_types?: string[] | null;
  date_of_birth?: string | null;
};

export function summarizeCommunityMetrics(
  communities: CommunityMetricCommunity[],
  households: CommunityMetricHousehold[],
  persons: CommunityMetricPerson[],
) {
  const householdMap = new Map<string, number>();
  const personMap = new Map<string, number>();
  const pregnantMap = new Map<string, number>();
  const under5Map = new Map<string, number>();

  for (const household of households) {
    if (!household.community_id) continue;
    householdMap.set(household.community_id, (householdMap.get(household.community_id) ?? 0) + 1);
  }

  const today = new Date();
  for (const person of persons) {
    const householdId = person.household_id;
    if (!householdId) continue;
    const communityId = households.find((household) => household.id === householdId)?.community_id;
    if (!communityId) continue;

    personMap.set(communityId, (personMap.get(communityId) ?? 0) + 1);

    const profileTypes = Array.isArray(person.profile_types) ? person.profile_types : [];
    if (profileTypes.includes("Maternal") || profileTypes.includes("Pregnant")) {
      pregnantMap.set(communityId, (pregnantMap.get(communityId) ?? 0) + 1);
    }

    if (person.date_of_birth) {
      const dob = new Date(person.date_of_birth);
      if (!Number.isNaN(dob.getTime())) {
        const age = today.getFullYear() - dob.getFullYear();
        if (age < 5) {
          under5Map.set(communityId, (under5Map.get(communityId) ?? 0) + 1);
        }
      }
    }
  }

  return communities.map((community) => ({
    ...community,
    id: community.id,
    name: community.name,
    district: community.district ?? null,
    region: community.region ?? null,
    chpsZone: community.chps_zone ?? null,
    worker: null,
    status: community.status ?? null,
    peopleRegistered: personMap.get(community.id) ?? 0,
    households: householdMap.get(community.id) ?? 0,
    pregnant: pregnantMap.get(community.id) ?? 0,
    under5: under5Map.get(community.id) ?? 0,
    subDistrict: community.sub_district ?? null,
  }));
}
