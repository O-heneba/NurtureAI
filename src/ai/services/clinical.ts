import { aiService } from "../service";
import type { AIResponse } from "../types";
import { preserveRulesPriority } from "@/lib/ai-safety";

export type ClinicalAssessmentInput = {
  assessment_type: string;
  person: Record<string, unknown>;
  danger_signs: string[];
  sections: Record<string, unknown>;
  rules: { priority: string; flags: unknown[]; missing: string[] };
  previous?: Record<string, unknown>;
};

function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export function shouldUseLocalAI(input: { offline: boolean; localReady: boolean }): boolean {
  return input.offline || input.localReady;
}

export function localAssessmentPrompt(data: ClinicalAssessmentInput): string {
  return [
    "Review this community-health assessment as AI decision support.",
    "Do not diagnose or prescribe. Do not change the rules-based priority.",
    "Return concise JSON with summary, contributing_factors, missing_information, recommended_next_steps, follow_up_suggestion, referral_consideration, nutrition_guidance, and uncertainty_notice.",
    "Only use facts present in the assessment. Identify missing information instead of guessing.",
    JSON.stringify(data),
  ].join("\n\n");
}

export function parseLocalResponse(response: AIResponse, data: ClinicalAssessmentInput) {
  const raw = response.text.trim();
  const ruleMessages = data.rules.flags
    .map((flag) => {
      if (!flag || typeof flag !== "object" || !("message" in flag)) return "";
      const message = (flag as { message?: unknown }).message;
      return typeof message === "string" ? message : "";
    })
    .filter(Boolean);
  const safeNextSteps = (priority: string) =>
    priority === "urgent"
      ? [
          "Seek urgent professional clinical assessment now.",
          "Do not delay referral if danger signs are present.",
        ]
      : priority === "priority_review"
        ? [
            "Arrange prompt professional clinical review.",
            "Follow up actively and escalate if symptoms worsen.",
          ]
        : priority === "monitor"
          ? [
              "Continue care with active monitoring.",
              "Schedule follow-up according to local protocol.",
            ]
          : ["Continue routine care."];
  try {
    const cleaned = raw.replace(/^```(?:json)?\s*|\s*```$/g, "");
    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}");
    const parsed = JSON.parse(
      jsonStart >= 0 && jsonEnd > jsonStart ? cleaned.slice(jsonStart, jsonEnd + 1) : cleaned,
    );
    const preserved = preserveRulesPriority(parsed, data.rules.priority as any);
    const modelSteps = Array.isArray(preserved.recommended_next_steps)
      ? preserved.recommended_next_steps
      : [];
    return {
      ...preserved,
      recommended_next_steps:
        data.rules.priority === "routine"
          ? modelSteps
          : modelSteps.length > 0 &&
              !modelSteps.some((step: unknown) => /routine care/i.test(String(step)))
            ? modelSteps
            : safeNextSteps(data.rules.priority),
      provider: response.provider,
      model_id: response.modelId,
      sources: response.sources,
    };
  } catch {
    const rulesSummary = ruleMessages.length
      ? `The rules engine prioritised this assessment as ${data.rules.priority} because ${ruleMessages.join("; ")}`
      : `The rules engine prioritised this assessment as ${data.rules.priority}.`;
    return {
      summary: rulesSummary,
      contributing_factors: ruleMessages,
      missing_information: data.rules.missing,
      recommended_next_steps: safeNextSteps(data.rules.priority),
      follow_up_suggestion: "",
      referral_consideration: "",
      nutrition_guidance: "",
      uncertainty_notice:
        "The local model returned unstructured guidance. A qualified health worker must review it against the rules-based priority.",
      priority_level: data.rules.priority,
      provider: response.provider,
      model_id: response.modelId,
      sources: response.sources,
    };
  }
}

async function analyzeWithSelectedProvider(data: ClinicalAssessmentInput) {
  const response = await aiService.generate({
    prompt: localAssessmentPrompt(data),
    maxTokens: 240,
    temperature: 0.1,
    responseFormat: "json",
  });
  return parseLocalResponse(response, data);
}

/** Uses cloud first online, local only offline, and preserves rules priority in either path. */
export function useClinicalAI() {
  return async ({ data }: { data: ClinicalAssessmentInput }) => {
    return analyzeWithSelectedProvider(data);
  };
}
