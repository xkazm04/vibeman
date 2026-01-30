'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  OrphanedSession,
  CleanupStats,
  DetectOrphansResponse,
  CleanupSessionsResponse,
} from '../lib/sessionCleanup.types';
import { ORPHAN_THRESHOLDS } from '../lib/sessionCleanup.types';

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
        body: JSON.stringify({
          action: 'cleanup',
          sessionIds,
        }),
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
      const response = await fetch('/api/claude-code/sessions/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cleanup-all',
          projectId,
        }),
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

  // Ref to always have access to the latest scanForOrphans without adding to dependencies
  const scanForOrphansRef = useRef(scanForOrphans);
  scanForOrphansRef.current = scanForOrphans;

  // Ref to track current interval duration - only reset interval when this actually changes
  const currentIntervalMsRef = useRef<number | null>(null);
  const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-scan on mount and periodically
  // Uses refs to avoid unnecessary interval teardown when unrelated state changes
  useEffect(() => {
    if (!autoScan) {
      // Clear any existing interval when autoScan is disabled
      if (intervalIdRef.current !== null) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
        currentIntervalMsRef.current = null;
      }
      return;
    }

    // Only recreate interval if the duration actually changed
    if (currentIntervalMsRef.current === scanIntervalMs && intervalIdRef.current !== null) {
      return;
    }

    // Clear existing interval if any
    if (intervalIdRef.current !== null) {
      clearInterval(intervalIdRef.current);
    }

    // Initial scan on mount or when autoScan becomes true
    if (currentIntervalMsRef.current === null) {
      scanForOrphansRef.current();
    }

    // Set up periodic scanning using ref to avoid stale closure
    intervalIdRef.current = setInterval(() => {
      scanForOrphansRef.current();
    }, scanIntervalMs);
    currentIntervalMsRef.current = scanIntervalMs;

    return () => {
      if (intervalIdRef.current !== null) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
        currentIntervalMsRef.current = null;
      }
    };
  }, [autoScan, scanIntervalMs]);

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
 * Send a heartbeat for a session
 */
export async function sendSessionHeartbeat(sessionId: string): Promise<boolean> {
  try {
    const response = await fetch('/api/claude-code/sessions/cleanup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'heartbeat',
        sessionId,
      }),
    });

    if (!response.ok) return false;

    const data = await response.json();
    return data.success;
  } catch (err) {
    console.error('Failed to send session heartbeat:', err);
    return false;
  }
}

export default useSessionCleanup;
