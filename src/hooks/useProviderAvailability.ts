/**
 * Hook to check which LLM providers are available/configured
 * Uses the /api/llm/providers endpoint which quickly checks configuration
 * without making actual API calls to the providers
 */

import { useState, useEffect } from 'react';
import { SupportedProvider } from '@/lib/llm/types';
import type { ProviderStatus } from '@/app/api/llm/providers/route';

export type { ProviderStatus };

interface ProviderAvailability {
  configured: Record<SupportedProvider, boolean>;
  providers: Record<SupportedProvider, ProviderStatus>;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

const DEFAULT_STATUS: ProviderStatus = { configured: false, reason: 'loading', suggestion: '' };

// Default provider configuration
const DEFAULT_PROVIDER_CONFIG: Record<SupportedProvider, boolean> = {
  ollama: true,
  openai: true,
  anthropic: true,
  groq: false,
  internal: false
};

const DEFAULT_PROVIDERS: Record<SupportedProvider, ProviderStatus> = {
  ollama: { configured: true, reason: 'loading', suggestion: '' },
  openai: { configured: true, reason: 'loading', suggestion: '' },
  anthropic: { configured: true, reason: 'loading', suggestion: '' },
  groq: { configured: false, reason: 'loading', suggestion: '' },
  internal: { configured: false, reason: 'loading', suggestion: '' },
};

export function useProviderAvailability(): ProviderAvailability {
  const [configured, setConfigured] = useState<Record<SupportedProvider, boolean>>(DEFAULT_PROVIDER_CONFIG);
  const [providers, setProviders] = useState<Record<SupportedProvider, ProviderStatus>>(DEFAULT_PROVIDERS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailability = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/llm/providers');

      if (!response.ok) {
        throw new Error(`Failed to check provider availability: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.configured) {
        setConfigured(data.configured);
        if (data.providers) {
          setProviders(data.providers);
        }
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setConfigured(DEFAULT_PROVIDER_CONFIG);
      setProviders(DEFAULT_PROVIDERS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailability();
  }, []);

  return {
    configured,
    providers,
    isLoading,
    error,
    refetch: fetchAvailability
  };
}
