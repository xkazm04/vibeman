// Main export file for the LLM library

// Core types and interfaces
export type {
  LLMRequest,
  LLMResponse,
  LLMProgress,
  LLMProvider,
  APIKeyConfig,
  ProviderConfig,
  SupportedProvider
} from './types';

// Storage utilities
export {
  APIKeyStorage,
  ProviderConfigStorage,
  DefaultProviderStorage,
  DEFAULT_FALLBACK_CHAIN
} from './llm-storage';

// Base client class
export { BaseLLMClient } from './base-client';

// Individual provider clients
export { OpenAIClient } from './providers/openai-client';
export { AnthropicClient } from './providers/anthropic-client';
export { OllamaClient } from './providers/ollama-client';
export { InternalClient } from './providers/internal-client';

// Main LLM manager and convenience functions
export {
  LLMManager,
  llmManager,
  generateWithLLM,
  parseJsonWithLLM,
  checkLLMAvailability,
  getLLMModels
} from './llm-manager';

// Re-export for backward compatibility with existing Ollama usage
export {
  ollamaClient,
  generateWithOllama,
  parseOllamaJson
} from '../ollama';
