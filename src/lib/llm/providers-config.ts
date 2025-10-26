/**
 * LLM Provider configurations
 * Shared configuration for provider icons and metadata
 */

import { SupportedProvider } from '@/lib/llm/types';

export interface LLMProviderConfig {
  value: SupportedProvider;
  icon: string;
  name: string;
}

export const LLM_PROVIDERS: LLMProviderConfig[] = [
  { value: 'ollama' as SupportedProvider, icon: '/llm_icons/ollama.svg', name: 'Ollama' },
  { value: 'anthropic' as SupportedProvider, icon: '/llm_icons/claude.svg', name: 'Claude' },
  { value: 'gemini' as SupportedProvider, icon: '/llm_icons/gemini.svg', name: 'Gemini' },
  { value: 'openai' as SupportedProvider, icon: '/llm_icons/openai.svg', name: 'OpenAI' }
];
