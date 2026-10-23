import { describe, expect, it, vi } from "vitest";
import { formatLocalKnowledgePrompt, LocalAIProvider } from "./local";
import { AIError, type AIMessage } from "../types";

describe("local AI provider", () => {
  it("invokes the loaded local model and returns generated text", async () => {
    const model = vi.fn(async (prompt: string) => [
      { generated_text: `${prompt} assistant: local result` },
    ]);
    const provider = new LocalAIProvider(
      async () => model,
      async () => [
        {
          chunkId: "test-1",
          documentId: "test-document",
          originalFilename: "test.txt",
          title: "Test guidance",
          sourceOrganization: "Test source",
          sourceType: "other",
          authorityLevel: "unknown",
          topic: ["other"],
          section: "Test section",
          text: "Test reference material.",
          keywords: ["test"],
          score: 1,
        },
      ],
    );

    const result = await provider.generate({ prompt: "Review this assessment." });

    expect(model).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ text: "local result", provider: "local" });
  });

  it("keeps the prompt compact by using only the newest user context", () => {
    const conversation: AIMessage[] = Array.from({ length: 15 }, (_, index) => ({
      role: index % 2 === 0 ? "user" : "assistant",
      content: `message-${index}`,
    }));

    const prompt = formatLocalKnowledgePrompt({ messages: conversation }, []);

    expect(prompt).toContain("message-14");
    expect(prompt).not.toContain("message-0");
    expect(prompt).not.toContain("message-13");
  });

  it("returns a controlled provider error when local inference fails", async () => {
    const provider = new LocalAIProvider(
      async () => {
        throw new Error("memory limit");
      },
      async () => [],
    );

    await expect(provider.generate({ prompt: "Review this assessment." })).rejects.toMatchObject({
      code: "generation-failed",
    } satisfies Partial<AIError>);
  });
});
