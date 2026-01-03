/**
 * useAutomationSession Hook
 * Manages real-time session tracking and event streaming for automation
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ============ Types ============

export type AutomationSessionPhase =
  | 'pending'
  | 'running'
  | 'exploring'
  | 'generating'
  | 'evaluating'
  | 'complete'
  | 'failed'
  | 'paused';

export type AutomationEventType =
  | 'file_read'
  | 'finding'
  | 'progress'
  | 'candidate'
  | 'evaluation'
  | 'phase_change'
  | 'error';

export interface SessionEvent {
  id: string;
  sessionId: string;
  eventType: AutomationEventType;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface ActiveSession {
  sessionId: string;
  projectId: string;
  projectName?: string;
  phase: AutomationSessionPhase;
  progress: number;
  message: string;
  startedAt: string;
  completedAt?: string;
  hasError: boolean;
  errorMessage?: string;
}

export interface SessionDetails extends ActiveSession {
  events: SessionEvent[];
  eventCounts: Record<AutomationEventType, number>;
  filesExplored: string[];
  findings: Array<{
    finding: string;
    file?: string;
    line?: number;
    category?: string;
    timestamp: string;
  }>;
}

interface UseAutomationSessionResult {
  // Active sessions
  activeSessions: ActiveSession[];
  isLoading: boolean;
  error: string | null;

  // Selected session details
  selectedSession: SessionDetails | null;
  isLoadingDetails: boolean;

  // Actions
  selectSession: (sessionId: string | null) => void;
  refreshSessions: () => Promise<void>;
  refreshSessionDetails: () => Promise<void>;

  // Polling control
  isPolling: boolean;
  setPollingEnabled: (enabled: boolean) => void;
}

// Poll interval for active sessions (faster when sessions are running)
const ACTIVE_POLL_INTERVAL = 3000; // 3 seconds
const IDLE_POLL_INTERVAL = 30000; // 30 seconds

export function useAutomationSession(): UseAutomationSessionResult {
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<SessionDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const [isPolling, setIsPolling] = useState(true);
  const lastEventTimestamp = useRef<string | null>(null);

  // Fetch active sessions
  const fetchActiveSessions = useCallback(async () => {
    try {
      const response = await fetch('/api/standup/automation/sessions?status=active');
      const data = await response.json();

      if (data.success) {
        setActiveSessions(data.sessions || []);
        setError(null);
      } else {
        // API might not exist yet, gracefully handle
        setActiveSessions([]);
      }
    } catch {
      // Silently fail - API might not be implemented yet
      setActiveSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch session details with events
  const fetchSessionDetails = useCallback(async (sessionId: string) => {
    setIsLoadingDetails(true);
    try {
      const url = new URL('/api/standup/automation/progress', window.location.origin);
      url.searchParams.set('sessionId', sessionId);
      url.searchParams.set('includeEvents', 'true');

      // If we have a last event timestamp, only get new events
      if (lastEventTimestamp.current) {
        url.searchParams.set('after', lastEventTimestamp.current);
      }

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.success) {
        const events = data.events || [];

        // Update last event timestamp
        if (events.length > 0) {
          lastEventTimestamp.current = events[events.length - 1].timestamp;
        }

        // Extract files and findings from events
        const filesExplored: string[] = [];
        const findings: SessionDetails['findings'] = [];

        for (const event of events) {
          if (event.eventType === 'file_read' && event.data?.file) {
            if (!filesExplored.includes(event.data.file as string)) {
              filesExplored.push(event.data.file as string);
            }
          } else if (event.eventType === 'finding') {
            findings.push({
              finding: (event.data?.finding as string) || '',
              file: event.data?.file as string | undefined,
              line: event.data?.line as number | undefined,
              category: event.data?.category as string | undefined,
              timestamp: event.timestamp,
            });
          }
        }

        setSelectedSession(prev => {
          // Merge new events with existing
          const existingEvents = prev?.events || [];
          const newEvents = events.filter(
            (e: SessionEvent) => !existingEvents.some(ex => ex.id === e.id)
          );

          return {
            sessionId,
            projectId: data.projectId,
            phase: data.phase,
            progress: data.progress || 0,
            message: data.message || '',
            startedAt: data.startedAt,
            completedAt: data.completedAt,
            hasError: data.hasError || false,
            errorMessage: data.errorMessage,
            events: [...existingEvents, ...newEvents],
            eventCounts: data.eventCounts || {},
            filesExplored: prev ? [...new Set([...prev.filesExplored, ...filesExplored])] : filesExplored,
            findings: prev ? [...prev.findings, ...findings] : findings,
          };
        });

        setError(null);
      }
    } catch (err) {
      setError('Failed to fetch session details');
    } finally {
      setIsLoadingDetails(false);
    }
  }, []);

  // Select a session
  const selectSession = useCallback((sessionId: string | null) => {
    setSelectedSessionId(sessionId);
    setSelectedSession(null);
    lastEventTimestamp.current = null;

    if (sessionId) {
      fetchSessionDetails(sessionId);
    }
  }, [fetchSessionDetails]);

  // Refresh functions
  const refreshSessions = useCallback(async () => {
    await fetchActiveSessions();
  }, [fetchActiveSessions]);

  const refreshSessionDetails = useCallback(async () => {
    if (selectedSessionId) {
      await fetchSessionDetails(selectedSessionId);
    }
  }, [selectedSessionId, fetchSessionDetails]);

  // Initial fetch
  useEffect(() => {
    fetchActiveSessions();
  }, [fetchActiveSessions]);

  // Polling for active sessions
  useEffect(() => {
    if (!isPolling) return;

    // Use faster polling when there are active sessions
    const hasActiveSessions = activeSessions.some(
      s => s.phase !== 'complete' && s.phase !== 'failed'
    );
    const interval = hasActiveSessions ? ACTIVE_POLL_INTERVAL : IDLE_POLL_INTERVAL;

    const pollInterval = setInterval(() => {
      fetchActiveSessions();
    }, interval);

    return () => clearInterval(pollInterval);
  }, [isPolling, activeSessions, fetchActiveSessions]);

  // Poll for session details when a session is selected and active
  useEffect(() => {
    if (!isPolling || !selectedSessionId) return;

    const session = activeSessions.find(s => s.sessionId === selectedSessionId);
    if (!session || session.phase === 'complete' || session.phase === 'failed') {
      return;
    }

    const pollInterval = setInterval(() => {
      fetchSessionDetails(selectedSessionId);
    }, ACTIVE_POLL_INTERVAL);

    return () => clearInterval(pollInterval);
  }, [isPolling, selectedSessionId, activeSessions, fetchSessionDetails]);

  return {
    activeSessions,
    isLoading,
    error,
    selectedSession,
    isLoadingDetails,
    selectSession,
    refreshSessions,
    refreshSessionDetails,
    isPolling,
    setPollingEnabled: setIsPolling,
  };
}
