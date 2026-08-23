import { AIError } from "../types";
import { AI_MODEL, AI_MODEL_CACHE_PREFIX } from "./config";

type TextGenerator = (
  input: string,
  options: Record<string, unknown>,
) => Promise<Array<{ generated_text?: string }>>;

let generator: TextGenerator | null = null;
let loading: Promise<TextGenerator> | null = null;

export function isLocalRuntimeSupported(): boolean {
  return typeof window !== "undefined" && typeof WebAssembly !== "undefined";
}

export function isWebGPUAvailable(): boolean {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}

export function getSelectedRuntime(): "webgpu" | "wasm" | "unsupported" {
  if (!isLocalRuntimeSupported()) return "unsupported";
  return isWebGPUAvailable() ? "webgpu" : "wasm";
}

export async function isModelCached(): Promise<boolean> {
  if (generator) return true;
  if (typeof caches === "undefined") return false;

  const cacheNames = await caches.keys();
  const modelMarker = AI_MODEL.id.toLowerCase().replaceAll("/", "");
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    if (
      requests.some((request) =>
        decodeURIComponent(request.url).toLowerCase().replaceAll("/", "").includes(modelMarker),
      )
    ) {
      return true;
    }
  }
  return cacheNames.some((name) => name.startsWith(AI_MODEL_CACHE_PREFIX));
}

export async function loadModel(onProgress?: (progress: number) => void): Promise<TextGenerator> {
  if (generator) return generator;
  if (loading) return loading;
  if (!isLocalRuntimeSupported()) {
    throw new AIError("unsupported", "This browser cannot run the local AI runtime.");
  }

  loading = (async () => {
    try {
      const { env, pipeline } = await import("@huggingface/transformers");
      env.allowLocalModels = false;
      env.useBrowserCache = true;
      env.cacheDir = AI_MODEL_CACHE_PREFIX;

      const device = isWebGPUAvailable() ? "webgpu" : "wasm";
      const pipe = await pipeline("text-generation", AI_MODEL.id, {
        device,
        dtype: "q4",
        revision: AI_MODEL.revision,
        progress_callback: (event: { progress?: number }) => {
          if (typeof event.progress === "number") onProgress(Math.round(event.progress));
        },
      });
      generator = pipe as unknown as TextGenerator;
      return generator;
    } catch (error) {
      throw new AIError(
        "load-failed",
        navigator.onLine
          ? "The local AI model could not be loaded on this device."
          : "The local AI model is not cached. Connect once to download it, then try again offline.",
        { cause: error },
      );
    } finally {
      loading = null;
    }
  })();

  return loading;
}

export function clearLoadedModel(): void {
  generator = null;
}
