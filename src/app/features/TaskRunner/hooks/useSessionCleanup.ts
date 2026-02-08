'use client';

/**
 * Session cleanup hook for detecting and cleaning up orphaned Claude Code sessions.
 *
 * Heartbeat functionality delegates to the unified session lifecycle module
 * (@/lib/session-lifecycle). The hook itself handles UI-specific concerns
 * (state, polling, REST API calls for scan/cleanup) that callers depend on.
 */

import { useState, useCallback } from 'react';
import { usePolling } from '@/hooks/usePolling';
import { createClaudeCodeLifecycle } from '@/lib/session-lifecycle';
import type {
  OrphanedSession,
  CleanupStats,
  DetectOrphansResponse,
  CleanupSessionsResponse,
} from '../lib/sessionCleanup.types';
import { ORPHAN_THRESHOLDS } from '../lib/sessionCleanup.types';

// Singleton lifecycle manager for Claude Code sessions (lazy-initialized)
let _lifecycle: ReturnType<typeof createClaudeCodeLifecycle> | null = null;
function getLifecycle() {
  if (!_lifecycle) {
    _lifecycle = createClaudeCodeLifecycle();
  }
  return _lifecycle;
}

interface UseSessionCleanupOptions {
  projectId?: string;
  autoScan?: boolean;
  scanIntervalMs?: number;
}

interface UseSessionCleanupReturn {
  orphanedSessions: OrphanedSession[];
  stats: CleanupStats | null;
  isScanning: boolean;
  isCleaning: boolean;
  error: string | null;
  scanForOrphans: () => Promise<void>;
  cleanupSessions: (sessionIds: string[]) => Promise<boolean>;
  cleanupAll: () => Promise<boolean>;
}

/**
 * Hook for detecting and cleaning up orphaned Claude Code sessions
 */
export function useSessionCleanup(
  options: UseSessionCleanupOptions = {}
): UseSessionCleanupReturn {
  const {
    projectId,
    autoScan = true,
    scanIntervalMs = ORPHAN_THRESHOLDS.SCAN_INTERVAL_MINUTES * 60 * 1000,
  } = options;

  const [orphanedSessions, setOrphanedSessions] = useState<OrphanedSession[]>([]);
  const [stats, setStats] = useState<CleanupStats | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Scan for orphaned sessions
   */
  const scanForOrphans = useCallback(async () => {
    setIsScanning(true);
    setError(null);

    try {
      const url = projectId
        ? `/api/claude-code/sessions/cleanup?projectId=${encodeURIComponent(projectId)}`
        : '/api/claude-code/sessions/cleanup';

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to scan for orphaned sessions');
      }

      const data: DetectOrphansResponse = await response.json();
      setOrphanedSessions(data.orphans);
      setStats(data.stats);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Failed to scan for orphaned sessions:', err);
    } finally {
      setIsScanning(false);
    }
  }, [projectId]);

  /**
   * Clean up specific sessions by ID
   */
  const cleanupSessions = useCallback(async (sessionIds: string[]): Promise<boolean> => {
    if (sessionIds.length === 0) return false;

    setIsCleaning(true);
    setError(null);

    try {
      const response = await fetch('/api/claude-code/sessions/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to clean up sessions');
      }

      const data: CleanupSessionsResponse = await response.json();

      if (data.success) {
        // Remove cleaned sessions from state
        setOrphanedSessions(prev =>
          prev.filter(s => !sessionIds.includes(s.id))
        );

        // Update stats
        setStats(prev =>
          prev
            ? {
                ...prev,
                orphanedCount: prev.orphanedCount - data.cleanedCount,
                cleanedCount: prev.cleanedCount + data.cleanedCount,
                lastCleanup: new Date(),
              }
            : null
        );
      }

      return data.success;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Failed to clean up sessions:', err);
      return false;
    } finally {
      setIsCleaning(false);
    }
  }, []);

  /**
   * Clean up all orphaned sessions
   */
  const cleanupAll = useCallback(async (): Promise<boolean> => {
    setIsCleaning(true);
    setError(null);

    try {
      const response = await fetch('/api/claude-code/sessions/cleanup/all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        throw new Error('Failed to clean up all sessions');
      }

      const data: CleanupSessionsResponse = await response.json();

      if (data.success) {
        // Clear all orphaned sessions
        setOrphanedSessions([]);

        // Update stats
        setStats(prev =>
          prev
            ? {
                ...prev,
                orphanedCount: 0,
                cleanedCount: prev.cleanedCount + data.cleanedCount,
                lastCleanup: new Date(),
              }
            : null
        );
      }

      return data.success;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Failed to clean up all sessions:', err);
      return false;
    } finally {
      setIsCleaning(false);
    }
  }, [projectId]);

  // Use shared polling hook for auto-scan
  usePolling(scanForOrphans, {
    enabled: autoScan,
    intervalMs: scanIntervalMs,
    immediate: true,
  });

  return {
    orphanedSessions,
    stats,
    isScanning,
    isCleaning,
    error,
    scanForOrphans,
    cleanupSessions,
    cleanupAll,
  };
}

/**
 * Send a heartbeat for a session.
 * Delegates to the unified session lifecycle manager.
 */
export async function sendSessionHeartbeat(sessionId: string): Promise<boolean> {
  try {
    await getLifecycle().heartbeat(sessionId);
    return true;
  } catch (err) {
    console.error('Failed to send session heartbeat:', err);
    return false;
  }
}
