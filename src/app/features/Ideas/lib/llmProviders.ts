/**
 * LLM Provider configurations
 */

import { SupportedProvider } from '@/lib/llm/types';

export interface LLMProvider {
  value: SupportedProvider;
  icon: string;
  name: string;
}

export const LLM_PROVIDERS: LLMProvider[] = [
  { value: 'ollama' as SupportedProvider, icon: '/llm_icons/ollama.svg', name: 'Ollama' },
  { value: 'anthropic' as SupportedProvider, icon: '/llm_icons/claude.svg', name: 'Claude' },
  { value: 'gemini' as SupportedProvider, icon: '/llm_icons/gemini.svg', name: 'Gemini' },
  { value: 'openai' as SupportedProvider, icon: '/llm_icons/openai.svg', name: 'OpenAI' }
];
