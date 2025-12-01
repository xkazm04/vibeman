// Local storage utilities for API keys and provider configurations

import { APIKeyConfig, ProviderConfig, SupportedProvider } from './types';

const STORAGE_KEYS = {
  API_KEYS: 'llm_api_keys',
  PROVIDER_CONFIGS: 'llm_provider_configs',
  DEFAULT_PROVIDER: 'llm_default_provider'
} as const;

/**
 * API Key Management
 */
export class APIKeyStorage {
  /**
   * Store API key for a provider
   */
  static setAPIKey(provider: SupportedProvider, apiKey: string, options?: {
    baseUrl?: string;
    organization?: string;
  }): void {
    if (typeof window === 'undefined') return;

    const keys = this.getAllAPIKeys();
    const config: APIKeyConfig = {
      provider,
      apiKey,
      baseUrl: options?.baseUrl,
      organization: options?.organization
    };

    keys[provider] = config;
    localStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(keys));
  }

  /**
   * Get API key for a provider
   */
  static getAPIKey(provider: SupportedProvider): APIKeyConfig | null {
    if (typeof window === 'undefined') return null;

    const keys = this.getAllAPIKeys();
    
    // Check if we have the key in the new format
    if (keys[provider]) {
      return keys[provider];
    }
    
    // Fallback: Check for legacy format (direct storage under provider key)
    try {
      const legacyKey = localStorage.getItem(provider);
      if (legacyKey) {
        const legacyData = JSON.parse(legacyKey);
        if (legacyData.apiKey) {
          // Migrate to new format
          const config: APIKeyConfig = {
            provider,
            apiKey: legacyData.apiKey,
            baseUrl: legacyData.baseUrl,
            organization: legacyData.organization
          };
          this.setAPIKey(provider, legacyData.apiKey, {
            baseUrl: legacyData.baseUrl,
            organization: legacyData.organization
          });
          // Remove legacy key
          localStorage.removeItem(provider);
          return config;
        }
      }
    } catch (error) {
      console.warn(`Failed to migrate legacy API key for ${provider}:`, error);
    }
    
    return null;
  }

  /**
   * Get all stored API keys
   */
  static getAllAPIKeys(): Partial<Record<SupportedProvider, APIKeyConfig>> {
    if (typeof window === 'undefined') return {};

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.API_KEYS);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Failed to parse stored API keys:', error);
      return {};
    }
  }

  /**
   * Remove API key for a provider
   */
  static removeAPIKey(provider: SupportedProvider): void {
    if (typeof window === 'undefined') return;

    const keys = this.getAllAPIKeys();
    delete keys[provider];
    localStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(keys));
  }

  /**
   * Check if API key exists for provider
   */
  static hasAPIKey(provider: SupportedProvider): boolean {
    if (typeof window === 'undefined') return false;
    
    const config = this.getAPIKey(provider);
    if (config?.apiKey) return true;
    
    // Also check legacy format
    try {
      const legacyKey = localStorage.getItem(provider);
      if (legacyKey) {
        const legacyData = JSON.parse(legacyKey);
        return !!(legacyData.apiKey);
      }
    } catch (error) {
      // Ignore parsing errors
    }
    
    return false;
  }

  /**
   * Clear all API keys
   */
  static clearAllAPIKeys(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEYS.API_KEYS);
  }
}

/**
 * Provider Configuration Management
 */
export class ProviderConfigStorage {
  /**
   * Set provider configuration
   */
  static setProviderConfig(provider: SupportedProvider, config: Partial<ProviderConfig>): void {
    if (typeof window === 'undefined') return;

    const configs = this.getAllProviderConfigs();
    configs[provider] = {
      ...configs[provider],
      ...config,
      provider,
      enabled: true,
    };
    localStorage.setItem(STORAGE_KEYS.PROVIDER_CONFIGS, JSON.stringify(configs));
  }

  /**
   * Get provider configuration
   */
  static getProviderConfig(provider: SupportedProvider): ProviderConfig | null {
    if (typeof window === 'undefined') return null;

    const configs = this.getAllProviderConfigs();
    return configs[provider] || null;
  }

  /**
   * Get all provider configurations
   */
  static getAllProviderConfigs(): Partial<Record<SupportedProvider, ProviderConfig>> {
    if (typeof window === 'undefined') return {};

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PROVIDER_CONFIGS);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Failed to parse stored provider configs:', error);
      return {};
    }
  }

  /**
   * Enable/disable a provider
   */
  static setProviderEnabled(provider: SupportedProvider, enabled: boolean): void {
    this.setProviderConfig(provider, { enabled });
  }

  /**
   * Check if provider is enabled
   */
  static isProviderEnabled(provider: SupportedProvider): boolean {
    const config = this.getProviderConfig(provider);
    return config?.enabled !== false; // Default to true if not set
  }

  /**
   * Get enabled providers
   */
  static getEnabledProviders(): SupportedProvider[] {
    const configs = this.getAllProviderConfigs();
    return Object.keys(configs).filter(provider => 
      this.isProviderEnabled(provider as SupportedProvider)
    ) as SupportedProvider[];
  }

  /**
   * Clear all provider configurations
   */
  static clearAllConfigs(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEYS.PROVIDER_CONFIGS);
  }
}

/**
 * Default Provider Management
 */
export class DefaultProviderStorage {
  /**
   * Set default provider
   */
  static setDefaultProvider(provider: SupportedProvider): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.DEFAULT_PROVIDER, provider);
  }

  /**
   * Get default provider
   */
  static getDefaultProvider(): SupportedProvider {
    if (typeof window === 'undefined') return 'ollama';

    const stored = localStorage.getItem(STORAGE_KEYS.DEFAULT_PROVIDER);
    return (stored as SupportedProvider) || 'ollama';
  }

  /**
   * Clear default provider
   */
  static clearDefaultProvider(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEYS.DEFAULT_PROVIDER);
  }
}

/**
 * Utility functions
 */
export const StorageUtils = {
  /**
   * Export all LLM settings
   */
  exportSettings(): string {
    return JSON.stringify({
      apiKeys: APIKeyStorage.getAllAPIKeys(),
      providerConfigs: ProviderConfigStorage.getAllProviderConfigs(),
      defaultProvider: DefaultProviderStorage.getDefaultProvider()
    }, null, 2);
  },

  /**
   * Import LLM settings
   */
  importSettings(settingsJson: string): boolean {
    try {
      const settings = JSON.parse(settingsJson);
      
      if (settings.apiKeys) {
        localStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(settings.apiKeys));
      }
      
      if (settings.providerConfigs) {
        localStorage.setItem(STORAGE_KEYS.PROVIDER_CONFIGS, JSON.stringify(settings.providerConfigs));
      }
      
      if (settings.defaultProvider) {
        DefaultProviderStorage.setDefaultProvider(settings.defaultProvider);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to import settings:', error);
      return false;
    }
  },

  /**
   * Clear all LLM settings
   */
  clearAllSettings(): void {
    APIKeyStorage.clearAllAPIKeys();
    ProviderConfigStorage.clearAllConfigs();
    DefaultProviderStorage.clearDefaultProvider();
  }
};