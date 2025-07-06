import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { EventLogEntry } from '@/types';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { useAnalysisStore } from '@/stores/analysisStore';

// Flow events from Supabase
interface FlowEvent {
  id: string;
  flow_id: string;
  session_id: string;
  flow_name: string;
  trigger_type: string | null;
  status: string;
  step: string | null;
  parameters: Record<string, any>;
  input_data: Record<string, any>;
  result: Record<string, any>;
  timestamp: string;
  duration_ms: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

// Transform flow event to EventLogEntry
const transformFlowEvent = (flowEvent: FlowEvent): EventLogEntry => {
  let type: EventLogEntry['type'] = 'info';
  
  // Determine event type based on status and error
  if (flowEvent.error_message) {
    type = 'error';
  } else if (flowEvent.status === 'completed' || flowEvent.status === 'success') {
    type = 'success';
  } else if (flowEvent.status === 'failed' || flowEvent.status === 'error') {
    type = 'error';
  } else if (flowEvent.status === 'warning') {
    type = 'warning';
  }

  return {
    id: flowEvent.id,
    title: flowEvent.flow_name || 'Flow Event',
    description: flowEvent.error_message || 
                 flowEvent.step || 
                 `Flow ${flowEvent.status}` || 
                 'Flow event occurred',
    type,
    timestamp: new Date(flowEvent.timestamp),
    agent: flowEvent.trigger_type || 'system',
    message: flowEvent.error_message || `Flow ${flowEvent.flow_name} ${flowEvent.status}`
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
      let query = supabase
        .from('flow_events')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

      // Add filters if provided
      if (sessionId) {
        query = query.eq('session_id', sessionId);
      }
      if (flowId) {
        query = query.eq('flow_id', flowId);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching events:', error);
        throw error;
      }

      return (data || []).map(transformFlowEvent);
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

  // Set up realtime subscription
  useEffect(() => {
    const setupRealtimeSubscription = async () => {
      // Clean up existing subscription
      if (realtimeChannelRef.current) {
        console.log('Cleaning up existing realtime subscription');
        await supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }

      const channelName = `flow-events-${projectId}-${Date.now()}`;
      console.log('Setting up realtime subscription:', channelName);
      
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'flow_events',
          },
          (payload) => {
            console.log('Realtime event received:', payload);
            
            // Invalidate and refetch queries to get fresh data
            queryClient.invalidateQueries({ queryKey: eventKeys.all });
            
            // Also refetch the specific query
            queryClient.refetchQueries({ queryKey });
          }
        )
        .subscribe((status, err) => {
          console.log('Realtime subscription status:', status, err);
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to realtime events');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('Realtime subscription error:', err);
          } else if (status === 'TIMED_OUT') {
            console.warn('Realtime subscription timed out');
          } else if (status === 'CLOSED') {
            console.log('Realtime subscription closed');
          }
        });

      realtimeChannelRef.current = channel;
    };

    setupRealtimeSubscription();

    return () => {
      if (realtimeChannelRef.current) {
        console.log('Cleaning up realtime subscription on unmount');
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, [queryClient, projectId, sessionId, flowId, queryKey]);

  return {
    ...query,
    events: query.data || [],
    isConnected: realtimeChannelRef.current?.state === 'joined',
    isPolling: isActive && !query.isLoading,
    lastUpdated: query.dataUpdatedAt,
  };
}

// Export query keys for external use
export { eventKeys }; 