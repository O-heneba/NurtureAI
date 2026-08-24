import type { Priority } from "./assessment-engine";

const PRIORITY_ORDER: Priority[] = ["routine", "monitor", "priority_review", "urgent"];

export const AI_UNAVAILABLE_RESULT = {
  unavailable: true,
  message: "AI assistance is currently unavailable. The assessment and rules-based priority are still available.",
  uncertainty_notice: "No AI-assisted review was generated. A qualified health worker must review the assessment.",
} as const;

export function preserveRulesPriority<T extends Record<string, unknown>>(
  result: T,
  rulesPriority: Priority,
): T & { priority_level: Priority; uncertainty_notice?: string } {
  const modelPriority = result.priority_level;
  const modelIndex = typeof modelPriority === "string" ? PRIORITY_ORDER.indexOf(modelPriority as Priority) : -1;
  const rulesIndex = PRIORITY_ORDER.indexOf(rulesPriority);
  const priority_level = PRIORITY_ORDER[Math.max(modelIndex, rulesIndex)];
  const existingNotice = typeof result.uncertainty_notice === "string" ? result.uncertainty_notice : undefined;
  const uncertainty_notice: string | undefined =
    modelIndex >= 0 && modelIndex < rulesIndex
      ? `${existingNotice ? `${existingNotice} ` : ""}The rules-based priority remains ${rulesPriority} and is authoritative.`
      : existingNotice;

  const next = { ...result, priority_level } as T & {
    priority_level: Priority;
    uncertainty_notice?: string;
  };
  if (uncertainty_notice) next.uncertainty_notice = uncertainty_notice;
  return next;
}
