export type AIProviderKind = "local" | "cloud";

export type AIStatus = "uninitialized" | "checking" | "loading" | "ready" | "unavailable" | "error";

export type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AIRequest = {
  prompt?: string;
  messages?: AIMessage[];
  context?: string;
  signal?: AbortSignal;
  maxTokens?: number;
  temperature?: number;
  responseFormat?: "text" | "json";
};

export type AIResponse = {
  text: string;
  provider: AIProviderKind;
  modelId: string;
  sources?: AISource[];
  offline?: boolean;
};

export type AISource = {
  title: string;
  originalFilename: string;
  sourceOrganization: string;
  section?: string;
  pageNumber?: number;
};

export type AIState = {
  status: AIStatus;
  provider: AIProviderKind;
  modelId: string;
  progress: number;
  isOnline: boolean;
  error: AIError | null;
  cloudFallback: boolean;
  localAvailable: boolean;
};

export type AIErrorCode =
  | "unsupported"
  | "offline"
  | "model-unavailable"
  | "load-failed"
  | "generation-failed"
  | "cancelled"
  | "provider-unavailable";

export class AIError extends Error {
  constructor(
    public readonly code: AIErrorCode,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "AIError";
  }
}

export type AIProgressListener = (progress: number) => void;

export interface AIProvider {
  readonly kind: AIProviderKind;
  readonly modelId: string;
  initialize(onProgress?: AIProgressListener): Promise<void>;
  isAvailable(): Promise<boolean>;
  generate(request: AIRequest): Promise<AIResponse>;
  stream(request: AIRequest, onToken: (token: string) => void): Promise<void>;
  cancel(): void;
}

export interface AIService {
  initialize(): Promise<void>;
  isAvailable(): Promise<boolean>;
  getState(): AIState;
  subscribe(listener: (state: AIState) => void): () => void;
  generate(request: AIRequest): Promise<AIResponse>;
  stream(request: AIRequest, onToken: (token: string) => void): Promise<void>;
  cancel(): void;
}
