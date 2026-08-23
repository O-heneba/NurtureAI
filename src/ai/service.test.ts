import { describe, expect, it, vi } from "vitest";
import { createAIService } from "./service";
import { AIError, type AIProvider } from "./types";

function provider(overrides: Partial<AIProvider> = {}): AIProvider {
  return {
    kind: "local",
    modelId: "test-model",
    initialize: vi.fn(async () => undefined),
    isAvailable: vi.fn(async () => true),
    generate: vi.fn(async () => ({ text: "response", provider: "local", modelId: "test-model" })),
    stream: vi.fn(async (_request, onToken) => onToken("response")),
    cancel: vi.fn(),
    ...overrides,
  };
}

describe("AI service contract", () => {
  it("initializes, reports readiness, and generates through the selected provider", async () => {
    const selected = provider();
    const service = createAIService(selected);

    await service.initialize();
    const response = await service.generate({ prompt: "hello" });

    expect(service.getState().status).toBe("ready");
    expect(response.text).toBe("response");
    expect(selected.generate).toHaveBeenCalledWith({ prompt: "hello" });
  });

  it("propagates unavailable-device state without generating", async () => {
    const selected = provider({ isAvailable: vi.fn(async () => false) });
    const service = createAIService(selected);

    await expect(service.initialize()).rejects.toMatchObject<AIError>({ code: "unsupported" });
    expect(service.getState().status).toBe("unavailable");
    expect(selected.generate).not.toHaveBeenCalled();
  });

  it("exposes cancellation and streaming through the provider boundary", async () => {
    const selected = provider();
    const service = createAIService(selected);
    const tokens: string[] = [];

    await service.stream({ prompt: "hello" }, (token) => tokens.push(token));
    service.cancel();

    expect(tokens).toEqual(["response"]);
    expect(selected.cancel).toHaveBeenCalledOnce();
  });

  it("supports provider switching without changing the service API", async () => {
    const cloud = provider({ kind: "cloud", modelId: "server-model" });
    const service = createAIService(cloud);

    await service.initialize();

    expect(service.getState()).toMatchObject({ provider: "cloud", modelId: "server-model" });
  });

  it("preserves provider errors for user-facing handling", async () => {
    const failure = new AIError("generation-failed", "Generation failed");
    const selected = provider({ generate: vi.fn(async () => Promise.reject(failure)) });
    const service = createAIService(selected);

    await expect(service.generate({ prompt: "hello" })).rejects.toBe(failure);
  });
});
