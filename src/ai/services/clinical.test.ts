import { describe, expect, it } from "vitest";
import { parseLocalResponse, localAssessmentPrompt, shouldUseLocalAI } from "./clinical";

const data = {
  assessment_type: "maternal",
  person: { sex: "F", age_display: "24y" },
  danger_signs: [],
  sections: { pregnancy: { gestation_weeks: 20 }, vitals: { blood_pressure: "120/80" } },
  rules: { priority: "urgent", flags: [], missing: ["ANC attendance"] },
};

describe("clinical AI local boundary", () => {
  it("selects local AI offline or when a local model is ready", () => {
    expect(shouldUseLocalAI({ offline: true, localReady: false })).toBe(true);
    expect(shouldUseLocalAI({ offline: false, localReady: true })).toBe(true);
    expect(shouldUseLocalAI({ offline: false, localReady: false })).toBe(false);
  });

  it("keeps the local prompt free of direct identifiers", () => {
    const prompt = localAssessmentPrompt(data);
    expect(prompt).toContain('"gestation_weeks":20');
    expect(prompt).toContain('"priority":"urgent"');
    expect(prompt).not.toContain("full_name");
    expect(prompt).not.toContain("phone");
  });

  it("normalizes a real local response and preserves rules priority", () => {
    const result = parseLocalResponse(
      { text: '{"priority_level":"routine","summary":"Review the assessment."}', provider: "local", modelId: "test-model" },
      data,
    );
    expect(result.priority_level).toBe("urgent");
    expect(result.provider).toBe("local");
  });

  it("keeps malformed model output as clearly marked assistance instead of inventing structure", () => {
    const result = parseLocalResponse(
      { text: "Further review may be warranted.", provider: "local", modelId: "test-model" },
      data,
    );
    expect(result.summary).toBe("Further review may be warranted.");
    expect(result.missing_information).toEqual(["ANC attendance"]);
    expect(result.uncertainty_notice).toContain("unstructured");
  });
});