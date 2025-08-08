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
}) {
  const queryClient = useQueryClient();
  const { activeProject } = useActiveProjectStore();
  const { isActive } = useAnalysisStore();
  const { sessionId, flowId, limit = 50 } = options || {};
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
    refetchInterval: isActive ? 5000 : false, // Poll every 5 seconds when analysis is active
    refetchIntervalInBackground: false, // Don't poll when tab is not active
  });

  // Set up polling for local database updates
  useEffect(() => {
    const setupPolling = () => {
      // Clean up existing polling
      if (pollingIntervalRef.current) {
        console.log('Cleaning up existing polling interval');
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }

      // Set up polling when analysis is active
      if (isActive) {
        console.log('Setting up polling for local events');
        
        pollingIntervalRef.current = setInterval(() => {
          console.log('Polling for new events');
          
          // Invalidate and refetch queries to get fresh data
          queryClient.invalidateQueries({ queryKey: eventKeys.all });
          
          // Also refetch the specific query
          queryClient.refetchQueries({ queryKey });
        }, 5000); // Poll every 5 seconds
      }
    };

    setupPolling();

    return () => {
      if (pollingIntervalRef.current) {
        console.log('Cleaning up polling interval on unmount');
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [queryClient, projectId, isActive, queryKey]);

  return {
    ...query,
    events: query.data || [],
    isConnected: pollingIntervalRef.current !== null,
    isPolling: isActive && pollingIntervalRef.current !== null,
    lastUpdated: query.dataUpdatedAt,
  };
}

// Export query keys for external use
export { eventKeys }; 