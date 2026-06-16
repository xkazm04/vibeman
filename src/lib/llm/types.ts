// Common types and interfaces for all LLM providers

export interface LLMRequest {
  prompt: string;
  model?: string;
  stream?: boolean;
  projectId?: string;
  taskType?: string;
  taskDescription?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  /**
   * When true (the default for Anthropic), the system prompt is sent with a
   * `cache_control` breakpoint so repeated large prefixes hit the prompt cache.
   * Anthropic no-ops the breakpoint below the minimum cacheable size, so this is
   * always safe. Set false to opt out.
   */
  cacheSystemPrompt?: boolean;
  /**
   * JSON Schema for provider-native structured output (Anthropic forced tool_use /
   * OpenAI response_format json_schema). When set, the model returns JSON that
   * conforms to this schema instead of free text scraped by aiJsonParser.
   */
  responseSchema?: Record<string, unknown>;
  /** Name for the structured-output schema/tool (defaults applied per provider). */
  responseSchemaName?: string;
  /** Optional human description of the structured-output schema. */
  responseSchemaDescription?: string;
}

export interface LLMResponse {
  success: boolean;
  response?: string;
  model?: string;
  provider?: string;
  created_at?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: string;
  errorCode?: number;
  metadata?: Record<string, any>;
}

export interface LLMProgress {
  onStart?: (taskId: string) => void;
  onProgress?: (progress: number, message?: string) => void;
  onComplete?: (response: LLMResponse) => void;
  onError?: (error: string) => void;
}

export interface LLMProvider {
  name: string;
  generate(request: LLMRequest, progress?: LLMProgress): Promise<LLMResponse>;
  checkAvailability(): Promise<boolean>;
  getAvailableModels(): Promise<string[]>;
  parseJsonResponse<T = any>(response: string): { success: boolean; data?: T; error?: string };
}

export interface APIKeyConfig {
  provider: string;
  apiKey: string;
  baseUrl?: string;
  organization?: string;
}

export type SupportedProvider = 'ollama' | 'openai' | 'anthropic' | 'groq' | 'internal';

export interface ProviderConfig {
  provider: SupportedProvider;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  organization?: string;
  enabled?: boolean;
}