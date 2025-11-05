import { useState, useEffect } from 'react';
import { DbIdea } from '@/app/db';

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
      const response = await fetch('/api/ideas');
      if (response.ok) {
        const data = await response.json();
        const ideas: DbIdea[] = data.ideas || [];
        setStats(calculateStats(ideas));
      }
    } catch (error) {
      console.error('Failed to fetch idea stats:', error);
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
