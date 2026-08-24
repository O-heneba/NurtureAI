import { useServerFn } from "@tanstack/react-start";
import { analyzeAssessment } from "@/lib/ai.functions";
import { aiService } from "../service";
import { isModelCached } from "../model/model-manager";
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
  try {
    const parsed = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, ""));
    return {
      ...preserveRulesPriority(parsed, data.rules.priority as any),
      provider: response.provider,
      model_id: response.modelId,
    };
  } catch {
    return {
      summary: raw,
      contributing_factors: data.rules.flags.map((flag: any) => flag.message).filter(Boolean),
      missing_information: data.rules.missing,
      recommended_next_steps: [],
      follow_up_suggestion: "",
      referral_consideration: "",
      nutrition_guidance: "",
      uncertainty_notice: "The local model returned unstructured guidance. A qualified health worker must review it against the rules-based priority.",
      priority_level: data.rules.priority,
      provider: response.provider,
      model_id: response.modelId,
    };
  }
}

async function analyzeLocally(data: ClinicalAssessmentInput) {
  const response = await aiService.generate({ prompt: localAssessmentPrompt(data), maxTokens: 240, temperature: 0.1 });
  return parseLocalResponse(response, data);
}

/** Uses cached local inference first and never calls the cloud provider offline. */
export function useClinicalAI() {
  const analyzeWithCloud = useServerFn(analyzeAssessment);

  return async ({ data }: { data: ClinicalAssessmentInput }) => {
    const localReady = aiService.getState().status === "ready" || (await isModelCached());
    if (shouldUseLocalAI({ offline: isOffline(), localReady })) {
      try {
        return await analyzeLocally(data);
      } catch (error) {
        if (isOffline()) throw error;
      }
    }
    return analyzeWithCloud({ data });
  };
}
