/**
 * Hook to check which LLM providers are available/configured
 * Uses the /api/llm/providers endpoint which quickly checks configuration
 * without making actual API calls to the providers
 */

import { useState, useEffect } from 'react';
import { SupportedProvider } from '@/lib/llm/types';

interface ProviderAvailability {
  configured: Record<SupportedProvider, boolean>;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useProviderAvailability(): ProviderAvailability {
  const [configured, setConfigured] = useState<Record<SupportedProvider, boolean>>({
    ollama: true, // Default to true to avoid flickering
    openai: true,
    anthropic: true,
    gemini: true,
    internal: false
  });
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
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err) {
      console.error('Error checking provider availability:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');

      // On error, default to showing all providers except internal
      setConfigured({
        ollama: true,
        openai: true,
        anthropic: true,
        gemini: true,
        internal: false
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailability();
  }, []);

  return {
    configured,
    isLoading,
    error,
    refetch: fetchAvailability
  };
}
