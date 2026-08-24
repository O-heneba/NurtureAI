import { describe, expect, it } from "vitest";
import { preserveRulesPriority } from "./ai-safety";
import { runRules } from "./assessment-engine";

describe("assessment AI safety boundary", () => {
  it.each([
    ["routine", runRules("maternal", {}, [])],
    ["monitor", runRules("nutrition", { food_groups: ["staple", "legume"] }, [])],
    ["priority_review", runRules("maternal", { blood_pressure: "140/90" }, [])],
    ["urgent", runRules("maternal", {}, ["vaginal_bleeding"])],
  ] as const)("preserves the %s rules priority", (expected, rules) => {
    expect(rules.priority).toBe(expected);
    expect(preserveRulesPriority({ priority_level: "routine" }, rules.priority).priority_level).toBe(expected);
  });

  it("never downgrades an urgent rules result", () => {
    const rules = runRules("maternal", {}, ["vaginal_bleeding"]);
    const result = preserveRulesPriority({ priority_level: "routine", summary: "Review" }, rules.priority);

    expect(rules.priority).toBe("urgent");
    expect(result.priority_level).toBe("urgent");
    expect(result.uncertainty_notice).toContain("authoritative");
  });

  it("identifies missing information without inventing values", () => {
    const result = runRules("maternal", {}, []);

    expect(result.priority).toBe("routine");
    expect(result.missing).toEqual(["Blood pressure", "Gestational age", "ANC attendance"]);
  });
});
