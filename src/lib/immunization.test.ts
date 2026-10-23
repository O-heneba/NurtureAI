import { describe, expect, it, vi } from "vitest";
import {
  calculateAgeInDays,
  calculateAgeInMonths,
  calculateAgeInWeeks,
  DEFAULT_IMMUNIZATION_SCHEDULE,
  evaluateImmunizationStatus,
  formatChildAge,
  getImmunizationScheduleForAge,
  resolveScheduleIdForInsert,
} from "@/lib/immunization";

describe("child age helpers", () => {
  it("formats age strings for newborns through toddlers", () => {
    expect(calculateAgeInDays("2026-09-01")).toBeGreaterThanOrEqual(0);
    expect(calculateAgeInWeeks("2026-08-01")).toBeGreaterThan(0);
    expect(calculateAgeInMonths("2026-02-01")).toBeGreaterThan(0);
    expect(formatChildAge("2026-08-01")).toMatch(/weeks|months|years/i);
  });

  it("returns the expected age breakdown for a reference child", () => {
    const dob = "2026-01-01";
    expect(calculateAgeInDays(dob)).toBeGreaterThan(0);
    expect(calculateAgeInWeeks(dob)).toBeGreaterThan(0);
    expect(calculateAgeInMonths(dob)).toBeGreaterThan(0);
  });
});

describe("immunization status logic", () => {
  it("resolves a legacy schedule key to the database UUID before insert", async () => {
    const fakeClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: "7a1b8c2d-9a8a-4df6-8f7e-7fd9d03d90e1" },
              error: null,
            }),
          }),
        }),
      }),
    };

    const resolved = await resolveScheduleIdForInsert(fakeClient as any, {
      schedule_id: "bcg",
      vaccine_code: "BCG",
    });

    expect(resolved).toBe("7a1b8c2d-9a8a-4df6-8f7e-7fd9d03d90e1");
    expect(fakeClient.from).toHaveBeenCalledWith("immunization_schedule");
  });

  it("never falls back to a legacy key for the UUID schedule column", async () => {
    const fakeClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: new Error("schedule unavailable") }),
          }),
        }),
      }),
    };

    await expect(
      resolveScheduleIdForInsert(fakeClient as any, { schedule_id: "bcg", vaccine_code: "BCG" }),
    ).resolves.toBeNull();
  });

  it("marks a birth dose as received and identifies the overdue next vaccine", () => {
    const dob = "2026-01-01";
    const result = evaluateImmunizationStatus({
      dob,
      asOfDate: "2026-02-15",
      schedule: DEFAULT_IMMUNIZATION_SCHEDULE,
      records: [
        { child_id: "child-1", schedule_id: "bcg", vaccine_code: "BCG", administered_date: "2026-01-01", source: "registration_history" },
      ],
    });

    expect(result.overallStatus).toBe("overdue");
    expect(result.nextMilestone).toBeDefined();
    expect(result.nextDueDate).toBeDefined();
    expect(result.numberReceived).toBe(1);
    expect(result.numberOverdue).toBeGreaterThanOrEqual(1);
  });

  it("exposes the next routine vaccination due date for a child on schedule", () => {
    const result = evaluateImmunizationStatus({
      dob: "2026-09-01",
      asOfDate: "2026-09-01",
      schedule: DEFAULT_IMMUNIZATION_SCHEDULE,
      records: [
        { child_id: "child-1", schedule_id: "bcg", vaccine_code: "BCG", administered_date: "2026-09-01", source: "registration_history" },
        { child_id: "child-1", schedule_id: "opv0", vaccine_code: "OPV0", administered_date: "2026-09-01", source: "registration_history" },
        { child_id: "child-1", schedule_id: "hepb_birth", vaccine_code: "HEPB_BIRTH", administered_date: "2026-09-01", source: "registration_history" },
      ],
    });

    expect(result.nextMilestone).toBe("6 Weeks");
    expect(result.nextDueDate).toBe("2026-10-13");
  });

  it("flags the child as up to date when all age-appropriate vaccines are recorded", () => {
    const dob = "2026-01-01";
    const schedule = DEFAULT_IMMUNIZATION_SCHEDULE.filter(
      (item: (typeof DEFAULT_IMMUNIZATION_SCHEDULE)[number]) => item.recommended_age_days <= 120,
    );
    const result = evaluateImmunizationStatus({
      dob,
      asOfDate: "2026-05-01",
      schedule,
      records: schedule.map((item: (typeof DEFAULT_IMMUNIZATION_SCHEDULE)[number]) => ({
        child_id: "child-1",
        schedule_id: item.id,
        vaccine_code: item.vaccine_code,
        administered_date: new Date(Date.parse(dob) + item.recommended_age_days * 86400000 - 86400000).toISOString().slice(0, 10),
        source: "newborn_assessment",
      })),
    });

    expect(result.overallStatus).toBe("up_to_date");
    expect(result.completionPercentage).toBe(100);
  });

  it("shows only vaccines that are age-appropriate for the child’s date of birth", () => {
    const relevant = getImmunizationScheduleForAge({
      dob: "2026-01-01",
      asOfDate: "2026-02-15",
      schedule: DEFAULT_IMMUNIZATION_SCHEDULE,
    });

    expect(relevant.some((item) => item.id === "bcg")).toBe(true);
    expect(relevant.some((item) => item.id === "opv0")).toBe(true);
    expect(relevant.some((item) => item.id === "hepb_birth")).toBe(true);
    expect(relevant.some((item) => item.id === "dpt_hepb_hib_1")).toBe(true);
    expect(relevant.some((item) => item.id === "mr1")).toBe(false);
  });

  it("shows only birth-dose vaccines for a newborn born on the current date", () => {
    const relevant = getImmunizationScheduleForAge({
      dob: "01/09/2026",
      asOfDate: "2026-09-01",
      schedule: DEFAULT_IMMUNIZATION_SCHEDULE,
    });

    expect(relevant.map((item) => item.id)).toEqual(["bcg", "opv0", "hepb_birth"]);
    expect(relevant.some((item) => item.id === "dpt_hepb_hib_1")).toBe(false);
  });
});
