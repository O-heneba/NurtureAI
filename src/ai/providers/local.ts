import {
  AIError,
  type AIProvider,
  type AIRequest,
  type AIResponse,
  type AIMessage,
} from "../types";
import { AI_MODEL } from "../model/config";
import { loadModel, isLocalRuntimeSupported } from "../model/model-manager";
import { searchLocalKnowledge, type KnowledgeResult } from "../services/knowledge";

type KnowledgeSearcher = (query: string, limit?: number) => Promise<KnowledgeResult[]>;

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

const LOCAL_SYSTEM_PROMPT =
  "You are NurtureAI, an offline decision-support assistant for Ghanaian CHPS/community health workers.\n" +
  "You are operating offline. Use supplied reference material as the primary source for factual health guidance.\n" +
  "Do not invent medical facts, diagnose, prescribe medication, or invent patient information. Do not override the deterministic clinical rules engine.\n" +
  "If the reference material is insufficient, say so and recommend checking the applicable Ghana Health Service/Ministry of Health/WHO protocol.\n" +
  "Keep answers concise for a mobile CHPS workflow. This is decision support only and does not replace clinical protocols or professional judgement.";

export function formatLocalKnowledgePrompt(request: AIRequest, results: KnowledgeResult[]): string {
  const messages: AIMessage[] = compactChatHistory(
    request.messages ?? (request.prompt ? [{ role: "user", content: request.prompt }] : []),
  );
  const question = messages.filter((message) => message.role === "user").at(-1)?.content ?? "";
  const references = results.length
    ? results
        .map(
          (result, index) =>
            `[${index + 1}] ${result.title} | ${result.sourceOrganization} | ${result.section ?? "unknown"}${result.pageNumber ? ` | page ${result.pageNumber}` : ""}\n${result.text}`,
        )
        .join("\n\n")
    : "I couldn't find relevant information in the local knowledge base.";
  const extraContext = request.context
    ? `\n\nAdditional local assessment context:\n${request.context}`
    : "";
  return `system: ${LOCAL_SYSTEM_PROMPT}\n\nREFERENCE MATERIAL:\n${references}\n\nUSER QUESTION:\n${question}${extraContext}\nassistant:`;
}

function cleanGeneratedText(generatedText: string, prompt: string): string {
  const withoutPrompt = generatedText.startsWith(prompt)
    ? generatedText.slice(prompt.length)
    : (generatedText.split(/assistant:\s*/i).pop() ?? generatedText);
  const lines = withoutPrompt
    .split(/\r?\n/)
    .map((line) => line.trim())
    .map((line) => line.replace(/^(user|assistant|system)\s*:\s*/i, ""))
    .filter((line) => line && !/^(user question|user query)\s*:?$/i.test(line));
  const cleaned = lines
    .join("\n")
    .replace(/(?:user query:\s*){2,}/gi, "")
    .trim();
  return cleaned || "I couldn't generate a local response.";
}

export class LocalAIProvider implements AIProvider {
  readonly kind = "local" as const;
  readonly modelId = AI_MODEL.id;
  private controller: AbortController | null = null;

  constructor(
    private readonly modelLoader: typeof loadModel = loadModel,
    private readonly knowledgeSearcher: KnowledgeSearcher = searchLocalKnowledge,
  ) {}

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
      const question =
        request.prompt ??
        request.messages?.filter((message) => message.role === "user").at(-1)?.content ??
        "";
      const results = await this.knowledgeSearcher(question);
      const result = await model(formatLocalKnowledgePrompt(request, results), {
        max_new_tokens: request.maxTokens ?? 96,
        temperature: request.temperature ?? 0.2,
        do_sample: false,
      });
      if (this.controller.signal.aborted)
        throw new AIError("cancelled", "AI generation was cancelled.");
      const text = cleanGeneratedText(
        result[0]?.generated_text ?? "",
        formatLocalKnowledgePrompt(request, results),
      );
      return {
        text: results.length
          ? text
          : "I couldn't find relevant information in the local knowledge base.",
        provider: this.kind,
        modelId: this.modelId,
        offline: true,
        sources: results.map((source) => ({
          title: source.title,
          originalFilename: source.originalFilename,
          sourceOrganization: source.sourceOrganization,
          section: source.section,
          pageNumber: source.pageNumber,
        })),
      };
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
