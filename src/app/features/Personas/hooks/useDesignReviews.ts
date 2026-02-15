'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { DbDesignReview, TestRunResult } from '@/lib/personas/testing/testTypes';
import type { DesignAnalysisResult } from '../lib/designTypes';
import { fetchDesignReviews, startDesignReviewRun, createPersona } from '../lib/personaApi';
import { usePersonaStore } from '@/stores/personaStore';

export interface UseDesignReviewsReturn {
  reviews: DbDesignReview[];
  isLoading: boolean;
  error: string | null;
  connectorFilter: string[];
  setConnectorFilter: (connectors: string[]) => void;
  availableConnectors: string[];
  refresh: () => Promise<void>;
  // Test run state
  activeRunId: string | null;
  runLines: string[];
  isRunning: boolean;
  runResult: TestRunResult | null;
  startNewReview: (options?: { useCaseIds?: string[]; customInstructions?: string[] }) => Promise<void>;
  cancelReview: () => void;
  adoptTemplate: (review: DbDesignReview) => Promise<void>;
  isAdopting: boolean;
  adoptError: string | null;
}

export function useDesignReviews(): UseDesignReviewsReturn {
  const [reviews, setReviews] = useState<DbDesignReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectorFilter, setConnectorFilter] = useState<string[]>([]);
  const [isAdopting, setIsAdopting] = useState(false);
  const [adoptError, setAdoptError] = useState<string | null>(null);

  // Derive unique connectors from review data
  const availableConnectors = useMemo(() => {
    const connectorSet = new Set<string>();
    for (const review of reviews) {
      try {
        const connectors: string[] = JSON.parse(review.connectors_used || '[]');
        connectors.forEach(c => connectorSet.add(c));
      } catch { /* ignore */ }
    }
    return Array.from(connectorSet).sort();
  }, [reviews]);

  // Test run state
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [runLines, setRunLines] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState<TestRunResult | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const filters = connectorFilter.length > 0
        ? { connectors: connectorFilter }
        : { latest: true };
      const data = await fetchDesignReviews(filters);
      setReviews(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reviews');
    } finally {
      setIsLoading(false);
    }
  }, [connectorFilter]);

  // Fetch on mount and when filter changes
  useEffect(() => {
    refresh();
  }, [refresh]);

  const cancelReview = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsRunning(false);
    setActiveRunId(null);
  }, []);

  const adoptTemplate = useCallback(async (review: DbDesignReview) => {
    setIsAdopting(true);
    setAdoptError(null);
    try {
      const designResult: DesignAnalysisResult | null = review.design_result
        ? JSON.parse(review.design_result)
        : null;

      if (!designResult) {
        throw new Error('No design data available for this template');
      }

      await createPersona({
        name: review.test_case_name,
        description: designResult.summary || `Adopted from template: ${review.test_case_name}`,
        system_prompt: designResult.full_prompt_markdown || 'You are a helpful AI assistant.',
        structured_prompt: JSON.stringify(designResult.structured_prompt),
        enabled: false,
      });

      // Refresh persona list in store
      const store = usePersonaStore.getState();
      await store.fetchPersonas();
    } catch (err) {
      setAdoptError(err instanceof Error ? err.message : 'Failed to adopt template');
      throw err;
    } finally {
      setIsAdopting(false);
    }
  }, []);

  const startNewReview = useCallback(async (options?: { useCaseIds?: string[]; customInstructions?: string[] }) => {
    setError(null);
    setRunLines([]);
    setRunResult(null);
    setIsRunning(true);

    try {
      const { testRunId } = await startDesignReviewRun(options);
      setActiveRunId(testRunId);

      // Connect SSE
      const es = new EventSource(`/api/personas/design-reviews/${testRunId}/stream`);
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.line) {
            setRunLines((prev) => [...prev, data.line]);
          }
          if (data.done) {
            es.close();
            eventSourceRef.current = null;
            setIsRunning(false);
            if (data.result) {
              setRunResult(data.result);
            }
            // Refresh reviews after completion
            refresh();
          }
        } catch {
          // ignore parse errors
        }
      };

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;
        setIsRunning(false);
        setError('Connection to test runner lost');
      };
    } catch (err) {
      setIsRunning(false);
      setError(err instanceof Error ? err.message : 'Failed to start review run');
    }
  }, [refresh]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return {
    reviews,
    isLoading,
    error,
    connectorFilter,
    setConnectorFilter,
    availableConnectors,
    refresh,
    activeRunId,
    runLines,
    isRunning,
    runResult,
    startNewReview,
    cancelReview,
    adoptTemplate,
    isAdopting,
    adoptError,
  };
}
