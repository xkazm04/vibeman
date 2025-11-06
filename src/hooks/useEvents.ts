import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { buildQueryParams, postJSON, deleteJSON, getJSON } from './utils/apiHelpers';

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

export interface CreateEventPayload {
  project_id: string;
  title: string;
  description: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'proposal_accepted' | 'proposal_rejected';
  agent?: string;
  message?: string;
}

interface UseEventsOptions {
  projectId?: string;
  limit?: number;
  offset?: number;
  type?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

// Helper function for creating events - reduces duplication
async function createEventRequest(event: CreateEventPayload) {
  return postJSON('/api/kiro/events', event);
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
    const result = await getJSON<{ success: boolean; events?: ClientEvent[]; error?: string }>(
      '/api/kiro/events',
      {
        projectId,
        limit,
        offset,
        type: type !== 'all' ? type : undefined
      }
    );

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
    mutationFn: createEventRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.byProject(projectId) });
    }
  });

  // Get event counts
  const getEventCounts = async (): Promise<Record<string, number>> => {
    const result = await getJSON<{ counts?: Record<string, number> }>(
      '/api/kiro/events/counts',
      { projectId }
    );
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
      return deleteJSON('/api/kiro/events/clear', { projectId: projectIdToClear });
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
    mutationFn: createEventRequest,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: eventKeys.byProject(variables.project_id)
      });
    }
  });
}

// Export query keys for external use
export { eventKeys };