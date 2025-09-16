// Main LLM Manager - Unified interface for all LLM providers

import { LLMRequest, LLMResponse, LLMProgress, LLMProvider, SupportedProvider } from './types';
import { APIKeyStorage, ProviderConfigStorage, DefaultProviderStorage } from './llm-storage';
import { OpenAIClient } from './providers/openai-client';
import { AnthropicClient } from './providers/anthropic-client';
import { GeminiClient } from './providers/gemini-client';
import { OllamaClient } from './providers/ollama-client';
import { InternalClient } from './providers/internal-client';

export class LLMManager {
  private providers: Map<SupportedProvider, LLMProvider> = new Map();
  private initialized = false;

  constructor() {
    this.initializeProviders();
  }

  /**
   * Initialize all providers with their configurations
   */
  private initializeProviders(): void {
    if (this.initialized) return;

    // Initialize OpenAI client
    const openaiConfig = APIKeyStorage.getAPIKey('openai');
    this.providers.set('openai', new OpenAIClient({
      apiKey: openaiConfig?.apiKey,
      baseUrl: openaiConfig?.baseUrl
    }));

    // Initialize Anthropic client
    const anthropicConfig = APIKeyStorage.getAPIKey('anthropic');
    this.providers.set('anthropic', new AnthropicClient({
      apiKey: anthropicConfig?.apiKey,
      baseUrl: anthropicConfig?.baseUrl
    }));

    // Initialize Gemini client
    const geminiConfig = APIKeyStorage.getAPIKey('gemini');
    this.providers.set('gemini', new GeminiClient({
      apiKey: geminiConfig?.apiKey,
      baseUrl: geminiConfig?.baseUrl
    }));

    // Initialize Ollama client
    const ollamaConfig = ProviderConfigStorage.getProviderConfig('ollama');
    this.providers.set('ollama', new OllamaClient({
      baseUrl: ollamaConfig?.baseUrl
    }));

    // Initialize Internal client
    const internalConfig = ProviderConfigStorage.getProviderConfig('internal');
    this.providers.set('internal', new InternalClient({
      baseUrl: internalConfig?.baseUrl
    }));

    this.initialized = true;
  }

  /**
   * Generate text using specified provider or default provider
   */
  async generate(
    request: LLMRequest & { provider?: SupportedProvider },
    progress?: LLMProgress
  ): Promise<LLMResponse> {
    this.initializeProviders();

    const provider = request.provider || DefaultProviderStorage.getDefaultProvider();
    const client = this.providers.get(provider);

    if (!client) {
      return {
        success: false,
        error: `Provider '${provider}' is not available`,
        provider
      };
    }

    // Check if provider is enabled
    if (!ProviderConfigStorage.isProviderEnabled(provider)) {
      return {
        success: false,
        error: `Provider '${provider}' is disabled`,
        provider
      };
    }

    try {
      const response = await client.generate(request, progress);
      return { ...response, provider };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider
      };
    }
  }

  /**
   * Check availability of a specific provider
   */
  async checkProviderAvailability(provider: SupportedProvider): Promise<boolean> {
    this.initializeProviders();
    
    const client = this.providers.get(provider);
    if (!client) return false;

    try {
      return await client.checkAvailability();
    } catch (error) {
      console.error(`Failed to check availability for ${provider}:`, error);
      return false;
    }
  }

  /**
   * Check availability of all providers
   */
  async checkAllProvidersAvailability(): Promise<Record<SupportedProvider, boolean>> {
    const results: Record<SupportedProvider, boolean> = {} as Record<SupportedProvider, boolean>;
    
    const providers: SupportedProvider[] = ['ollama', 'openai', 'anthropic', 'gemini', 'internal'];
    
    await Promise.all(
      providers.map(async (provider) => {
        results[provider] = await this.checkProviderAvailability(provider);
      })
    );

    return results;
  }

  /**
   * Get available models for a specific provider
   */
  async getProviderModels(provider: SupportedProvider): Promise<string[]> {
    this.initializeProviders();
    
    const client = this.providers.get(provider);
    if (!client) return [];

    try {
      return await client.getAvailableModels();
    } catch (error) {
      console.error(`Failed to get models for ${provider}:`, error);
      return [];
    }
  }

  /**
   * Get available models for all providers
   */
  async getAllProviderModels(): Promise<Record<SupportedProvider, string[]>> {
    const results: Record<SupportedProvider, string[]> = {} as Record<SupportedProvider, string[]>;
    
    const providers: SupportedProvider[] = ['ollama', 'openai', 'anthropic', 'gemini', 'internal'];
    
    await Promise.all(
      providers.map(async (provider) => {
        results[provider] = await this.getProviderModels(provider);
      })
    );

    return results;
  }

  /**
   * Parse JSON response using specified provider or default provider
   */
  parseJsonResponse<T = any>(
    response: string, 
    provider?: SupportedProvider
  ): { success: boolean; data?: T; error?: string } {
    this.initializeProviders();
    
    const targetProvider = provider || DefaultProviderStorage.getDefaultProvider();
    const client = this.providers.get(targetProvider);

    if (!client) {
      return {
        success: false,
        error: `Provider '${targetProvider}' is not available`
      };
    }

    return client.parseJsonResponse<T>(response);
  }

  /**
   * Get list of enabled providers
   */
  getEnabledProviders(): SupportedProvider[] {
    return ProviderConfigStorage.getEnabledProviders();
  }

  /**
   * Get current default provider
   */
  getDefaultProvider(): SupportedProvider {
    return DefaultProviderStorage.getDefaultProvider();
  }

  /**
   * Set default provider
   */
  setDefaultProvider(provider: SupportedProvider): void {
    DefaultProviderStorage.setDefaultProvider(provider);
  }

  /**
   * Refresh provider configurations (useful after API key changes)
   */
  refreshProviders(): void {
    this.initialized = false;
    this.providers.clear();
    this.initializeProviders();
  }

  /**
   * Get provider client instance (for advanced usage)
   */
  getProvider(provider: SupportedProvider): LLMProvider | undefined {
    this.initializeProviders();
    return this.providers.get(provider);
  }
}

// Export singleton instance
export const llmManager = new LLMManager();

// Convenience functions for common use cases
export async function generateWithLLM(
  prompt: string,
  options?: {
    provider?: SupportedProvider;
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
  return llmManager.generate({
    prompt,
    provider: options?.provider,
    model: options?.model,
    projectId: options?.projectId,
    taskType: options?.taskType,
    taskDescription: options?.taskDescription,
    maxTokens: options?.maxTokens,
    temperature: options?.temperature,
    systemPrompt: options?.systemPrompt
  }, {
    onProgress: options?.onProgress
  });
}

export async function parseJsonWithLLM<T = any>(
  response: string,
  provider?: SupportedProvider
): Promise<{ success: boolean; data?: T; error?: string }> {
  return llmManager.parseJsonResponse<T>(response, provider);
}

export async function checkLLMAvailability(
  provider?: SupportedProvider
): Promise<boolean> {
  if (provider) {
    return llmManager.checkProviderAvailability(provider);
  }
  
  const results = await llmManager.checkAllProvidersAvailability();
  return Object.values(results).some(available => available);
}

export async function getLLMModels(
  provider?: SupportedProvider
): Promise<string[] | Record<SupportedProvider, string[]>> {
  if (provider) {
    return llmManager.getProviderModels(provider);
  }
  
  return llmManager.getAllProviderModels();
}