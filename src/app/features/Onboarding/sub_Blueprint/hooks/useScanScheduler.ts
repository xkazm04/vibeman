/**
 * useScanScheduler Hook
 * React hook for predictive scan scheduling and manual rescan triggering
 */

import { useState, useCallback, useEffect } from 'react';
import { useActiveProjectStore } from '@/stores/activeProjectStore';

interface ScanRecommendation {
  scanType: string;
  priority: 'immediate' | 'high' | 'medium' | 'low';
  confidenceScore: number;
  stalenessScore: number;
  reasoning: string;
  lastScanAt?: string;
  lastChangeAt?: string;
  nextRecommendedAt?: string;
  predictedFindings?: number;
}

interface ScheduledScan {
  scanType: string;
  contextId?: string;
  scheduledFor: Date;
  priority: number;
}

interface ScanScheduleStats {
  totalScheduled: number;
  due: number;
  upcoming: number;
  byPriority: {
    immediate: number;
    high: number;
    medium: number;
    low: number;
  };
  byScanType: Record<string, number>;
}

export function useScanScheduler() {
  const { activeProject } = useActiveProjectStore();
  const [recommendations, setRecommendations] = useState<ScanRecommendation[]>([]);
  const [scheduledScans, setScheduledScans] = useState<ScheduledScan[]>([]);
  const [scheduleStats, setScheduleStats] = useState<ScanScheduleStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch scan recommendations
   */
  const fetchRecommendations = useCallback(
    async (limit = 10) => {
      if (!activeProject?.id) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/blueprint/scan-predictions?projectId=${activeProject.id}&limit=${limit}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch recommendations');
        }

        const data = await response.json();

        if (data.success) {
          setRecommendations(data.recommendations || []);
        } else {
          throw new Error(data.error || 'Unknown error');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        console.error('Error fetching recommendations:', err);
      } finally {
        setLoading(false);
      }
    },
    [activeProject?.id]
  );

  /**
   * Generate fresh predictions
   */
  const generatePredictions = useCallback(async () => {
    if (!activeProject?.id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/blueprint/scan-predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: activeProject.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate predictions');
      }

      const data = await response.json();

      if (data.success) {
        // Refresh recommendations after generating
        await fetchRecommendations();
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error generating predictions:', err);
    } finally {
      setLoading(false);
    }
  }, [activeProject?.id, fetchRecommendations]);

  /**
   * Auto-schedule scans based on predictions
   */
  const autoScheduleScans = useCallback(async () => {
    if (!activeProject?.id) return false;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/blueprint/scan-scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProject.id,
          action: 'auto-schedule',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to auto-schedule scans');
      }

      const data = await response.json();

      if (data.success) {
        setScheduledScans(
          data.scheduled.map((s: any) => ({
            ...s,
            scheduledFor: new Date(s.scheduledFor),
          }))
        );
        return true;
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error auto-scheduling scans:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [activeProject?.id]);

  /**
   * Schedule a specific scan manually
   */
  const scheduleScan = useCallback(
    async (scanType: string, contextId?: string, scheduledFor?: Date) => {
      if (!activeProject?.id) return false;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/blueprint/scan-scheduler', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: activeProject.id,
            action: 'schedule-scan',
            scanType,
            contextId,
            scheduledFor: scheduledFor?.toISOString(),
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to schedule scan');
        }

        const data = await response.json();

        if (data.success) {
          // Refresh scheduled scans list
          await fetchScheduledScans();
          return true;
        } else {
          throw new Error(data.error || 'Unknown error');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        console.error('Error scheduling scan:', err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [activeProject?.id]
  );

  /**
   * Fetch scheduled scans
   */
  const fetchScheduledScans = useCallback(
    async (type: 'all' | 'due' | 'stats' = 'all') => {
      if (!activeProject?.id) return;

      try {
        const response = await fetch(
          `/api/blueprint/scan-scheduler?projectId=${activeProject.id}&type=${type}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch scheduled scans');
        }

        const data = await response.json();

        if (data.success) {
          if (type === 'stats') {
            setScheduleStats(data.stats);
          } else {
            setScheduledScans(
              (data.scans || []).map((s: any) => ({
                ...s,
                scheduledFor: new Date(s.scheduledFor),
              }))
            );
          }
        }
      } catch (err) {
        console.error('Error fetching scheduled scans:', err);
      }
    },
    [activeProject?.id]
  );

  /**
   * Remove a scan from schedule
   */
  const removeScanFromSchedule = useCallback(
    async (scanType: string, contextId?: string) => {
      if (!activeProject?.id) return false;

      try {
        const url = new URL('/api/blueprint/scan-scheduler', window.location.origin);
        url.searchParams.set('projectId', activeProject.id);
        url.searchParams.set('scanType', scanType);
        if (contextId) {
          url.searchParams.set('contextId', contextId);
        }

        const response = await fetch(url.toString(), {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to remove scan from schedule');
        }

        const data = await response.json();

        if (data.success) {
          // Refresh scheduled scans list
          await fetchScheduledScans();
          return true;
        }

        return false;
      } catch (err) {
        console.error('Error removing scan from schedule:', err);
        return false;
      }
    },
    [activeProject?.id, fetchScheduledScans]
  );

  /**
   * Dismiss a recommendation
   */
  const dismissRecommendation = useCallback(
    async (scanType: string) => {
      // Find prediction ID from recommendations
      const rec = recommendations.find((r) => r.scanType === scanType);
      if (!rec) return false;

      try {
        // Note: We would need to store prediction IDs in the recommendation object
        // For now, just filter it out locally
        setRecommendations((prev) => prev.filter((r) => r.scanType !== scanType));
        return true;
      } catch (err) {
        console.error('Error dismissing recommendation:', err);
        return false;
      }
    },
    [recommendations]
  );

  /**
   * Record a manual scan execution
   */
  const recordScanExecution = useCallback(
    async (scanType: string, result: {
      success: boolean;
      executionTimeMs: number;
      findingsCount?: number;
      error?: string;
    }) => {
      if (!activeProject?.id) return;

      try {
        await fetch('/api/blueprint/scan-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            context: {
              projectId: activeProject.id,
              scanType,
              triggeredBy: 'manual',
            },
            result,
          }),
        });

        // Regenerate predictions after scan
        await generatePredictions();
      } catch (err) {
        console.error('Error recording scan execution:', err);
      }
    },
    [activeProject?.id, generatePredictions]
  );

  // Auto-fetch recommendations on mount
  useEffect(() => {
    if (activeProject?.id) {
      fetchRecommendations();
    }
  }, [activeProject?.id, fetchRecommendations]);

  return {
    // State
    recommendations,
    scheduledScans,
    scheduleStats,
    loading,
    error,

    // Actions
    fetchRecommendations,
    generatePredictions,
    autoScheduleScans,
    scheduleScan,
    fetchScheduledScans,
    removeScanFromSchedule,
    dismissRecommendation,
    recordScanExecution,
  };
}
