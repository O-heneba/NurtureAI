import { describe, expect, it } from "vitest";
import {
  communityIssueLabel,
  buildCommunityIssueSignals,
  normalizeCommunityIssue,
  summarizeHouseholdIssues,
} from "./community-issues";

describe("community issue taxonomy", () => {
  it("maps legacy barrier descriptions to shared issue categories", () => {
    expect(normalizeCommunityIssue("Transport")).toBe("healthcare_access");
    expect(normalizeCommunityIssue("cost of medication")).toBe("financial_hardship");
    expect(normalizeCommunityIssue("ANC follow-up")).toBe("fragmented_follow_up");
    expect(normalizeCommunityIssue("referral follow-up")).toBe("fragmented_follow_up");
    expect(normalizeCommunityIssue("disrespectful maternal care")).toBe(
      "disrespectful_maternal_care",
    );
    expect(communityIssueLabel("unmapped barrier description")).toBe(
      "Other reported concern: unmapped barrier description",
    );
  });

  it("counts each affected household once and keeps its drill-down record", () => {
    const summary = summarizeHouseholdIssues([
      {
        id: "house-1",
        head_name: "Ama",
        house_no: "A1",
        barriers: ["healthcare_access", "Transport", "cost of medication"],
      },
      {
        id: "house-2",
        head_name: "Kojo",
        house_no: "A2",
        barriers: ["healthcare_access"],
      },
      {
        id: "house-3",
        head_name: "Musa",
        house_no: "A3",
        barriers: [],
      },
    ]);

    expect(summary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "healthcare_access",
          householdCount: 2,
          households: expect.arrayContaining([
            expect.objectContaining({ id: "house-1" }),
            expect.objectContaining({ id: "house-2" }),
          ]),
        }),
        expect.objectContaining({
          id: "financial_hardship",
          householdCount: 1,
          households: [expect.objectContaining({ id: "house-1" })],
        }),
      ]),
    );
  });

  it("rolls person assessment concerns into the household without double-counting it", () => {
    const summary = summarizeHouseholdIssues(
      [
        { id: "house-1", head_name: "Ama", house_no: "A1", barriers: [] },
        { id: "house-2", head_name: "Kojo", house_no: "A2", barriers: [] },
      ],
      [
        { household_id: "house-1", context_issues: ["financial_hardship"] },
        { household_id: "house-1", context_issues: ["financial_hardship"] },
        { household_id: "house-2", context_issues: ["financial_hardship"] },
        { household_id: null, context_issues: ["healthcare_access"] },
      ],
    );

    expect(summary).toContainEqual(
      expect.objectContaining({
        id: "financial_hardship",
        householdCount: 2,
      }),
    );
    expect(summary).not.toContainEqual(expect.objectContaining({ id: "healthcare_access" }));
  });

  it("builds per-community issue signals without leaking household reports across communities", () => {
    const signals = buildCommunityIssueSignals(
      [
        { id: "community-1", common_health_challenges: ["financial_hardship"] },
        { id: "community-2", common_health_challenges: [] },
      ],
      [
        {
          id: "house-1",
          head_name: "Ama",
          house_no: "A1",
          community_id: "community-1",
          barriers: [],
        },
        {
          id: "house-2",
          head_name: "Kojo",
          house_no: "A2",
          community_id: "community-2",
          barriers: [],
        },
      ],
      [{ household_id: "house-2", context_issues: ["healthcare_access"] }],
    );

    expect(signals[0].issues).toContainEqual(
      expect.objectContaining({
        id: "financial_hardship",
        communityReported: true,
        householdCount: 0,
      }),
    );
    expect(signals[0].issues).not.toContainEqual(
      expect.objectContaining({ id: "healthcare_access" }),
    );
    expect(signals[1].issues).toContainEqual(
      expect.objectContaining({
        id: "healthcare_access",
        householdCount: 1,
      }),
    );
  });
});
