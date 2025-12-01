// Utility functions for LLM operations

import { llmManager, generateWithLLM } from './llm-manager';
import { SupportedProvider, LLMResponse } from './types';

/**
 * Smart provider selection based on availability and task type
 */
export async function selectBestProvider(
  taskType?: string,
  preferredProvider?: SupportedProvider
): Promise<SupportedProvider> {
  // If preferred provider is specified and available, use it
  if (preferredProvider) {
    const isAvailable = await llmManager.checkProviderAvailability(preferredProvider);
    if (isAvailable) {
      return preferredProvider;
    }
  }

  // Check availability of all providers
  const availability = await llmManager.checkAllProvidersAvailability();
  const enabledProviders = llmManager.getEnabledProviders();

  // Filter to only available and enabled providers
  const availableProviders = enabledProviders.filter(provider => availability[provider]);

  if (availableProviders.length === 0) {
    // Fallback to default provider even if not available
    return llmManager.getDefaultProvider();
  }

  // Task-specific provider preferences
  if (taskType) {
    const taskLower = taskType.toLowerCase();
    
    // Code-related tasks: prefer local models first
    if (taskLower.includes('code') || taskLower.includes('programming')) {
      const codePreferences: SupportedProvider[] = ['ollama', 'openai', 'anthropic', 'gemini', 'internal'];
      for (const provider of codePreferences) {
        if (availableProviders.includes(provider)) {
          return provider;
        }
      }
    }
    
    // Creative writing: prefer Claude or GPT
    if (taskLower.includes('creative') || taskLower.includes('writing') || taskLower.includes('story')) {
      const creativePreferences: SupportedProvider[] = ['anthropic', 'openai', 'gemini', 'ollama', 'internal'];
      for (const provider of creativePreferences) {
        if (availableProviders.includes(provider)) {
          return provider;
        }
      }
    }
    
    // Analysis tasks: prefer Claude
    if (taskLower.includes('analysis') || taskLower.includes('review') || taskLower.includes('critique')) {
      const analysisPreferences: SupportedProvider[] = ['anthropic', 'openai', 'gemini', 'ollama', 'internal'];
      for (const provider of analysisPreferences) {
        if (availableProviders.includes(provider)) {
          return provider;
        }
      }
    }
  }

  // Default preference order
  const defaultPreferences: SupportedProvider[] = ['ollama', 'openai', 'anthropic', 'gemini', 'internal'];
  for (const provider of defaultPreferences) {
    if (availableProviders.includes(provider)) {
      return provider;
    }
  }

  // Return first available provider
  return availableProviders[0];
}

/**
 * Generate with automatic provider selection
 */
export async function generateWithBestProvider(
  prompt: string,
  options?: {
    taskType?: string;
    preferredProvider?: SupportedProvider;
    model?: string;
    projectId?: string;
    taskDescription?: string;
    maxTokens?: number;
    temperature?: number;
    systemPrompt?: string;
    onProgress?: (progress: number, message?: string) => void;
  }
): Promise<LLMResponse> {
  const bestProvider = await selectBestProvider(options?.taskType, options?.preferredProvider);
  
  return generateWithLLM(prompt, {
    ...options,
    provider: bestProvider
  });
}

/**
 * Retry generation with fallback providers
 */
export async function generateWithFallback(
  prompt: string,
  options?: {
    providers?: SupportedProvider[];
    model?: string;
    projectId?: string;
    taskType?: string;
    taskDescription?: string;
    maxTokens?: number;
    temperature?: number;
    systemPrompt?: string;
    onProgress?: (progress: number, message?: string) => void;
  }
): Promise<LLMResponse> {
  const providers = options?.providers || ['ollama', 'openai', 'anthropic', 'gemini', 'internal'];
  const enabledProviders = llmManager.getEnabledProviders();
  const availableProviders = providers.filter(p => enabledProviders.includes(p));

  let lastError = 'No providers available';

  for (const provider of availableProviders) {
    try {
      const response = await generateWithLLM(prompt, {
        ...options,
        provider
      });

      if (response.success) {
        return response;
      }

      lastError = response.error || `${provider} failed`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : `${provider} failed`;
      continue;
    }
  }

  return {
    success: false,
    error: `All providers failed. Last error: ${lastError}`,
    provider: 'fallback'
  };
}

/**
 * Batch generate with multiple providers for comparison
 */
export async function generateWithMultipleProviders(
  prompt: string,
  providers: SupportedProvider[],
  options?: {
    model?: string;
    projectId?: string;
    taskType?: string;
    taskDescription?: string;
    maxTokens?: number;
    temperature?: number;
    systemPrompt?: string;
  }
): Promise<Record<SupportedProvider, LLMResponse>> {
  const results: Record<string, LLMResponse> = {};

  await Promise.allSettled(
    providers.map(async (provider) => {
      try {
        const response = await generateWithLLM(prompt, {
          ...options,
          provider
        });
        results[provider] = response;
      } catch (error) {
        results[provider] = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          provider
        };
      }
    })
  );

  return results as Record<SupportedProvider, LLMResponse>;
}

/**
 * Estimate token count (rough approximation)
 */
export function estimateTokenCount(text: string): number {
  // Rough approximation: 1 token ≈ 4 characters for English text
  // This is a very rough estimate and varies by model and language
  return Math.ceil(text.length / 4);
}

/**
 * Truncate text to fit within token limit
 */
export function truncateToTokenLimit(text: string, maxTokens: number): string {
  const estimatedTokens = estimateTokenCount(text);
  
  if (estimatedTokens <= maxTokens) {
    return text;
  }

  // Rough calculation to truncate
  const maxChars = maxTokens * 4;
  return text.substring(0, maxChars) + '...';
}

/**
 * Format provider status for display
 */
export async function getProviderStatus(): Promise<Array<{
  provider: SupportedProvider;
  name: string;
  available: boolean;
  enabled: boolean;
  hasApiKey: boolean;
  modelCount: number;
}>> {
  const availability = await llmManager.checkAllProvidersAvailability();
  const allModels = await llmManager.getAllProviderModels();
  const enabledProviders = llmManager.getEnabledProviders();

  const providerNames: Record<SupportedProvider, string> = {
    ollama: 'Ollama (Local)',
    openai: 'OpenAI (ChatGPT)',
    anthropic: 'Anthropic (Claude)',
    gemini: 'Google Gemini',
    groq: 'Groq',
    internal: 'Internal API'
  };

  const providers: SupportedProvider[] = ['ollama', 'openai', 'anthropic', 'gemini', 'groq', 'internal'];

  return providers.map(provider => ({
    provider,
    name: providerNames[provider],
    available: availability[provider] || false,
    enabled: enabledProviders.includes(provider),
    hasApiKey: ['openai', 'anthropic', 'gemini'].includes(provider) ? 
      (typeof window !== 'undefined' && !!localStorage.getItem(`llm_api_keys`)) : true,
    modelCount: allModels[provider]?.length || 0
  }));
}

/**
 * Validate and sanitize LLM request
 */
export function validateLLMRequest(request: {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}): { valid: boolean; error?: string; sanitized?: typeof request } {
  if (!request.prompt || request.prompt.trim().length === 0) {
    return { valid: false, error: 'Prompt is required and cannot be empty' };
  }

  if (request.maxTokens && (request.maxTokens < 1 || request.maxTokens > 100000)) {
    return { valid: false, error: 'maxTokens must be between 1 and 100000' };
  }

  if (request.temperature !== undefined && (request.temperature < 0 || request.temperature > 2)) {
    return { valid: false, error: 'temperature must be between 0 and 2' };
  }

  // Sanitize the request
  const sanitized = {
    prompt: request.prompt.trim(),
    maxTokens: request.maxTokens ? Math.min(Math.max(request.maxTokens, 1), 100000) : undefined,
    temperature: request.temperature !== undefined ? 
      Math.min(Math.max(request.temperature, 0), 2) : undefined
  };

  return { valid: true, sanitized };
}