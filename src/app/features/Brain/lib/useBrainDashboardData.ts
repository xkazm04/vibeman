/**
 * useBrainDashboardData – Fetch orchestration for Brain dashboard
 *
 * Encapsulates project resolution, global/project mode detection,
 * and data-fetch coordination with abort-signal support.
 */

'use client';

import { useEffect } from 'react';
import { useClientProjectStore } from '@/stores/clientProjectStore';
import { useBrainStore } from '@/stores/brainStore';
import { useApplicationSession, useSessionAbortSignals } from '@/lib/session';
import type { SignalAnomaly } from '@/lib/brain/anomalyDetector';

export interface BrainDashboardData {
  activeProject: { id: string; name?: string; path?: string } | null;
  isGlobalMode: boolean;
  scope: 'project' | 'global';
  isLoadingContext: boolean;
  isLoadingOutcomes: boolean;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export function useBrainDashboardData(
  onAnomaliesDetected: (anomalies: SignalAnomaly[]) => void,
): BrainDashboardData {
  const { activeProject: sessionProject } = useApplicationSession();
  const getAbortSignal = useSessionAbortSignals();

  const selectedProjectId = useClientProjectStore((state) => state.selectedProjectId);
  const legacyProject = useClientProjectStore((state) => state.activeProject);
  const activeProject = sessionProject ?? legacyProject;

  const {
    isLoadingContext,
    isLoadingOutcomes,
    isLoading,
    error,
    fetchDashboard,
    fetchGlobalReflectionStatus,
    clearError,
  } = useBrainStore();

  const isGlobalMode = selectedProjectId === 'all';

  useEffect(() => {
    if (isGlobalMode) {
      fetchGlobalReflectionStatus();
      onAnomaliesDetected([]);
    } else if (activeProject?.id) {
      const { signal } = getAbortSignal('brain_dashboard');
      fetchDashboard(activeProject.id, signal).then((detectedAnomalies) => {
        if (signal.aborted) return;
        onAnomaliesDetected(detectedAnomalies);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGlobalMode, activeProject?.id]);

  return {
    activeProject,
    isGlobalMode,
    scope: isGlobalMode ? 'global' : 'project',
    isLoadingContext,
    isLoadingOutcomes,
    isLoading,
    error,
    clearError,
  };
}
