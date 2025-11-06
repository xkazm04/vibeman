import { useState, useEffect } from 'react';
import { DbIdea } from '@/app/db';
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

/**
 * Calculate idea statistics from array of ideas
 */
function calculateStats(ideas: DbIdea[]): IdeaStats {
  return {
    total: ideas.length,
    pending: ideas.filter(i => i.status === 'pending').length,
    accepted: ideas.filter(i => i.status === 'accepted').length,
    implemented: ideas.filter(i => i.status === 'implemented').length,
  };
}

/**
 * Global hook for idea statistics
 * Fetches all ideas and calculates stats
 * Auto-refreshes every 30 seconds
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

  // Fetch ideas and calculate stats
  const fetchStats = async () => {
    try {
      const data = await getJSON<{ ideas?: DbIdea[] }>('/api/ideas');
      const ideas: DbIdea[] = data.ideas || [];
      setStats(calculateStats(ideas));
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
