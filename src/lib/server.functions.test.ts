import { describe, expect, it } from "vitest";
import { deriveChildHealthRows } from "./child-health";
import { summarizeCommunityMetrics } from "./community-metrics";
import { sanitizeCommunityRecords } from "./server.functions";

describe("community record sanitization", () => {
  it("keeps valid communities and removes legacy duplicates", () => {
    const rows = [
      {
        id: "1",
        name: "Tamale",
        district: "Tamale Metropolitan",
        region: "Northern",
        community_code: "northern_tamale_metropolitan_tamale",
      },
      {
        id: "2",
        name: "Tamale",
        district: "Tamale",
        region: "Northern",
        community_code: "tamale",
      },
      {
        id: "3",
        name: "Yendi",
        district: "Yendi Municipal",
        region: "Northern",
        community_code: "northern_yendi_municipal_yendi",
      },
      {
        id: "4",
        name: "Yendi",
        district: "Yendi Municipal",
        region: "Northern",
        community_code: "northern_yendi_municipal_yendi",
      },
    ];

    expect(sanitizeCommunityRecords(rows)).toHaveLength(2);
    expect(sanitizeCommunityRecords(rows).map((row) => row.name)).toEqual(["Tamale", "Yendi"]);
  });

  it("falls back to bundled community seed when the database is empty", () => {
    const fallback = [{ name: "Aboabo", district: "Tamale Metropolitan", region: "Northern" }];

    expect(sanitizeCommunityRecords([], fallback)).toEqual(fallback);
  });
});

describe("child health record merging", () => {
  it("includes child-type persons with no child profile row", () => {
    const childProfiles = [
      {
        id: "cp-1",
        person_id: "person-1",
        mother_person_id: null,
        birth_weight_kg: 2.8,
        immunizations: ["BCG + OPV0"],
        growth_notes: "Healthy",
        created_at: "2026-02-01T00:00:00.000Z",
      },
    ];

    const persons = [
      {
        id: "person-1",
        profile_types: ["Child Health"],
        createdAt: "2026-02-02T00:00:00.000Z",
      },
      {
        id: "person-2",
        profile_types: ["Child Health"],
        createdAt: "2026-02-03T00:00:00.000Z",
      },
    ];

    const rows = deriveChildHealthRows(childProfiles, persons);
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.person_id)).toEqual(["person-1", "person-2"]);
  });
});

describe("community aggregation", () => {
  it("uses real household and person counts instead of zero values", () => {
    const communities = [
      { id: "c1", name: "Vittin", district: "Tamale Metropolitan", region: "Northern", sub_district: null, chps_zone: "A", status: "active" },
      { id: "c2", name: "Other", district: "Yendi", region: "Northern", sub_district: null, chps_zone: "B", status: "active" },
    ];

    const households = [
      { id: "h1", community_id: "c1", head_name: "Ama", house_no: "1" },
      { id: "h2", community_id: "c1", head_name: "Kojo", house_no: "2" },
      { id: "h3", community_id: "c2", head_name: "Musa", house_no: "3" },
    ];

    const persons = [
      { id: "p1", household_id: "h1", profile_types: ["Maternal"], date_of_birth: "1996-02-01" },
      { id: "p2", household_id: "h1", profile_types: ["Child Health"], date_of_birth: "2023-01-01" },
      { id: "p3", household_id: "h2", profile_types: ["Adult"], date_of_birth: "1989-01-01" },
      { id: "p4", household_id: "h3", profile_types: ["Adult"], date_of_birth: "1975-01-01" },
    ];

    const rows = summarizeCommunityMetrics(communities, households, persons);
    const vittin = rows.find((row) => row.name === "Vittin");

    expect(vittin?.households).toBe(2);
    expect(vittin?.population).toBe(3);
    expect(vittin?.pregnant).toBe(1);
    expect(vittin?.under5).toBe(1);
    expect(vittin?.coverage).toBeGreaterThan(0);
  });
});
