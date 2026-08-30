import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AI_MODEL,
  loadKnowledgeIndex,
  searchLocalKnowledge,
  useAI,
  type AIProviderKind,
} from "@/ai";
import type { KnowledgeIndex, KnowledgeResult } from "@/ai/services/knowledge";
import {
  getSelectedRuntime,
  isLocalRuntimeSupported,
  isModelCached,
  isWebGPUAvailable,
} from "@/ai/model/model-manager";

export const Route = createFileRoute("/dev/ai")({
  component: AIDevelopmentCheck,
});

const PROMPT = "What nutrition guidance is relevant during pregnancy?";
const DEMO_QUESTIONS = [
  "What is CHPS?",
  "What nutrition guidance is relevant during pregnancy?",
  "What is complementary feeding?",
  "What should a CHPS worker consider when referral is required?",
];

function AIDevelopmentCheck() {
  const ai = useAI();
  const [prompt, setPrompt] = useState(PROMPT);
  const [cached, setCached] = useState(false);
  const [response, setResponse] = useState("");
  const [generationMs, setGenerationMs] = useState<number | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [provider, setProvider] = useState<AIProviderKind | null>(null);
  const [checkingCache, setCheckingCache] = useState(true);
  const [runtime, setRuntime] = useState<"webgpu" | "wasm" | "unsupported">("unsupported");
  const [webGPU, setWebGPU] = useState(false);
  const [wasm, setWasm] = useState(false);
  const [knowledge, setKnowledge] = useState<KnowledgeIndex | null>(null);
  const [knowledgeError, setKnowledgeError] = useState<string | null>(null);
  const [retrieved, setRetrieved] = useState<KnowledgeResult[]>([]);

  useEffect(() => {
    setRuntime(getSelectedRuntime());
    setWebGPU(isWebGPUAvailable());
    setWasm(isLocalRuntimeSupported());
  }, []);

  async function refreshCache() {
    setCheckingCache(true);
    try {
      setCached(await isModelCached());
    } finally {
      setCheckingCache(false);
    }
  }

  useEffect(() => {
    void refreshCache();
  }, [ai.status]);

  useEffect(() => {
    void loadKnowledgeIndex()
      .then(setKnowledge)
      .catch((error: unknown) => {
        setKnowledgeError(error instanceof Error ? error.message : "Knowledge index unavailable.");
      });
  }, []);

  async function generate() {
    setResponse("");
    setGenerationError(null);
    setRetrieved([]);
    const started = performance.now();
    try {
      const localResults = await searchLocalKnowledge(prompt);
      setRetrieved(localResults);
      const result = await ai.generate({ prompt, maxTokens: 120, temperature: 0.2 });
      setResponse(result.text);
      setProvider(result.provider);
      setGenerationMs(Math.round(performance.now() - started));
      await refreshCache();
    } catch (error) {
      setGenerationMs(Math.round(performance.now() - started));
      setGenerationError(error instanceof Error ? error.message : "Generation failed.");
    }
  }

  if (!import.meta.env.DEV) {
    return (
      <main className="p-8">This development screen is disabled outside development mode.</main>
    );
  }

  const rows = [
    ["AI runtime", runtime.toUpperCase()],
    ["Selected model", AI_MODEL.id],
    ["WebGPU available", webGPU ? "Yes" : "No"],
    ["WASM available", wasm ? "Yes" : "No"],
    ["Online", ai.isOnline ? "Yes" : "No"],
    ["Network", ai.isOnline ? "Online" : "Offline"],
    ["Provider", provider === "local" ? "Local AI" : "Not generated"],
    ["Cloud fallback", "Disabled on this screen"],
    ["Model cached", checkingCache ? "Checking..." : cached ? "Yes" : "No"],
    ["Model loading", ai.isLoading ? "Yes" : "No"],
    ["Loading progress", `${ai.progress}%`],
    ["AI ready", ai.isReady ? "Yes" : "No"],
    [
      "Knowledge documents",
      knowledge ? String(knowledge.documents.length) : knowledgeError ? "Error" : "Loading...",
    ],
    ["Knowledge chunks", knowledge ? String(knowledge.chunks.length) : "-"],
    ["Generation time", generationMs === null ? "-" : `${generationMs} ms`],
  ];

  return (
    <main className="min-h-screen bg-background p-4 text-foreground sm:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <p className="text-sm font-medium text-primary">Development verification</p>
          <h1 className="mt-1 text-2xl font-semibold">Local AI browser test</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This screen reports actual runtime, cache, loading, and generation state. No cloud
            fallback is used.
          </p>
        </header>

        <section className="grid gap-2 rounded-lg border p-4 sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="flex justify-between gap-4 border-b py-2 text-sm last:border-0 sm:last:border-b"
            >
              <span className="text-muted-foreground">{label}</span>
              <span className="break-all text-right font-medium">{value}</span>
            </div>
          ))}
        </section>

        {knowledge && (
          <section className="rounded-lg border p-4">
            <h2 className="text-sm font-medium">Knowledge Base</h2>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              {Array.from(new Set(knowledge.documents.flatMap((document) => document.topic)))
                .sort()
                .map((topic) => (
                  <span key={topic} className="rounded-full bg-muted px-3 py-1">
                    {topic.replaceAll("_", " ")}
                  </span>
                ))}
            </div>
          </section>
        )}
        {knowledgeError && <p className="text-sm text-destructive">{knowledgeError}</p>}

        <section className="space-y-3 rounded-lg border p-4">
          <label className="block text-sm font-medium" htmlFor="ai-prompt">
            Prompt
          </label>
          <textarea
            id="ai-prompt"
            className="min-h-24 w-full rounded-md border bg-background p-3 text-sm"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            {DEMO_QUESTIONS.map((question) => (
              <button
                key={question}
                className="rounded-md border px-3 py-1.5 text-left text-xs hover:bg-muted"
                onClick={() => setPrompt(question)}
              >
                {question}
              </button>
            ))}
          </div>
          <button
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            disabled={ai.isLoading || !prompt.trim() || !wasm}
            onClick={() => void generate()}
          >
            {ai.isLoading
              ? `Loading model (${ai.progress}%)`
              : cached || ai.isReady
                ? "Generate with Local AI"
                : "Prepare Offline AI and Generate"}
          </button>
          {ai.error && <p className="text-sm text-destructive">{ai.error.message}</p>}
          {generationError && <p className="text-sm text-destructive">{generationError}</p>}
          <div>
            <h2 className="text-sm font-medium">Generated response</h2>
            <p className="mt-2 min-h-16 whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">
              {response || "No response yet."}
            </p>
          </div>
          {!!retrieved.length && (
            <section className="border-t pt-3">
              <h2 className="text-sm font-medium">Sources</h2>
              <ul className="mt-2 space-y-2 text-sm">
                {(response ? retrieved : []).map((source) => (
                  <li key={source.chunkId}>
                    <span className="font-medium">
                      {source.sourceOrganization} - {source.title}
                    </span>
                    <span className="block text-muted-foreground">
                      {source.originalFilename} | {source.section ?? "unknown"}
                      {source.pageNumber ? ` | page ${source.pageNumber}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
              <details className="mt-3 text-xs">
                <summary className="cursor-pointer font-medium">DEBUG</summary>
                <pre className="mt-2 max-h-72 overflow-auto rounded-md bg-muted p-3 whitespace-pre-wrap">
                  {JSON.stringify(
                    {
                      query: prompt,
                      retrieved: retrieved.map(({ chunkId, title, score, originalFilename }) => ({
                        chunkId,
                        title,
                        score,
                        originalFilename,
                      })),
                    },
                    null,
                    2,
                  )}
                </pre>
              </details>
            </section>
          )}
        </section>
      </div>
    </main>
  );
}
