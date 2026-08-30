export type KnowledgeDocument = {
  id: string;
  originalFilename: string;
  title: string;
  sourceOrganization: string;
  sourceType: string;
  topic: string[];
  version: string;
  publicationDate: string;
  authorityLevel: string;
  language: string;
};

export type KnowledgeChunk = {
  chunkId: string;
  documentId: string;
  originalFilename: string;
  title: string;
  sourceOrganization: string;
  sourceType: string;
  authorityLevel: string;
  topic: string[];
  section?: string;
  pageNumber?: number;
  text: string;
  keywords: string[];
};

export type KnowledgeIndex = {
  version: number;
  generatedAt: string;
  documents: KnowledgeDocument[];
  chunks: KnowledgeChunk[];
};

export type KnowledgeResult = KnowledgeChunk & { score: number };

const authorityWeight: Record<string, number> = {
  primary_clinical: 0.35,
  supporting_evidence: 0.2,
  educational: 0.1,
  unknown: 0,
};

const topicTerms: Record<string, string[]> = {
  chps: ["chps", "community health", "community-based health planning"],
  pregnancy: ["pregnancy", "pregnant", "gestation", "antenatal"],
  nutrition: ["nutrition", "food", "diet", "nutrient"],
  complementary_feeding: ["complementary feeding", "6-23 months", "infant feeding"],
  referral: ["referral", "refer", "emergency", "danger sign"],
  newborn: ["newborn", "neonate", "neonatal"],
  child: ["child", "infant", "under-five", "young child"],
};

let indexPromise: Promise<KnowledgeIndex> | null = null;

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function queryTopics(query: string): string[] {
  const normalized = normalize(query);
  return Object.entries(topicTerms)
    .filter(([, terms]) => terms.some((term) => normalized.includes(term)))
    .map(([topic]) => topic);
}

export function searchKnowledge(
  index: KnowledgeIndex,
  query: string,
  limit = 5,
): KnowledgeResult[] {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return [];
  const terms = [...new Set(normalizedQuery.split(" ").filter((term) => term.length > 2))];
  const topics = queryTopics(query);
  return index.chunks
    .map((chunk) => {
      const haystack = normalize(
        `${chunk.title} ${chunk.section ?? ""} ${chunk.text} ${chunk.keywords.join(" ")}`,
      );
      const phraseMatch = haystack.includes(normalizedQuery) ? 2 : 0;
      const keywordMatches = terms.reduce(
        (count, term) => count + (haystack.includes(term) ? 1 : 0),
        0,
      );
      const topicMatches = topics.reduce(
        (count, topic) => count + (chunk.topic.includes(topic) ? 1 : 0),
        0,
      );
      const relevance =
        phraseMatch + keywordMatches / Math.max(terms.length, 1) + topicMatches * 0.3;
      const score = relevance + (authorityWeight[chunk.authorityLevel] ?? 0);
      return { ...chunk, score: Number(score.toFixed(4)), relevance };
    })
    .filter((chunk) => chunk.relevance > 0.25)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

export async function loadKnowledgeIndex(): Promise<KnowledgeIndex> {
  if (!indexPromise) {
    indexPromise = fetch("/knowledge/index.json", { cache: "force-cache" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Knowledge index request failed (${response.status}).`);
        const value: unknown = await response.json();
        if (
          !value ||
          typeof value !== "object" ||
          !Array.isArray((value as KnowledgeIndex).chunks)
        ) {
          throw new Error("The local knowledge index is malformed.");
        }
        return value as KnowledgeIndex;
      })
      .catch((error) => {
        indexPromise = null;
        throw error;
      });
  }
  return indexPromise;
}

export async function searchLocalKnowledge(query: string, limit = 5): Promise<KnowledgeResult[]> {
  return searchKnowledge(await loadKnowledgeIndex(), query, limit);
}

export function resetKnowledgeIndexForTests(): void {
  indexPromise = null;
}
