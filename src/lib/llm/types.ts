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

export type SupportedProvider = 'ollama' | 'openai' | 'anthropic' | 'gemini' | 'groq' | 'internal';

export interface ProviderConfig {
  provider: SupportedProvider;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  organization?: string;
  enabled?: boolean;
}