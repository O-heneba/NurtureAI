import { AIError, type AIProvider, type AIRequest, type AIResponse } from "../types";
import { AI_MODEL } from "../model/config";
import { loadModel, isLocalRuntimeSupported } from "../model/model-manager";

function formatPrompt(request: AIRequest): string {
  const messages =
    request.messages ??
    (request.prompt ? [{ role: "user" as const, content: request.prompt }] : []);
  const context = request.context ? `\nContext:\n${request.context}` : "";
  return `${messages.map((message) => `${message.role}: ${message.content}`).join("\n")}\nassistant:${context}`;
}

export class LocalAIProvider implements AIProvider {
  readonly kind = "local" as const;
  readonly modelId = AI_MODEL.id;
  private controller: AbortController | null = null;

  constructor(private readonly modelLoader: typeof loadModel = loadModel) {}

  async initialize(onProgress?: (progress: number) => void): Promise<void> {
    if (!isLocalRuntimeSupported()) {
      throw new AIError("unsupported", "Local AI requires a browser with WebAssembly support.");
    }
    await this.modelLoader(onProgress);
  }

  async isAvailable(): Promise<boolean> {
    return isLocalRuntimeSupported();
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    const signal = request.signal;
    if (signal?.aborted) throw new AIError("cancelled", "AI generation was cancelled.");
    this.controller = new AbortController();
    const abort = () => this.controller?.abort();
    signal?.addEventListener("abort", abort, { once: true });

    try {
      const model = await this.modelLoader();
      const result = await model(formatPrompt(request), {
        max_new_tokens: request.maxTokens ?? 160,
        temperature: request.temperature ?? 0.2,
        do_sample: false,
      });
      if (this.controller.signal.aborted)
        throw new AIError("cancelled", "AI generation was cancelled.");
      const text = result[0]?.generated_text?.split("assistant:").pop()?.trim() ?? "";
      return { text, provider: this.kind, modelId: this.modelId };
    } catch (error) {
      if (error instanceof AIError) throw error;
      throw new AIError("generation-failed", "The local AI model could not generate a response.", {
        cause: error,
      });
    } finally {
      signal?.removeEventListener("abort", abort);
      this.controller = null;
    }
  }

  async stream(request: AIRequest, onToken: (token: string) => void): Promise<void> {
    const response = await this.generate(request);
    for (const token of response.text.split(/(\s+)/)) onToken(token);
  }

  cancel(): void {
    this.controller?.abort();
  }
}
