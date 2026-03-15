/**
 * useFlowAnalysis Hook
 * Fetches implementation logs, computes cross-context adjacency matrix,
 * calculates success rates per context pair, and identifies bottlenecks.
 */

import { useState, useEffect, useCallback } from 'react';
import type { FlowPair, Bottleneck, FlowAnalysisData } from '../lib/types';

export type { FlowPair, Bottleneck, FlowAnalysisData };

export function useFlowAnalysis(projectId: string | null | undefined) {
  const [data, setData] = useState<FlowAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFlowAnalysis = useCallback(async () => {
    if (!projectId) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/implementation-logs/flow-analysis?projectId=${projectId}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to fetch flow analysis');
      }
    } catch (err) {
      setError('Network error fetching flow analysis');
      console.error('Flow analysis fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchFlowAnalysis();
  }, [fetchFlowAnalysis]);

  // Helper: get bottleneck data for a specific group
  const getBottleneck = useCallback(
    (groupId: string): Bottleneck | undefined => {
      return data?.bottlenecks.find(b => b.group_id === groupId);
    },
    [data]
  );

  // Helper: get flow pairs involving a specific group
  const getPairsForGroup = useCallback(
    (groupId: string): FlowPair[] => {
      if (!data) return [];
      return data.pairs.filter(
        p => p.source_group_id === groupId || p.target_group_id === groupId
      );
    },
    [data]
  );

  return {
    data,
    loading,
    error,
    refetch: fetchFlowAnalysis,
    getBottleneck,
    getPairsForGroup,
  };
}
