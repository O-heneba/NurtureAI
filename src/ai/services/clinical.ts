import { useServerFn } from "@tanstack/react-start";
import { analyzeAssessment } from "@/lib/ai.functions";

/** Server-backed structured analysis kept separate from local free-form chat. */
export function useClinicalAI() {
  return useServerFn(analyzeAssessment);
}
