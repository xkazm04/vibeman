/**
 * Hook to poll circuit breaker health for LLM providers.
 * Returns per-provider state (closed/half-open/open) and rate-limit flag
 * from /api/health/llm-providers every 15 seconds.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { SupportedProvider } from '@/lib/llm/types';

export type CircuitState = 'closed' | 'half-open' | 'open';

export interface ProviderHealthMetrics {
  state: CircuitState;
  rateLimited: boolean;
  successRate: number;
  failureCount: number;
}

export interface ProviderHealthResult {
  metrics: Partial<Record<SupportedProvider, ProviderHealthMetrics>>;
  isLoading: boolean;
}

const POLL_INTERVAL = 15_000;

export function useProviderHealth(): ProviderHealthResult {
  const [metrics, setMetrics] = useState<Partial<Record<SupportedProvider, ProviderHealthMetrics>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/health/llm-providers');
      if (!res.ok) return;
      const data = await res.json();
      if (!data.metrics) return;

      const parsed: Partial<Record<SupportedProvider, ProviderHealthMetrics>> = {};
      for (const [provider, m] of Object.entries(data.metrics) as [string, any][]) {
        parsed[provider as SupportedProvider] = {
          state: m.state as CircuitState,
          rateLimited: m.rateLimited ?? false,
          successRate: m.successRate ?? 0,
          failureCount: m.failureCount ?? 0,
        };
      }
      setMetrics(parsed);
    } catch {
      // silently ignore – stale data is fine
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    timerRef.current = setInterval(fetchHealth, POLL_INTERVAL);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchHealth]);

  return { metrics, isLoading };
}
