import { describe, expect, it } from "vitest";
import { searchKnowledge, type KnowledgeIndex } from "./knowledge";

const chunk = (id: string, text: string, topic: string[], authorityLevel = "unknown") => ({
  chunkId: id,
  documentId: id,
  originalFilename: `${id}.pdf`,
  title: id,
  sourceOrganization: authorityLevel === "primary_clinical" ? "Ghana Health Service" : "unknown",
  sourceType: authorityLevel === "primary_clinical" ? "ghs" : "research",
  authorityLevel,
  topic,
  section: "Section",
  text,
  keywords: text.toLowerCase().split(/\s+/),
});

const index: KnowledgeIndex = {
  version: 1,
  generatedAt: "test",
  documents: [],
  chunks: [
    chunk(
      "chps",
      "CHPS is community-based health planning and services in Ghana.",
      ["chps", "community_health"],
      "primary_clinical",
    ),
    chunk(
      "pregnancy",
      "Nutrition guidance during pregnancy includes healthy food and maternal nutrition.",
      ["pregnancy", "nutrition", "maternal_nutrition"],
      "primary_clinical",
    ),
    chunk(
      "feeding",
      "Complementary feeding for infants and young children begins at 6-23 months.",
      ["complementary_feeding", "child"],
      "supporting_evidence",
    ),
    chunk(
      "research",
      "Research discusses pregnancy food practices and nutrition.",
      ["pregnancy", "nutrition"],
      "supporting_evidence",
    ),
  ],
};

describe("local knowledge search", () => {
  it("matches CHPS content and prioritizes clinical guidance", () => {
    expect(searchKnowledge(index, "What is CHPS?")[0]?.chunkId).toBe("chps");
  });

  it("matches pregnancy nutrition and complementary feeding topics", () => {
    expect(
      searchKnowledge(index, "What nutrition guidance is relevant during pregnancy?")[0]?.chunkId,
    ).toBe("pregnancy");
    expect(searchKnowledge(index, "What is complementary feeding?")[0]?.chunkId).toBe("feeding");
  });

  it("returns no fabricated results for an unrelated query", () => {
    expect(searchKnowledge(index, "weather forecast")).toEqual([]);
    expect(searchKnowledge(index, "")).toEqual([]);
  });
});
