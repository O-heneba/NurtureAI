import { AIError, type AIMessage, type AIProvider, type AIRequest, type AIService, type AIState } from "./types";
import { AI_MODEL } from "./model/config";
import { LocalAIProvider } from "./providers/local";
import { CloudAIProvider } from "./providers/cloud";
import { generateAI } from "@/lib/ai.functions";
import { isModelCached } from "./model/model-manager";

const MAX_RECENT_MESSAGES = 8;
const MAX_MESSAGE_CHARS = 900;

function compactChatHistory(messages: AIMessage[]): AIMessage[] {
  return messages
    .slice(-MAX_RECENT_MESSAGES)
    .map((message) => ({
      ...message,
      content: message.content.slice(0, MAX_MESSAGE_CHARS).trim(),
    }))
    .filter((message) => message.content.length > 0);
}

function requestMessages(request: AIRequest) {
  const messages = request.messages ?? (request.prompt ? [{ role: "user" as const, content: request.prompt }] : []);
  return compactChatHistory(messages);
}

export function createAIService(localOverride?: AIProvider, cloudOverride?: AIProvider): AIService {
  const legacySingleProvider = Boolean(localOverride && !cloudOverride);
  const localProvider = localOverride ?? new LocalAIProvider();
  const cloudProvider =
    cloudOverride ??
    (localOverride
      ? localProvider
      : new CloudAIProvider(async (request) => {
          const result = await generateAI({
            data: {
              messages: requestMessages(request),
              responseFormat: request.responseFormat ?? "text",
            },
          });
          return result.reply;
        }, "gemini-2.5-flash"));
  let state: AIState = {
    status: "uninitialized",
    provider: "cloud",
    modelId: cloudProvider.modelId,
    progress: 0,
    isOnline: true,
    error: null,
    cloudFallback: false,
    localAvailable: false,
  };
  let localInitialized = false;
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
        const online = typeof navigator === "undefined" || navigator.onLine;
        const selected = legacySingleProvider
          ? localProvider
          : online
            ? cloudProvider
            : localProvider;
        if (!(await selected.isAvailable()))
          throw new AIError("unsupported", "This device cannot run the selected AI provider.");
        await selected.initialize((progress) => setState({ status: "loading", progress }));
        if (selected === localProvider) localInitialized = true;
        setState({
          status: "ready",
          provider: selected.kind,
          modelId: selected.modelId,
          progress: 100,
          localAvailable: localInitialized || (await isModelCached()),
        });
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
    isAvailable: async () => {
      const online = typeof navigator === "undefined" || navigator.onLine;
      return online ? cloudProvider.isAvailable() : localProvider.isAvailable();
    },
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async generate(request) {
      if (legacySingleProvider) {
        if (state.status !== "ready") await this.initialize();
        const response = await localProvider.generate(request);
        setState({
          provider: response.provider,
          modelId: response.modelId,
          status: "ready",
          error: null,
        });
        return response;
      }
      const online = typeof navigator === "undefined" || navigator.onLine;
      if (!online) {
        const localReady = localInitialized || (await isModelCached());
        if (!localReady) {
          throw new AIError(
            "model-unavailable",
            "Offline AI must be downloaded while connected to the internet.",
          );
        }
        try {
          const response = await localProvider.generate(request);
          setState({
            provider: "local",
            modelId: localProvider.modelId,
            cloudFallback: false,
            localAvailable: true,
            status: "ready",
            error: null,
          });
          return response;
        } catch (error) {
          throw error instanceof AIError
            ? error
            : new AIError("generation-failed", "Offline AI could not generate a response.", {
                cause: error,
              });
        }
      }

      try {
        const response = await cloudProvider.generate(request);
        setState({
          provider: "cloud",
          modelId: cloudProvider.modelId,
          cloudFallback: false,
          status: "ready",
          error: null,
        });
        return response;
      } catch (cloudError) {
        const localReady = localInitialized || (await isModelCached());
        const localAvailable = await localProvider.isAvailable();
        setState({ localAvailable: localReady || localAvailable });
        if (!localAvailable) {
          throw cloudError instanceof AIError
            ? cloudError
            : new AIError(
                "provider-unavailable",
                "Cloud AI is unavailable and local AI is not ready.",
                { cause: cloudError },
              );
        }
        try {
          if (!localInitialized) {
            await localProvider.initialize();
            localInitialized = true;
          }
          const response = await localProvider.generate(request);
          setState({
            provider: "local",
            modelId: localProvider.modelId,
            cloudFallback: true,
            status: "ready",
            error: null,
            localAvailable: true,
          });
          return response;
        } catch (localError) {
          throw new AIError(
            "provider-unavailable",
            "Cloud AI failed and Offline AI could not generate a response.",
            { cause: localError },
          );
        }
      }
    },
    async stream(request, onToken) {
      const response = await this.generate(request);
      for (const token of response.text.split(/(\s+)/)) onToken(token);
    },
    cancel: () => {
      if (!legacySingleProvider) cloudProvider.cancel();
      localProvider.cancel();
    },
  };
}

export const aiService = createAIService();
export { AI_MODEL };
