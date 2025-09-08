import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useActiveProjectStore } from '@/stores/activeProjectStore';

// Client-side event interface (matches the database structure)
export interface ClientEvent {
  id: string;
  project_id: string;
  title: string;
  description: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'proposal_accepted' | 'proposal_rejected';
  agent: string | null;
  message: string | null;
  created_at: string;
}

interface UseEventsOptions {
  projectId?: string;
  limit?: number;
  offset?: number;
  type?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

// Query key factory
const eventKeys = {
  all: ['events'] as const,
  byProject: (projectId: string) => [...eventKeys.all, 'project', projectId] as const,
  filtered: (projectId: string, filters: Record<string, any>) => 
    [...eventKeys.byProject(projectId), 'filtered', filters] as const,
};

export function useEvents(options: UseEventsOptions = {}) {
  const queryClient = useQueryClient();
  const { activeProject } = useActiveProjectStore();
  
  const {
    projectId = activeProject?.id || 'default',
    limit = 50,
    offset = 0,
    type,
    autoRefresh = false,
    refreshInterval = 5000
  } = options;

  const queryKey = eventKeys.filtered(projectId, { limit, offset, type });

  // Fetch events from API
  const fetchEvents = async (): Promise<ClientEvent[]> => {
    const params = new URLSearchParams({
      projectId,
      limit: limit.toString(),
      offset: offset.toString()
    });

    if (type && type !== 'all') {
      params.append('type', type);
    }

    const response = await fetch(`/api/kiro/events?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch events: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch events');
    }

    return result.events || [];
  };

  const query = useQuery({
    queryKey,
    queryFn: fetchEvents,
    staleTime: 0,
    refetchInterval: autoRefresh ? refreshInterval : false,
    refetchIntervalInBackground: false,
  });

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async (event: {
      project_id: string;
      title: string;
      description: string;
      type: 'info' | 'warning' | 'error' | 'success' | 'proposal_accepted' | 'proposal_rejected';
      agent?: string;
      message?: string;
    }) => {
      const response = await fetch('/api/kiro/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to create event: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch events
      queryClient.invalidateQueries({ queryKey: eventKeys.byProject(projectId) });
    }
  });

  // Get event counts
  const getEventCounts = async (): Promise<Record<string, number>> => {
    const response = await fetch(`/api/kiro/events/counts?projectId=${projectId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch event counts: ${response.status}`);
    }

    const result = await response.json();
    return result.counts || {};
  };

  const countsQuery = useQuery({
    queryKey: [...eventKeys.byProject(projectId), 'counts'],
    queryFn: getEventCounts,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Manual refresh function
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: eventKeys.byProject(projectId) });
  };

  // Clear events for project
  const clearEvents = useMutation({
    mutationFn: async (projectIdToClear: string) => {
      const response = await fetch(`/api/kiro/events/clear`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: projectIdToClear })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to clear events: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.byProject(projectId) });
    }
  });

  return {
    // Query data
    events: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    isRefetching: query.isRefetching,
    
    // Event counts
    eventCounts: countsQuery.data || {},
    isLoadingCounts: countsQuery.isLoading,
    
    // Actions
    createEvent: createEventMutation.mutate,
    clearEvents: clearEvents.mutate,
    refresh,
    
    // Status
    isCreatingEvent: createEventMutation.isPending,
    isClearingEvents: clearEvents.isPending,
    
    // Query info
    lastUpdated: query.dataUpdatedAt,
    queryKey
  };
}

// Convenience hook for creating events
export function useCreateEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (event: {
      project_id: string;
      title: string;
      description: string;
      type: 'info' | 'warning' | 'error' | 'success' | 'proposal_accepted' | 'proposal_rejected';
      agent?: string;
      message?: string;
    }) => {
      const response = await fetch('/api/kiro/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to create event: ${response.status}`);
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate events for the project
      queryClient.invalidateQueries({ 
        queryKey: eventKeys.byProject(variables.project_id) 
      });
    }
  });
}

// Export query keys for external use
export { eventKeys };