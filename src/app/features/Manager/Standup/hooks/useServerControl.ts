/**
 * useServerControl Hook
 * Manages server start/stop operations for a project
 */

import { useState, useCallback, useEffect } from 'react';

type ServerStatus = 'running' | 'stopped' | 'error' | 'stopping' | 'starting' | 'unknown';

interface ServerState {
  status: ServerStatus;
  port: number | null;
  error: string | null;
}

interface UseServerControlReturn {
  serverState: ServerState;
  isLoading: boolean;
  startServer: () => Promise<void>;
  stopServer: () => Promise<void>;
  openInBrowser: () => void;
}

// Default port for Next.js/React projects in manual standup
const DEFAULT_PORT = 3001;

/**
 * Parse PID from netstat output (Windows)
 * Format: "  TCP    0.0.0.0:3001           0.0.0.0:0              LISTENING       12345"
 */
function parsePidFromNetstat(output: string): number | null {
  const lines = output.trim().split('\n');
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    // Last column is the PID on Windows
    if (parts.length >= 5) {
      const pid = parseInt(parts[parts.length - 1]);
      if (!isNaN(pid) && pid > 0) {
        return pid;
      }
    }
  }
  return null;
}

export function useServerControl(
  projectId: string | null,
  projectPath: string | null,
  projectType?: string
): UseServerControlReturn {
  const [serverState, setServerState] = useState<ServerState>({
    status: 'unknown',
    port: null,
    error: null,
  });
  const [isLoading, setIsLoading] = useState(false);

  // Check server status on mount and when project changes
  useEffect(() => {
    if (!projectId) {
      setServerState({ status: 'unknown', port: null, error: null });
      return;
    }

    const checkStatus = async () => {
      try {
        const response = await fetch('/api/server/status');
        if (response.ok) {
          const data = await response.json();
          const statuses = data.statuses || {};
          const status = statuses[projectId];

          if (status) {
            setServerState({
              status: status.status,
              port: status.port || DEFAULT_PORT,
              error: null,
            });
          } else {
            setServerState({
              status: 'stopped',
              port: null,
              error: null,
            });
          }
        }
      } catch {
        // Ignore errors on status check
        setServerState(prev => ({ ...prev, status: 'stopped' }));
      }
    };

    checkStatus();
  }, [projectId]);

  const startServer = useCallback(async () => {
    if (!projectId || !projectPath) return;

    setIsLoading(true);
    setServerState(prev => ({ ...prev, status: 'starting', error: null }));

    try {
      // Step 1: Check if port is in use and kill existing process
      const portCheckRes = await fetch(`/api/server/debug/port/${DEFAULT_PORT}`);
      const portData = await portCheckRes.json();

      if (portData.inUse && portData.output) {
        // Parse PID from the output and kill the process
        const pid = parsePidFromNetstat(portData.output);
        if (pid) {
          const killRes = await fetch('/api/server/debug/kill-process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pid, port: DEFAULT_PORT }),
          });

          const killData = await killRes.json();
          if (!killData.success) {
            console.warn('Failed to kill existing process:', killData.error);
            // Continue anyway - the process might have stopped
          }

          // Wait a bit for the port to be released
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }

      // Step 2: Start the server on port 3001 (hardcoded for standup)
      const response = await fetch('/api/server/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, port: DEFAULT_PORT }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to start server');
      }

      // Server started successfully
      setServerState({
        status: 'running',
        port: DEFAULT_PORT,
        error: null,
      });
    } catch (error) {
      setServerState({
        status: 'error',
        port: null,
        error: error instanceof Error ? error.message : 'Failed to start server',
      });
    } finally {
      setIsLoading(false);
    }
  }, [projectId, projectPath]);

  const stopServer = useCallback(async () => {
    if (!projectId) return;

    setIsLoading(true);
    setServerState(prev => ({ ...prev, status: 'stopping', error: null }));

    try {
      const response = await fetch('/api/server/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, force: true }),
      });

      const data = await response.json();

      if (!response.ok && data.error) {
        throw new Error(data.error);
      }

      // Server stopped successfully
      setServerState({
        status: 'stopped',
        port: null,
        error: null,
      });
    } catch (error) {
      setServerState(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to stop server',
      }));
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const openInBrowser = useCallback(() => {
    const port = serverState.port || DEFAULT_PORT;
    window.open(`http://localhost:${port}`, '_blank');
  }, [serverState.port]);

  return {
    serverState,
    isLoading,
    startServer,
    stopServer,
    openInBrowser,
  };
}

export default useServerControl;
