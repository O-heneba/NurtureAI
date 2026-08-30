export type ChildHealthRecord = {
  id: string;
  person_id: string;
  mother_person_id: string | null;
  birth_weight_kg: number | null;
  immunizations: string[] | null;
  growth_notes: string | null;
  created_at: string;
};

export type ChildHealthPerson = {
  id: string;
  full_name?: string | null;
  sex?: string | null;
  date_of_birth?: string | null;
  profile_types?: string[] | null;
  createdAt?: string | null;
  created_at?: string | null;
};

export function deriveChildHealthRows(
  childProfiles: ChildHealthRecord[],
  persons: ChildHealthPerson[],
): ChildHealthRecord[] {
  const knownPersonIds = new Set(childProfiles.map((child) => child.person_id));

  return [
    ...childProfiles,
    ...persons
      .filter(
        (person) =>
          Array.isArray(person.profile_types) &&
          person.profile_types.includes("Child Health") &&
          !knownPersonIds.has(person.id),
      )
      .map((person) => ({
        id: person.id,
        person_id: person.id,
        mother_person_id: null,
        birth_weight_kg: null,
        immunizations: [],
        growth_notes: null,
        created_at: person.createdAt ?? person.created_at ?? new Date().toISOString(),
      })),
  ];
}
