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

  try {
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
  } catch {
    return false;
  }
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
      env.useBrowserCache = typeof caches !== "undefined";
      env.cacheDir = AI_MODEL_CACHE_PREFIX;

      const devices: Array<"webgpu" | "wasm"> = isWebGPUAvailable() ? ["webgpu", "wasm"] : ["wasm"];
      let pipe: unknown;
      let lastError: unknown;
      for (const device of devices) {
        try {
          pipe = await pipeline("text-generation", AI_MODEL.id, {
            device,
            dtype: "q4",
            revision: AI_MODEL.revision,
            progress_callback: (event) => {
              if ("progress" in event && typeof event.progress === "number") {
                onProgress?.(Math.round(event.progress));
              }
            },
          });
          break;
        } catch (error) {
          lastError = error;
        }
      }
      if (!pipe) throw lastError ?? new Error("No local AI runtime could load the model.");
      generator = pipe as unknown as TextGenerator;
      return generator;
    } catch (error) {
      const detail = error instanceof Error && error.message ? ` ${error.message}` : "";
      throw new AIError(
        "load-failed",
        navigator.onLine
          ? `The local AI model could not be loaded on this device.${detail}`
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
