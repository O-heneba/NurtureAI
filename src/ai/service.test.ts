import { afterEach, describe, expect, it, vi } from "vitest";
import { createAIService } from "./service";
import { AIError, type AIProvider } from "./types";

function provider(overrides: Partial<AIProvider> = {}): AIProvider {
  return {
    kind: "local",
    modelId: "test-model",
    initialize: vi.fn(async () => undefined),
    isAvailable: vi.fn(async () => true),
    generate: vi.fn(async () => ({
      text: "response",
      provider: "local" as const,
      modelId: "test-model",
    })),
    stream: vi.fn(async (_request, onToken) => onToken("response")),
    cancel: vi.fn(),
    ...overrides,
  };
}

function setOnline(value: boolean) {
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { onLine: value },
  });
}

afterEach(() => setOnline(true));

describe("AI service contract", () => {
  it("uses cloud first while online", async () => {
    setOnline(true);
    const local = provider({
      generate: vi.fn(async () => ({
        text: "local",
        provider: "local" as const,
        modelId: "local",
      })),
    });
    const cloud = provider({
      kind: "cloud",
      modelId: "gemini-2.5-flash",
      generate: vi.fn(async () => ({
        text: "cloud",
        provider: "cloud" as const,
        modelId: "gemini-2.5-flash",
      })),
    });
    const service = createAIService(local, cloud);

    const response = await service.generate({ prompt: "hello" });

    expect(response.provider).toBe("cloud");
    expect(cloud.generate).toHaveBeenCalledOnce();
    expect(local.generate).not.toHaveBeenCalled();
  });

  it("falls back to local when online cloud generation fails", async () => {
    setOnline(true);
    const local = provider({
      generate: vi.fn(async () => ({
        text: "local",
        provider: "local" as const,
        modelId: "local",
      })),
    });
    const cloud = provider({
      kind: "cloud",
      generate: vi.fn(async () => Promise.reject(new Error("cloud down"))),
    });
    const service = createAIService(local, cloud);

    const response = await service.generate({ prompt: "hello" });

    expect(response.provider).toBe("local");
    expect(cloud.generate).toHaveBeenCalledOnce();
    expect(local.generate).toHaveBeenCalledOnce();
    expect(service.getState().cloudFallback).toBe(true);
  });

  it("uses local directly offline and never attempts cloud", async () => {
    setOnline(false);
    const local = provider({
      generate: vi.fn(async () => ({
        text: "local",
        provider: "local" as const,
        modelId: "local",
      })),
    });
    const cloud = provider({
      kind: "cloud",
      generate: vi.fn(async () => ({
        text: "cloud",
        provider: "cloud" as const,
        modelId: "cloud",
      })),
    });
    const service = createAIService(local, cloud);
    await service.initialize();

    const response = await service.generate({ prompt: "hello" });

    expect(response.provider).toBe("local");
    expect(local.generate).toHaveBeenCalledOnce();
    expect(cloud.generate).not.toHaveBeenCalled();
  });

  it("returns a download-required error offline without calling cloud", async () => {
    setOnline(false);
    const local = provider();
    const cloud = provider({
      kind: "cloud",
      generate: vi.fn(async () => ({
        text: "cloud",
        provider: "cloud" as const,
        modelId: "cloud",
      })),
    });
    const service = createAIService(local, cloud);

    await expect(service.generate({ prompt: "hello" })).rejects.toMatchObject({
      code: "model-unavailable",
      message: "Offline AI must be downloaded while connected to the internet.",
    });
    expect(cloud.generate).not.toHaveBeenCalled();
  });

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

    await expect(service.initialize()).rejects.toMatchObject({
      code: "unsupported",
    } satisfies Partial<AIError>);
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

  it("does not call cloud when offline even if the local model is unavailable", async () => {
    setOnline(false);
    const local = provider({ isAvailable: vi.fn(async () => false) });
    const cloud = provider({
      kind: "cloud",
      generate: vi.fn(async () => ({
        text: "cloud",
        provider: "cloud" as const,
        modelId: "cloud",
      })),
    });
    const service = createAIService(local, cloud);

    await expect(service.generate({ prompt: "hello" })).rejects.toMatchObject({
      code: "model-unavailable",
    });
    expect(cloud.generate).not.toHaveBeenCalled();
  });
});
