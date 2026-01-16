'use client';

import { useCallback, useMemo } from 'react';
import { Terminal, RotateCcw } from 'lucide-react';
import { CLISession } from './CLISession';
import type { CLIBatchPanelProps } from './types';
import { requirementToQueuedTask } from './types';
import {
  useCLISessionStore,
  useCLIRecovery,
  useCLIRecoveryStatus,
  type CLISessionId,
} from './store';
import type { SkillId } from './skills';
import {
  useTaskRunnerStore,
  createRunningStatus,
  createCompletedStatus,
  createFailedStatus,
} from '@/app/features/TaskRunner/store';

const SESSIONS: CLISessionId[] = ['cliSession1', 'cliSession2', 'cliSession3', 'cliSession4'];

/**
 * Delete a requirement file after successful completion
 */
async function deleteRequirementFile(projectPath: string, requirementName: string): Promise<boolean> {
  try {
    const response = await fetch('/api/claude-code/requirement', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectPath, requirementName }),
    });
    return response.ok;
  } catch (error) {
    console.error('Failed to delete requirement:', error);
    return false;
  }
}

/**
 * Update idea status to implemented
 */
async function updateIdeaStatus(requirementName: string): Promise<void> {
  try {
    await fetch('/api/ideas/update-implementation-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requirementName }),
    });
  } catch {
    // Silently ignore - non-critical
  }
}

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
}: CLIBatchPanelProps) {
  // Use persistent store for sessions
  const sessions = useCLISessionStore((state) => state.sessions);
  const addTasksToSession = useCLISessionStore((state) => state.addTasksToSession);
  const clearSession = useCLISessionStore((state) => state.clearSession);
  const setAutoStart = useCLISessionStore((state) => state.setAutoStart);
  const setRunning = useCLISessionStore((state) => state.setRunning);
  const updateTaskStatus = useCLISessionStore((state) => state.updateTaskStatus);
  const removeTask = useCLISessionStore((state) => state.removeTask);
  const toggleSkill = useCLISessionStore((state) => state.toggleSkill);
  const setCurrentExecution = useCLISessionStore((state) => state.setCurrentExecution);

  // TaskRunner store for syncing task status to TaskColumn
  const updateTaskRunnerStatus = useTaskRunnerStore((state) => state.updateTaskStatus);

  // Recovery hook - recovers sessions on mount
  useCLIRecovery();
  const { isRecovering, sessionsToRecover } = useCLIRecoveryStatus();

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
    onClearSelection?.();
  }, [selectedRequirements, getRequirementId, addTasksToSession, onClearSelection]);

  // Clear a session
  const handleClearSession = useCallback((sessionId: CLISessionId) => {
    clearSession(sessionId);
  }, [clearSession]);

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
    updateTaskStatus(sessionId, taskId, 'running');
    // Sync to TaskRunner store so TaskColumn shows correct status
    updateTaskRunnerStatus(taskId, createRunningStatus());
  }, [updateTaskStatus, updateTaskRunnerStatus]);

  // Handle task completion - delete requirement file if successful
  const handleTaskComplete = useCallback(async (sessionId: CLISessionId, taskId: string, success: boolean) => {
    // Get task details before updating state
    const task = sessions[sessionId]?.queue.find(t => t.id === taskId);

    // Update CLI store immediately
    updateTaskStatus(sessionId, taskId, success ? 'completed' : 'failed');
    // Sync to TaskRunner store so TaskColumn shows correct status
    updateTaskRunnerStatus(taskId, success ? createCompletedStatus() : createFailedStatus('Task failed'));

    // If successful, perform cleanup actions
    if (success && task) {
      // Update idea status (fire-and-forget)
      updateIdeaStatus(task.requirementName);

      // Delete the requirement file
      const deleted = await deleteRequirementFile(task.projectPath, task.requirementName);

      if (deleted) {
        // Notify parent to remove from requirements list
        onRequirementCompleted?.(taskId, task.projectPath, task.requirementName);

        // Remove completed task from queue after short delay
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

  return (
    <div className="space-y-3 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-gray-200">CLI Sessions</span>
          <span className="text-xs text-gray-500">
            ({selectedTaskIds.length} selected)
          </span>
          {/* Recovery indicator */}
          {isRecovering && sessionsToRecover > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-amber-400 px-1.5 py-0.5 bg-amber-500/10 rounded">
              <RotateCcw className="w-3 h-3 animate-spin" />
              Recovering {sessionsToRecover}
            </span>
          )}
        </div>
      </div>

      {/* Session Grid - 2x2 */}
      <div className="grid grid-cols-2 gap-3">
        {SESSIONS.map((sessionId, index) => (
          <CLISession
            key={sessionId}
            sessionId={sessionId}
            session={sessions[sessionId]}
            index={index}
            selectedCount={selectedTaskIds.length}
            onAddTasks={handleAddToSession}
            onClearSession={handleClearSession}
            onStartSession={handleStartSession}
            onToggleSkill={handleToggleSkill}
            onTaskStart={handleTaskStart}
            onTaskComplete={handleTaskComplete}
            onQueueEmpty={handleQueueEmpty}
            onExecutionChange={handleExecutionChange}
          />
        ))}
      </div>
    </div>
  );
}
