/**
 * Voicebot Module Type Definitions
 * Centralized type definitions for voice interaction functionality
 */

/**
 * Session log entry
 */
export interface SessionLog {
  id: string;
  timestamp: string;
  type: 'user' | 'assistant' | 'system';
  message: string;
  audioUrl?: string;
  timing?: {
    llmMs?: number;    // LLM response time in milliseconds
    ttsMs?: number;    // TTS generation time in milliseconds
    totalMs?: number;  // Total processing time
  };
  toolsUsed?: Array<{
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  }>;
}

/**
 * Session state types
 */
export type SessionState = 'idle' | 'connecting' | 'active' | 'processing' | 'error';

/**
 * Solution type for dual implementation
 */
export type VoiceSolution = 'websocket' | 'async';

/**
 * WebSocket message types
 */
export interface WebSocketMessage {
  type: 'audio' | 'response' | 'error';
  data?: string;
  text?: string;
  audioUrl?: string;
  message?: string;
}

/**
 * Audio configuration
 */
export interface AudioConfig {
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
}

/**
 * Audio processing configuration
 */
export interface AudioProcessingConfig {
  silenceThreshold: number;
  silenceDuration: number;
  fftSize: number;
}

/**
 * Async API response from STT
 */
export interface SpeechToTextResponse {
  success: boolean;
  text?: string;
  error?: string;
}

/**
 * Async API response from LLM
 */
export interface LLMResponse {
  success: boolean;
  response?: string;
  error?: string;
}

/**
 * Conversation message for LLM
 */
export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * LLM Provider types
 */
export type LLMProvider = 'ollama' | 'openai' | 'anthropic' | 'gemini';

/**
 * LLM Model configuration
 */
export interface LLMModelConfig {
  provider: LLMProvider;
  model: string;
  displayName?: string;
}

/**
 * Default LLM models for each provider
 */
export const DEFAULT_LLM_MODELS: Record<LLMProvider, string> = {
  ollama: 'ministral-3:14b',
  openai: 'gpt-5-mini-2025-08-07',
  anthropic: 'claude-4-5-haiku-latest',
  gemini: 'gemini-flash-latest'
};

/**
 * Available models for each provider (for selection)
 */
export const AVAILABLE_LLM_MODELS: Record<LLMProvider, Array<{ value: string; label: string }>> = {
  ollama: [
    { value: 'ministral-3:14b', label: 'GPT-OSS 20B (Fixed)' }
  ],
  openai: [
    { value: 'gpt-5-mini-2025-08-07', label: 'GPT-5 Mini' },
    { value: 'gpt-5-nano-2025-08-07', label: 'GPT-5 Nano' }
  ],
  anthropic: [
    { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku' },
    { value: 'claude-sonnet-4-5', label: 'Claude Sonnet' }
  ],
  gemini: [
    { value: 'gemini-flash-latest', label: 'Gemini Flash (Latest)' },
    { value: 'gemini-flash-lite-latest', label: 'Gemini Flash Lite (Latest)' }
  ]
};

/**
 * Knowledge context types for Annette
 */
export interface KnowledgeSource {
  type: 'context' | 'goal' | 'backlog' | 'documentation' | 'idea';
  id: string;
  name: string;
  description?: string;
}

export interface KnowledgeInsight {
  type: 'warning' | 'info' | 'success' | 'recommendation';
  message: string;
  actionable: boolean;
  details?: string;
}

export interface AnnetteResponse {
  userText: string;
  assistantText: string;
  audioUrl?: string;
  sources?: KnowledgeSource[];
  insights?: string[];
  nextSteps?: string[];
  toolsUsed?: Array<{
    name: string;
    description?: string;
  }>;
  timing?: {
    llmMs: number;
    ttsMs: number;
    totalMs: number;
  };
}

/**
 * Voice session interaction entry
 */
export interface VoiceSessionInteraction {
  id: string;
  timestamp: Date;
  userText: string;
  assistantText: string;
  audioUrl?: string;
  sources?: KnowledgeSource[];
  insights?: string[];
  nextSteps?: string[];
  toolsUsed?: Array<{
    name: string;
    description?: string;
  }>;
  timing?: {
    llmMs?: number;
    ttsMs?: number;
    totalMs?: number;
  };
}

/**
 * Complete voice session with all interactions
 */
export interface VoiceSession {
  id: string;
  projectId: string;
  projectName: string;
  startTime: Date;
  endTime?: Date;
  interactions: VoiceSessionInteraction[];
  totalInteractions: number;
  conversationId?: string;
}

/**
 * Response cache configuration
 */
export interface ResponseCacheConfig {
  /** Enable or disable response caching (default: true) */
  enabled?: boolean;
  /** Time-to-live in milliseconds (default: 3600000 = 1 hour) */
  ttl?: number;
  /** Maximum number of cached entries (LRU eviction, default: unlimited) */
  maxEntries?: number;
}

/**
 * Cached response statistics
 */
export interface ResponseCacheStats {
  /** Total number of cached entries */
  totalEntries: number;
  /** Timestamp of oldest entry (ms since epoch) */
  oldestEntry: number | null;
  /** Timestamp of newest entry (ms since epoch) */
  newestEntry: number | null;
  /** Estimated total size of cached data in bytes */
  totalSizeEstimate: number;
}

/**
 * Re-export response cache utilities for convenience
 */
export type {
  ResponseCacheConfig as VoicebotResponseCacheConfig
} from './voicebotResponseCache';
