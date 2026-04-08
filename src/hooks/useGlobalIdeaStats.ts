import { useState, useEffect } from 'react';
import { getJSON } from './utils/apiHelpers';

/**
 * Idea Statistics Interface
 */
export interface IdeaStats {
  total: number;
  pending: number;
  accepted: number;
  implemented: number;
}

interface StatsApiScanType {
  scanType: string;
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
  implemented: number;
  acceptanceRatio: number;
}

/**
 * Global hook for idea statistics.
 *
 * Uses the dedicated /api/ideas/stats endpoint that computes counts via
 * SQL GROUP BY, instead of fetching all idea rows and filtering client-side.
 * Auto-refreshes every 30 seconds.
 */
export function useGlobalIdeaStats() {
  const [stats, setStats] = useState<IdeaStats>({
    total: 0,
    pending: 0,
    accepted: 0,
    implemented: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch stats from the dedicated server-side aggregation endpoint
  const fetchStats = async () => {
    try {
      const data = await getJSON<{ scanTypes?: StatsApiScanType[] }>('/api/ideas/stats');
      const scanTypes = data.scanTypes || [];

      // Aggregate across all scan types
      let total = 0, pending = 0, accepted = 0, implemented = 0;
      for (const st of scanTypes) {
        total += st.total;
        pending += st.pending;
        accepted += st.accepted;
        implemented += st.implemented;
      }
      setStats({ total, pending, accepted, implemented });
    } catch (_error) {
      // Silently handle fetch errors - stats will remain at previous value
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and periodic refresh
  useEffect(() => {
    fetchStats();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);

    return () => clearInterval(interval);
  }, [refreshKey]);

  // Manual refresh function
  const refresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return { stats, loading, refresh };
}
