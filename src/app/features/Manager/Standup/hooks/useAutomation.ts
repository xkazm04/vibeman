/**
 * useAutomation Hook
 * Manages automation state, API calls, and polling
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  AutomationStatus,
  AutomationConfig,
  ProjectCandidates,
  GoalCandidate,
} from '../types';
import { AUTOMATION_POLL_INTERVAL } from '../constants';

interface UseAutomationResult {
  // State
  status: AutomationStatus | null;
  config: AutomationConfig | null;
  isLoading: boolean;
  isRunning: boolean;
  isGenerating: boolean;
  error: string | null;
  successMessage: string | null;
  projectCandidates: ProjectCandidates[];
  showCandidatesModal: boolean;

  // Actions
  handleStart: () => Promise<void>;
  handleStop: () => Promise<void>;
  handleRunNow: () => Promise<void>;
  handleGenerateGoals: () => Promise<void>;
  handleConfigUpdate: (updates: Partial<AutomationConfig>) => Promise<void>;
  handleAcceptCandidates: (projectId: string, candidates: GoalCandidate[]) => Promise<void>;
  setShowCandidatesModal: (show: boolean) => void;
  setError: (error: string | null) => void;
  clearCandidates: () => void;
}

export function useAutomation(): UseAutomationResult {
  const [status, setStatus] = useState<AutomationStatus | null>(null);
  const [config, setConfig] = useState<AutomationConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCandidatesModal, setShowCandidatesModal] = useState(false);
  const [projectCandidates, setProjectCandidates] = useState<ProjectCandidates[]>([]);

  // Fetch status and config
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/standup/automation?includeHistory=false');
      const data = await response.json();

      if (data.success) {
        setStatus(data.status);
        setConfig(data.config);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch status');
      }
    } catch {
      setError('Failed to connect to automation service');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, AUTOMATION_POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Start automation
  const handleStart = useCallback(async () => {
    try {
      const response = await fetch('/api/standup/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      const data = await response.json();

      if (data.success) {
        setStatus(data.status);
        setError(null);
      } else {
        setError(data.error || 'Failed to start automation');
      }
    } catch {
      setError('Failed to start automation');
    }
  }, [config]);

  // Stop automation
  const handleStop = useCallback(async () => {
    try {
      const response = await fetch('/api/standup/automation', {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        await fetchStatus();
      } else {
        setError(data.error || 'Failed to stop automation');
      }
    } catch {
      setError('Failed to stop automation');
    }
  }, [fetchStatus]);

  // Run now (full cycle)
  const handleRunNow = useCallback(async () => {
    setIsRunning(true);
    try {
      const response = await fetch('/api/standup/automation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await response.json();

      if (data.success) {
        await fetchStatus();
      } else {
        setError(data.error || 'Failed to run automation');
      }
    } catch {
      setError('Failed to run automation');
    } finally {
      setIsRunning(false);
    }
  }, [fetchStatus]);

  // Generate goals and create Claude Code tasks
  const handleGenerateGoals = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch('/api/standup/automation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modes: {
            evaluateGoals: false,
            updateStatuses: false,
            generateGoals: true,
            createAnalysisTasks: true,
          },
        }),
      });
      const data = await response.json();

      if (data.success) {
        await fetchStatus();
        const { summary, debug, results } = data;

        if (!debug?.hasAnthropicKey) {
          setError('Missing ANTHROPIC_API_KEY - goal generation requires Anthropic API');
        } else if (summary.goalsGenerated === 0 && summary.projectsProcessed > 0) {
          const projectErrors = debug?.projectsWithErrors || [];
          if (projectErrors.length > 0) {
            const firstError = projectErrors[0]?.errors?.[0] || 'Unknown error';
            setError(`Generation failed: ${firstError}`);
          } else {
            setError('No goals generated - check console for details');
          }
        } else if (summary.goalsGenerated > 0 && results) {
          const candidatesData: ProjectCandidates[] = results
            .filter((r: any) => r.goalsGenerated && r.goalsGenerated.length > 0)
            .map((r: any) => ({
              projectId: r.projectId,
              projectName: r.projectName,
              candidates: r.goalsGenerated,
            }));

          if (candidatesData.length > 0) {
            setProjectCandidates(candidatesData);
            setShowCandidatesModal(true);
          } else {
            setSuccessMessage(`Generated ${summary.goalsGenerated} goal candidate(s)!`);
            setTimeout(() => setSuccessMessage(null), 5000);
          }
        }
      } else {
        setError(data.error || 'Failed to generate goals');
      }
    } catch {
      setError('Failed to generate goals');
    } finally {
      setIsGenerating(false);
    }
  }, [fetchStatus]);

  // Accept goal candidates
  const handleAcceptCandidates = useCallback(
    async (projectId: string, candidates: GoalCandidate[]) => {
      const response = await fetch('/api/standup/automation/accept-candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          candidates,
          createAnalysis: true,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create goals');
      }

      await fetchStatus();
      return data;
    },
    [fetchStatus]
  );

  // Update config
  const handleConfigUpdate = useCallback(
    async (updates: Partial<AutomationConfig>) => {
      if (!config) return;

      const newConfig = { ...config, ...updates };
      setConfig(newConfig);

      try {
        const response = await fetch('/api/standup/automation', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        const data = await response.json();

        if (!data.success) {
          setError(data.error || 'Failed to update config');
          setConfig(config); // Revert
        }
      } catch {
        setError('Failed to update config');
        setConfig(config); // Revert
      }
    },
    [config]
  );

  const clearCandidates = useCallback(() => {
    setShowCandidatesModal(false);
    setProjectCandidates([]);
  }, []);

  return {
    status,
    config,
    isLoading,
    isRunning,
    isGenerating,
    error,
    successMessage,
    projectCandidates,
    showCandidatesModal,
    handleStart,
    handleStop,
    handleRunNow,
    handleGenerateGoals,
    handleConfigUpdate,
    handleAcceptCandidates,
    setShowCandidatesModal,
    setError,
    clearCandidates,
  };
}
