'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Terminal, TerminalSquare, Settings } from 'lucide-react';
import { AutoAssignSettingsModal } from './AutoAssignSettingsModal';
import { CLISession } from './CLISession';
import type { CLIBatchPanelProps } from './types';
import { requirementToQueuedTask } from './types';
import {
  useCLISessionStore,
  abortSessionExecution,
  performTaskCleanup,
  cleanupAllCLISessions,
  clearSessionStrategy,
  type CLISessionId,
} from './store';
import { useCLIRecovery } from './store/useCLIRecovery';
import type { SkillId } from './skills';
import type { CLIProvider, CLIModel } from '@/lib/claude-terminal/types';
import {
  useTaskRunnerStore,
  createQueuedStatus,
  createRunningStatus,
  createCompletedStatus,
  createFailedStatus,
} from '@/app/features/TaskRunner/store';
import {
  executeGitOperations,
  generateCommitMessage,
} from '@/app/features/TaskRunner/sub_Git/gitApi';


const SESSIONS: CLISessionId[] = ['cliSession1', 'cliSession2', 'cliSession3', 'cliSession4'];

// Task completion utilities (deleteRequirementFile, updateIdeaImplementationStatus)
// are imported from ./store (cliExecutionManager.ts) to avoid duplication

/**
 * CLI Batch Panel
 *
 * Manages 4 parallel CLI terminal sessions with task queues.
 * Alternative to DualBatchPanel for CLI-based task execution.
 * Uses persistent Zustand store for recovery from browser refresh.
 */
export function CLIBatchPanel({
  selectedTaskIds,
  requirements,
  getRequirementId,
  onClearSelection,
  onRequirementCompleted,
  isRemoteMode = false,
}: CLIBatchPanelProps) {
  // Use persistent store for sessions
  const sessions = useCLISessionStore((state) => state.sessions);
  const nerdMode = useCLISessionStore((state) => state.nerdMode);
  const toggleNerdMode = useCLISessionStore((state) => state.toggleNerdMode);
  const addTasksToSession = useCLISessionStore((state) => state.addTasksToSession);
  const setAutoStart = useCLISessionStore((state) => state.setAutoStart);
  const setRunning = useCLISessionStore((state) => state.setRunning);
  const updateTaskStatus = useCLISessionStore((state) => state.updateTaskStatus);
  const removeTask = useCLISessionStore((state) => state.removeTask);
  const toggleSkill = useCLISessionStore((state) => state.toggleSkill);
  const setCurrentExecution = useCLISessionStore((state) => state.setCurrentExecution);
  const setGitEnabled = useCLISessionStore((state) => state.setGitEnabled);
  const setGitConfig = useCLISessionStore((state) => state.setGitConfig);
  const setProvider = useCLISessionStore((state) => state.setProvider);
  const setModel = useCLISessionStore((state) => state.setModel);

  // Clean up SSE connections and polling on unmount to prevent connection leaks
  useEffect(() => {
    return () => cleanupAllCLISessions();
  }, []);

  // TaskRunner store for syncing task status to TaskColumn
  const updateTaskRunnerStatus = useTaskRunnerStore((state) => state.updateTaskStatus);

  // Recovery hook - recovers sessions on mount
  useCLIRecovery();

  // Auto-assign settings modal
  const [showSettings, setShowSettings] = useState(false);

  // Get selected requirements
  const selectedRequirements = useMemo(() => {
    return requirements.filter(r => selectedTaskIds.includes(getRequirementId(r)));
  }, [requirements, selectedTaskIds, getRequirementId]);

  // Add selected tasks to a session
  const handleAddToSession = useCallback((sessionId: CLISessionId) => {
    if (selectedRequirements.length === 0) return;

    // Convert requirements to queued tasks
    const newTasks = selectedRequirements.map(req =>
      requirementToQueuedTask(req, getRequirementId(req))
    );

    addTasksToSession(sessionId, newTasks);

    // Sync queued status to TaskRunner store so TaskColumn shows correct status
    newTasks.forEach(task => {
      updateTaskRunnerStatus(task.id, createQueuedStatus());
    });

    onClearSelection?.();
  }, [selectedRequirements, getRequirementId, addTasksToSession, updateTaskRunnerStatus, onClearSelection]);

  // Delete a session (abort execution if running, clear all state)
  // Reset queued tasks back to open in TaskRunner store so they reappear in TaskColumn
  const handleDeleteSession = useCallback(async (sessionId: CLISessionId) => {
    const session = sessions[sessionId];
    // Collect queued task IDs before clearing the session
    const queuedTaskIds = session.queue
      .filter(t => t.status.type === 'queued')
      .map(t => t.id);

    await abortSessionExecution(sessionId);

    // Reset queued tasks to open in TaskRunner store (delete from tasks map = idle/open)
    if (queuedTaskIds.length > 0) {
      useTaskRunnerStore.setState((state) => {
        const newTasks = { ...state.tasks };
        for (const id of queuedTaskIds) {
          delete newTasks[id];
        }
        return { tasks: newTasks };
      });
    }
  }, [sessions]);

  // Start session (enable autoStart)
  const handleStartSession = useCallback((sessionId: CLISessionId) => {
    setAutoStart(sessionId, true);
    setRunning(sessionId, true);
  }, [setAutoStart, setRunning]);

  // Toggle skill for session
  const handleToggleSkill = useCallback((sessionId: CLISessionId, skillId: SkillId) => {
    toggleSkill(sessionId, skillId);
  }, [toggleSkill]);

  // Handle task start
  const handleTaskStart = useCallback((sessionId: CLISessionId, taskId: string) => {
    updateTaskStatus(sessionId, taskId, createRunningStatus());
    // Sync to TaskRunner store so TaskColumn shows correct status
    updateTaskRunnerStatus(taskId, createRunningStatus());
    // Fan-out: mark consolidated constituent requirements as running
    const session = sessions[sessionId];
    const task = session?.queue.find(t => t.id === taskId);
    if (task?.consolidatedFrom) {
      for (const constituentId of task.consolidatedFrom) {
        updateTaskRunnerStatus(constituentId, createRunningStatus());
      }
    }
  }, [sessions, updateTaskStatus, updateTaskRunnerStatus]);

  // Handle task completion - delete requirement file if successful
  const handleTaskComplete = useCallback(async (sessionId: CLISessionId, taskId: string, success: boolean) => {
    // Get task and session details before updating state
    const session = sessions[sessionId];
    const task = session?.queue.find(t => t.id === taskId);

    const finalStatus = success ? createCompletedStatus() : createFailedStatus('Task failed');

    // Update CLI store immediately
    updateTaskStatus(sessionId, taskId, finalStatus);
    // Sync to TaskRunner store so TaskColumn shows correct status
    updateTaskRunnerStatus(taskId, finalStatus);

    // Fan-out: mark consolidated constituent requirements with same status
    if (task?.consolidatedFrom) {
      for (const constituentId of task.consolidatedFrom) {
        updateTaskRunnerStatus(constituentId, finalStatus);
      }
    }

    // If successful, perform cleanup actions
    if (success && task) {
      // Git operations if enabled (UI-specific, not shared)
      if (session?.gitEnabled && session.gitConfig && session.projectId) {
        try {
          const commitMessage = generateCommitMessage(
            session.gitConfig.commitMessageTemplate,
            task.requirementName,
            task.projectName || 'Unknown'
          );

          await executeGitOperations(
            session.projectId,
            session.gitConfig.commands,
            commitMessage
          );
          // Git commit succeeded
        } catch (error) {
          console.error('[Git] Failed:', error);
          // Don't block - git failure is non-fatal
        }
      }

      // Shared cleanup: delete lead requirement file and update idea status
      const deleted = await performTaskCleanup(task.projectPath, task.requirementName);

      if (deleted) {
        // Notify parent to remove from requirements list (UI-specific)
        onRequirementCompleted?.(taskId, task.projectPath, task.requirementName);
      }

      // Cleanup consolidated constituent requirement files
      if (task.consolidatedRequirementNames) {
        for (const reqName of task.consolidatedRequirementNames) {
          const reqDeleted = await performTaskCleanup(task.projectPath, reqName);
          if (reqDeleted) {
            // Find the constituent ID to notify parent
            const constituentId = task.consolidatedFrom?.find(id => id.endsWith(`:${reqName}`));
            if (constituentId) {
              onRequirementCompleted?.(constituentId, task.projectPath, reqName);
            }
          }
        }
      }

      // Remove completed task from queue after short delay
      if (deleted || task.consolidatedRequirementNames) {
        setTimeout(() => {
          removeTask(sessionId, taskId);
        }, 2000); // Show completed state briefly before removing
      }
    }
  }, [sessions, updateTaskStatus, updateTaskRunnerStatus, removeTask, onRequirementCompleted]);

  // Handle queue empty
  const handleQueueEmpty = useCallback((sessionId: CLISessionId) => {
    setAutoStart(sessionId, false);
    setRunning(sessionId, false);
  }, [setAutoStart, setRunning]);

  // Handle execution change (for background processing / reconnection)
  const handleExecutionChange = useCallback((sessionId: CLISessionId, executionId: string | null, taskId: string | null) => {
    setCurrentExecution(sessionId, executionId, taskId);
  }, [setCurrentExecution]);

  // Handle git toggle
  const handleToggleGit = useCallback((sessionId: CLISessionId) => {
    const session = sessions[sessionId];
    const newEnabled = !session.gitEnabled;
    setGitEnabled(sessionId, newEnabled);

    // If enabling and no config, set defaults
    if (newEnabled && !session.gitConfig) {
      setGitConfig(sessionId, {
        commands: ['git add .', 'git commit -m "{commitMessage}"', 'git push'],
        commitMessageTemplate: 'Auto-commit: {requirementName}'
      });
    }
  }, [sessions, setGitEnabled, setGitConfig]);

  // Handle git config change
  const handleGitConfigChange = useCallback((sessionId: CLISessionId, config: { commands: string[]; commitMessageTemplate: string }) => {
    setGitConfig(sessionId, config);
    // Also enable git if it was disabled
    if (!sessions[sessionId].gitEnabled) {
      setGitEnabled(sessionId, true);
    }
  }, [sessions, setGitConfig, setGitEnabled]);

  // Handle provider change — clear cached strategy so next execution uses the correct one
  const handleProviderChange = useCallback((sessionId: CLISessionId, provider: CLIProvider) => {
    setProvider(sessionId, provider);
    clearSessionStrategy(sessionId);
  }, [setProvider]);

  // Handle model change
  const handleModelChange = useCallback((sessionId: CLISessionId, model: CLIModel | null) => {
    setModel(sessionId, model);
  }, [setModel]);

  return (
    <div className="space-y-3 w-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-700/30">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-md ${nerdMode ? 'bg-emerald-500/10' : 'bg-purple-500/10'}`}>
            <Terminal className={`w-4 h-4 ${nerdMode ? 'text-emerald-400' : 'text-purple-400'}`} />
          </div>
          <span className={`text-sm font-medium tracking-tight ${nerdMode ? 'font-mono text-gray-100' : 'text-gray-200'}`}>
            {nerdMode ? 'CLI :: SESSIONS' : 'CLI Sessions'}
          </span>
          <span className={`text-xs tabular-nums ${nerdMode ? 'font-mono text-gray-500' : 'text-gray-500'}`}>
            ({selectedTaskIds.length} selected)
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Auto-Assign Settings */}
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-lg transition-colors border bg-gray-700/30 text-gray-400 hover:bg-gray-700/50 hover:text-gray-300 border-gray-700"
            title="Auto-assign settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          {/* Nerd Mode Toggle */}
          <button
            onClick={toggleNerdMode}
            className={`p-2 rounded-lg transition-colors border ${
              nerdMode
                ? 'bg-emerald-600/20 text-emerald-400 border-emerald-600/40'
                : 'bg-gray-700/30 text-gray-400 hover:bg-gray-700/50 hover:text-gray-300 border-gray-700'
            }`}
            title={nerdMode ? 'Switch to rich UI' : 'Nerd mode (minimal UI)'}
          >
            <TerminalSquare className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Session Grid - 1 col on tablet/smaller, 2x2 on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {SESSIONS.map((sessionId, index) => (
          <CLISession
            key={sessionId}
            sessionId={sessionId}
            session={sessions[sessionId]}
            index={index}
            selectedCount={selectedTaskIds.length}
            onAddTasks={handleAddToSession}
            onDeleteSession={handleDeleteSession}
            onStartSession={handleStartSession}
            onToggleSkill={handleToggleSkill}
            onToggleGit={handleToggleGit}
            onGitConfigChange={handleGitConfigChange}
            onTaskStart={handleTaskStart}
            onTaskComplete={handleTaskComplete}
            onQueueEmpty={handleQueueEmpty}
            onExecutionChange={handleExecutionChange}
            onProviderChange={handleProviderChange}
            onModelChange={handleModelChange}
            nerdMode={nerdMode}
          />
        ))}
      </div>

      {/* Auto-Assign Settings Modal */}
      <AutoAssignSettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
