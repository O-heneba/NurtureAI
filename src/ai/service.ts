import { AIError, type AIProvider, type AIService, type AIState } from "./types";
import { AI_MODEL } from "./model/config";
import { LocalAIProvider } from "./providers/local";

export function createAIService(provider: AIProvider = new LocalAIProvider()): AIService {
  let state: AIState = {
    status: "uninitialized",
    provider: provider.kind,
    modelId: provider.modelId,
    progress: 0,
    isOnline: true,
    error: null,
  };
  const listeners = new Set<(next: AIState) => void>();
  const setState = (next: Partial<AIState>) => {
    state = { ...state, ...next };
    listeners.forEach((listener) => listener(state));
  };

  if (typeof window !== "undefined") {
    window.addEventListener("online", () => setState({ isOnline: true }));
    window.addEventListener("offline", () => setState({ isOnline: false }));
    window.setTimeout(() => setState({ isOnline: navigator.onLine }), 0);
  }

  return {
    async initialize() {
      setState({ status: "checking", error: null });
      try {
        if (!(await provider.isAvailable()))
          throw new AIError("unsupported", "This device cannot run the selected AI provider.");
        await provider.initialize((progress) => setState({ status: "loading", progress }));
        setState({ status: "ready", progress: 100 });
      } catch (error) {
        const aiError =
          error instanceof AIError
            ? error
            : new AIError("load-failed", "AI initialization failed.", { cause: error });
        setState({
          status: aiError.code === "unsupported" ? "unavailable" : "error",
          error: aiError,
        });
        throw aiError;
      }
    },
    isAvailable: () => provider.isAvailable(),
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async generate(request) {
      if (state.status !== "ready") await this.initialize();
      return provider.generate(request);
    },
    async stream(request, onToken) {
      if (state.status !== "ready") await this.initialize();
      return provider.stream(request, onToken);
    },
    cancel: () => provider.cancel(),
  };
}

export const aiService = createAIService();
export { AI_MODEL };
