/**
 * useStandupAutomation Hook
 * Manages standup automation state and actions
 */

import { useState, useCallback, useEffect } from 'react';
import { useAutomationSessionStore } from '@/stores/automationSessionStore';
import type { AutomationConfig, AutomationStatus } from '../lib/standupConfig';

interface UseStandupAutomationProps {
  projectId: string;
  projectPath: string;
  projectName: string;
}

interface UseStandupAutomationReturn {
  status: AutomationStatus | null;
  config: AutomationConfig | null;
  isLoading: boolean;
  isRunning: boolean;
  error: string | null;
  successMessage: string | null;
  handleStart: () => Promise<void>;
  handleStop: () => Promise<void>;
  handleRunNow: () => Promise<void>;
  handleConfigUpdate: (updates: Partial<AutomationConfig>) => Promise<void>;
  clearError: () => void;
  clearSuccess: () => void;
}

export function useStandupAutomation({
  projectId,
  projectPath,
  projectName,
}: UseStandupAutomationProps): UseStandupAutomationReturn {
  const [status, setStatus] = useState<AutomationStatus | null>(null);
  const [config, setConfig] = useState<AutomationConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { fetchSessions } = useAutomationSessionStore();

  // Fetch status and config
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/standup/automation?includeHistory=false');
      const data = await response.json();
      if (data.success) {
        setStatus(data.status);
        setConfig(data.config);
        setError(null);
      }
    } catch {
      // Silent fail - status polling
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Start automation
  const handleStart = useCallback(async () => {
    setIsRunning(true);
    setError(null);
    try {
      const response = await fetch('/api/standup/automation/unified', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          projectPath,
          projectName,
          strategy: config?.strategy || 'build',
          autonomyLevel: config?.autonomyLevel || 'supervised',
        }),
      });
      const data = await response.json();
      if (data.success) {
        setSuccessMessage(`Session started: ${data.sessionId?.slice(0, 8) || 'new'}`);
        setTimeout(() => setSuccessMessage(null), 5000);
        await fetchStatus();
        await fetchSessions();
      } else {
        setError(data.error || 'Failed to start');
      }
    } catch {
      setError('Failed to start automation');
    } finally {
      setIsRunning(false);
    }
  }, [projectId, projectPath, projectName, config?.strategy, config?.autonomyLevel, fetchStatus, fetchSessions]);

  // Stop automation
  const handleStop = useCallback(async () => {
    try {
      const response = await fetch('/api/standup/automation', { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        await fetchStatus();
        setSuccessMessage('Automation stopped');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(data.error || 'Failed to stop');
      }
    } catch {
      setError('Failed to stop automation');
    }
  }, [fetchStatus]);

  // Run now
  const handleRunNow = useCallback(async () => {
    setIsRunning(true);
    setError(null);
    try {
      const response = await fetch('/api/standup/automation/unified', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, projectPath, strategy: config?.strategy || 'build' }),
      });
      const data = await response.json();
      if (data.success) {
        setSuccessMessage(`Session started: ${data.sessionId?.slice(0, 8) || 'new'}`);
        setTimeout(() => setSuccessMessage(null), 5000);
        await fetchStatus();
        await fetchSessions();
      } else {
        setError(data.error || 'Failed to run');
      }
    } catch {
      setError('Failed to run automation');
    } finally {
      setIsRunning(false);
    }
  }, [projectId, projectPath, config?.strategy, fetchStatus, fetchSessions]);

  // Update config
  const handleConfigUpdate = useCallback(async (updates: Partial<AutomationConfig>) => {
    if (!config) return;
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    try {
      const response = await fetch('/api/standup/automation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!(await response.json()).success) setConfig(config);
    } catch {
      setConfig(config);
    }
  }, [config]);

  return {
    status,
    config,
    isLoading,
    isRunning,
    error,
    successMessage,
    handleStart,
    handleStop,
    handleRunNow,
    handleConfigUpdate,
    clearError: () => setError(null),
    clearSuccess: () => setSuccessMessage(null),
  };
}

export default useStandupAutomation;
