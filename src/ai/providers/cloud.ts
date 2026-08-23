import { AIError, type AIProvider, type AIRequest, type AIResponse } from "../types";

export type CloudGenerate = (request: AIRequest) => Promise<string>;

/** Adapter for a server-side API proxy. Secrets must stay behind this callback. */
export class CloudAIProvider implements AIProvider {
  readonly kind = "cloud" as const;
  readonly modelId: string;

  constructor(
    private readonly generateWithServer: CloudGenerate,
    modelId = "configured-server-model",
  ) {
    this.modelId = modelId;
  }

  async initialize(): Promise<void> {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      throw new AIError("offline", "The cloud AI provider is unavailable while offline.");
    }
  }

  async isAvailable(): Promise<boolean> {
    return typeof navigator === "undefined" || navigator.onLine;
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    try {
      return {
        text: await this.generateWithServer(request),
        provider: this.kind,
        modelId: this.modelId,
      };
    } catch (error) {
      if (error instanceof AIError) throw error;
      throw new AIError("generation-failed", "The cloud AI request failed.", { cause: error });
    }
  }

  async stream(request: AIRequest, onToken: (token: string) => void): Promise<void> {
    const response = await this.generate(request);
    response.text.split(/(\s+)/).forEach(onToken);
  }

  cancel(): void {
    // Server cancellation depends on the proxy's request implementation.
  }
}
