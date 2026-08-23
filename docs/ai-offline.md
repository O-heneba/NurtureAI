# Offline AI

## Runtime and model

The primary provider is [Transformers.js](https://huggingface.co/docs/transformers.js), running in the browser. The MVP model is `onnx-community/SmolLM2-135M-Instruct-ONNX`: it is small enough for a first browser trial and supports WebAssembly fallback, with WebGPU selected when the browser exposes it. The model ID is configurable in `src/ai/model/config.ts` and is not bundled into the application source.

The first model initialization downloads model assets. Transformers.js stores those assets in the browser Cache API. Later initializations can use the cached model without network access. This repository currently has no service worker or PWA shell, so the application itself still needs to be installed/served locally for a fully disconnected workflow.

## Architecture

React uses `useAI` from `src/ai/hooks/use-ai.ts`. The hook talks to `aiService`, which delegates to an `AIProvider`. `LocalAIProvider` owns browser inference and `CloudAIProvider` is an adapter for a server-side proxy. The existing Lovable gateway functions remain server-only and are not given to the local provider; a future cloud service can wrap them without exposing `LOVABLE_API_KEY`.

`AIStatus` distinguishes initialization, loading, ready, unavailable, and error states. Connectivity is reported separately through `isOnline`. Offline requests use a loaded local model; if the model is not cached, the service returns a user-facing load error instead of silently calling the cloud provider.

## Supported devices and limitations

WebAssembly is the minimum runtime requirement. WebGPU can improve performance but is not required. Low-memory phones and older browsers may fail to load the quantized model. Generation is currently non-streaming at the model boundary; the service exposes `stream` so a provider with real token streaming can be added later.

This MVP runtime path has been type-checked, but the model download and inference path still need verification in a browser with network access. Do not describe a device as offline-ready until model initialization has succeeded once on that device.

## Updating and adding providers

Change `AI_MODEL.id` and `revision`, then initialize while online to populate the browser cache. A later cache migration can use a versioned cache prefix. To add a provider, implement `AIProvider` in `src/ai/providers`, then pass it to `createAIService`; React code continues to use the same `AIService` methods.

Sensitive health information should stay with the local provider unless a user-approved, authenticated server proxy is explicitly configured. AI output is decision support only and requires human review; it must not be presented as diagnosis or a replacement for clinical protocols.