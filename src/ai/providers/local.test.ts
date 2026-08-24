import { describe, expect, it, vi } from "vitest";
import { LocalAIProvider } from "./local";
import { AIError } from "../types";

describe("local AI provider", () => {
  it("invokes the loaded local model and returns generated text", async () => {
    const model = vi.fn(async (prompt: string) => [{ generated_text: `${prompt} assistant: local result` }]);
    const provider = new LocalAIProvider(async () => model);

    const result = await provider.generate({ prompt: "Review this assessment." });

    expect(model).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ text: "local result", provider: "local" });
  });

  it("returns a controlled provider error when local inference fails", async () => {
    const provider = new LocalAIProvider(async () => {
      throw new Error("memory limit");
    });

    await expect(provider.generate({ prompt: "Review this assessment." })).rejects.toMatchObject({
      code: "generation-failed",
    } satisfies Partial<AIError>);
  });
});