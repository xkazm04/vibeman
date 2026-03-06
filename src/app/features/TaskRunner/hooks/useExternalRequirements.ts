'use client';

/**
 * Hook for managing external requirements from Supabase.
 * Polls for open/visible requirements, provides CRUD actions,
 * and tracks processing state.
 */

import { useState, useCallback, useRef } from 'react';
import usePolling from '@/hooks/usePolling';
import type {
  ExternalRequirement,
  ExternalProcessingState,
} from '@/lib/supabase/external-types';

interface UseExternalRequirementsOptions {
  projectId: string | null;
  projectPath: string | null;
  enabled?: boolean;
}

interface UseExternalRequirementsReturn {
  requirements: ExternalRequirement[];
  isLoading: boolean;
  error: string | null;
  isConfigured: boolean;
  processing: Record<string, ExternalProcessingState>;

  // Actions
  refresh: () => Promise<void>;
  discard: (id: string) => Promise<void>;
  executeOne: (id: string) => Promise<void>;
  executeAll: () => Promise<void>;
  syncProjects: () => Promise<{ success: boolean; synced?: number; error?: string }>;
  resetFailed: (id: string) => Promise<void>;
}

export function useExternalRequirements({
  projectId,
  projectPath,
  enabled = true,
}: UseExternalRequirementsOptions): UseExternalRequirementsReturn {
  const [requirements, setRequirements] = useState<ExternalRequirement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(true);
  const [processing, setProcessing] = useState<Record<string, ExternalProcessingState>>({});
  const isExecutingRef = useRef(false);

  const fetchRequirements = useCallback(async () => {
    if (!projectId) return;

    try {
      const res = await fetch(`/api/external-requirements?projectId=${encodeURIComponent(projectId)}`);

      if (res.status === 503) {
        setIsConfigured(false);
        setRequirements([]);
        return;
      }

      const data = await res.json();
      if (data.success) {
        setIsConfigured(true);
        setRequirements(data.requirements);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch requirements');
      }
    } catch (err) {
      // Silently handle network errors — don't crash UI for Supabase outages
      setError(err instanceof Error ? err.message : 'Network error');
    }
  }, [projectId]);

  // Poll every 30s
  usePolling(
    async () => {
      // Skip polling while executing to avoid state flickering
      if (isExecutingRef.current) return;
      await fetchRequirements();
    },
    {
      enabled: enabled && !!projectId && isConfigured,
      intervalMs: 30_000,
      immediate: true,
    },
  );

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchRequirements();
    setIsLoading(false);
  }, [fetchRequirements]);

  const discard = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/external-requirements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'discarded' }),
      });
      const data = await res.json();
      if (data.success) {
        setRequirements((prev) => prev.filter((r) => r.id !== id));
      } else {
        setError(data.error || 'Failed to discard requirement');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to discard');
    }
  }, []);

  const resetFailed = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/external-requirements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'open' }),
      });
      const data = await res.json();
      if (data.success) {
        setRequirements((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: 'open' as const, error_message: null } : r))
        );
        setProcessing((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset');
    }
  }, []);

  const executeOne = useCallback(async (id: string) => {
    if (!projectId || !projectPath) return;

    isExecutingRef.current = true;
    setProcessing((prev) => ({
      ...prev,
      [id]: { status: 'analyzing', startedAt: Date.now() },
    }));

    try {
      const res = await fetch('/api/external-requirements/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          projectPath,
          requirementId: id,
        }),
      });
      const data = await res.json();

      if (data.success && data.result?.success) {
        setProcessing((prev) => ({
          ...prev,
          [id]: { status: 'completed', startedAt: prev[id]?.startedAt ?? Date.now() },
        }));
      } else {
        setProcessing((prev) => ({
          ...prev,
          [id]: {
            status: 'failed',
            startedAt: prev[id]?.startedAt ?? Date.now(),
            error: data.result?.error || data.error || 'Execution failed',
          },
        }));
      }
    } catch (err) {
      setProcessing((prev) => ({
        ...prev,
        [id]: {
          status: 'failed',
          startedAt: prev[id]?.startedAt ?? Date.now(),
          error: err instanceof Error ? err.message : 'Network error',
        },
      }));
    } finally {
      isExecutingRef.current = false;
      // Refresh to get latest statuses from Supabase
      await fetchRequirements();
    }
  }, [projectId, projectPath, fetchRequirements]);

  const executeAll = useCallback(async () => {
    if (!projectId || !projectPath) return;

    isExecutingRef.current = true;
    const openReqs = requirements.filter((r) => r.status === 'open');

    for (const req of openReqs) {
      setProcessing((prev) => ({
        ...prev,
        [req.id]: { status: 'analyzing', startedAt: Date.now() },
      }));
    }

    try {
      const res = await fetch('/api/external-requirements/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, projectPath }),
      });
      const data = await res.json();

      if (data.results) {
        for (const result of data.results) {
          setProcessing((prev) => ({
            ...prev,
            [result.requirementId]: {
              status: result.success ? 'completed' : 'failed',
              startedAt: prev[result.requirementId]?.startedAt ?? Date.now(),
              error: result.error,
            },
          }));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Batch execution failed');
    } finally {
      isExecutingRef.current = false;
      await fetchRequirements();
    }
  }, [projectId, projectPath, requirements, fetchRequirements]);

  const syncProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/external-requirements/sync-projects', {
        method: 'POST',
      });
      const data = await res.json();
      return data;
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Sync failed',
      };
    }
  }, []);

  return {
    requirements,
    isLoading,
    error,
    isConfigured,
    processing,
    refresh,
    discard,
    executeOne,
    executeAll,
    syncProjects,
    resetFailed,
  };
}
