import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { EventLogEntry } from '@/types';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { useAnalysisStore } from '@/stores/analysisStore';

// Database event from local SQLite
interface DbEvent {
  id: string;
  project_id: string;
  title: string;
  description: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'proposal_accepted' | 'proposal_rejected';
  agent: string | null;
  message: string | null;
  created_at: string;
}

// Transform database event to EventLogEntry
const transformDbEvent = (dbEvent: DbEvent): EventLogEntry => {
  return {
    id: dbEvent.id,
    title: dbEvent.title,
    description: dbEvent.description,
    type: dbEvent.type,
    timestamp: new Date(dbEvent.created_at),
    agent: dbEvent.agent || undefined,
    message: dbEvent.message || undefined
  };
};

// Query key factory
const eventKeys = {
  all: ['events'] as const,
  byProject: (projectId: string) => [...eventKeys.all, 'project', projectId] as const,
  bySession: (sessionId: string) => [...eventKeys.all, 'session', sessionId] as const,
};

export function useRealtimeEvents(options?: {
  sessionId?: string;
  flowId?: string;
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}) {
  const queryClient = useQueryClient();
  const { activeProject } = useActiveProjectStore();
  const { isActive } = useAnalysisStore();
  const { sessionId, flowId, limit = 50, autoRefresh = false, refreshInterval = 5000 } = options || {};
  const realtimeChannelRef = useRef<any>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Use project ID as a filter mechanism
  const projectId = activeProject?.id || 'default';
  
  const queryKey = sessionId 
    ? eventKeys.bySession(sessionId)
    : eventKeys.byProject(projectId);

  // Fetch initial events
  const fetchEvents = async (): Promise<EventLogEntry[]> => {
    try {
      const params = new URLSearchParams({
        projectId,
        limit: limit.toString()
      });

      const response = await fetch(`/api/kiro/events?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch events');
      }

      return (result.events || []).map(transformDbEvent);
    } catch (error) {
      console.error('Error in fetchEvents:', error);
      throw error;
    }
  };

  const query = useQuery({
    queryKey,
    queryFn: fetchEvents,
    staleTime: 0, // Always consider stale to allow realtime updates
    refetchInterval: autoRefresh ? refreshInterval : false, // Use manual control instead of isActive
    refetchIntervalInBackground: false, // Don't poll when tab is not active
  });

  // Manual polling control functions
  const startAutoRefresh = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    pollingIntervalRef.current = setInterval(() => {
      console.log('Polling for new events');
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
      queryClient.refetchQueries({ queryKey });
    }, refreshInterval);
  };

  const stopAutoRefresh = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  // Set up polling based on autoRefresh parameter
  useEffect(() => {
    if (autoRefresh) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }

    return () => {
      stopAutoRefresh();
    };
  }, [autoRefresh, refreshInterval, queryClient, queryKey]);

  return {
    ...query,
    events: query.data || [],
    isConnected: pollingIntervalRef.current !== null,
    isPolling: pollingIntervalRef.current !== null,
    lastUpdated: query.dataUpdatedAt,
    startAutoRefresh,
    stopAutoRefresh,
  };
}

// Export query keys for external use
export { eventKeys }; 