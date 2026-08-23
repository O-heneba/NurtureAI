import { useEffect, useState } from "react";
import { aiService } from "../service";
import type { AIRequest, AIResponse, AIState } from "../types";

export function useAI() {
  const [state, setState] = useState<AIState>(() => aiService.getState());

  useEffect(() => aiService.subscribe(setState), []);

  return {
    ...state,
    isReady: state.status === "ready",
    isLoading: state.status === "checking" || state.status === "loading",
    initialize: () => aiService.initialize(),
    isAvailable: () => aiService.isAvailable(),
    generate: (request: AIRequest): Promise<AIResponse> => aiService.generate(request),
    stream: (request: AIRequest, onToken: (token: string) => void) =>
      aiService.stream(request, onToken),
    cancel: () => aiService.cancel(),
  };
}
