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
  ollama: 'gpt-oss:20b',
  openai: 'gpt-5-mini-2025-08-07',
  anthropic: 'claude-3-5-haiku-latest',
  gemini: 'gemini-flash-latest'
};

/**
 * Available models for each provider (for selection)
 */
export const AVAILABLE_LLM_MODELS: Record<LLMProvider, Array<{ value: string; label: string }>> = {
  ollama: [
    { value: 'gpt-oss:20b', label: 'GPT-OSS 20B (Fixed)' }
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
 * Conversation test sentences (imported from evaluation constants)
 * Can be customized in conversationEvaluation.ts
 */
import { EVALUATION_TEST_SENTENCES } from '../../../voicebot/lib/conversationEvaluation';
export const CONVERSATION_TEST_SENTENCES = EVALUATION_TEST_SENTENCES;

