'use client';

import { useCallback, useMemo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Terminal, Plus, Trash2, Play, CheckCircle, XCircle, Clock, RotateCcw, Copy, Check } from 'lucide-react';
import { CompactTerminal } from './CompactTerminal';
import type { CLIBatchPanelProps } from './types';
import { requirementToQueuedTask } from './types';
import {
  useCLISessionStore,
  useCLIRecovery,
  useCLIRecoveryStatus,
  type CLISessionId,
} from './store';

// Map old session IDs to new CLI session IDs
const SESSION_ID_MAP: Record<string, CLISessionId> = {
  session1: 'cliSession1',
  session2: 'cliSession2',
  session3: 'cliSession3',
  session4: 'cliSession4',
};

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

  // Recovery hook - recovers sessions on mount
  useCLIRecovery();
  const { isRecovering, sessionsToRecover } = useCLIRecoveryStatus();

  // Copy to clipboard state
  const [copiedTaskId, setCopiedTaskId] = useState<string | null>(null);

  // Copy requirement name to clipboard
  const handleCopyFilename = useCallback(async (taskId: string, requirementName: string) => {
    try {
      await navigator.clipboard.writeText(requirementName);
      setCopiedTaskId(taskId);
      setTimeout(() => setCopiedTaskId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, []);

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

  // Handle task start
  const handleTaskStart = useCallback((sessionId: CLISessionId, taskId: string) => {
    updateTaskStatus(sessionId, taskId, 'running');
  }, [updateTaskStatus]);

  // Handle task completion - delete requirement file if successful
  const handleTaskComplete = useCallback(async (sessionId: CLISessionId, taskId: string, success: boolean) => {
    // Get task details before updating state
    const task = sessions[sessionId]?.queue.find(t => t.id === taskId);

    // Update store immediately
    updateTaskStatus(sessionId, taskId, success ? 'completed' : 'failed');

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
  }, [sessions, updateTaskStatus, removeTask, onRequirementCompleted]);

  // Handle queue empty
  const handleQueueEmpty = useCallback((sessionId: CLISessionId) => {
    setAutoStart(sessionId, false);
    setRunning(sessionId, false);
  }, [setAutoStart, setRunning]);

  // Get session stats
  const getSessionStats = (session: typeof sessions[CLISessionId]) => {
    const pending = session.queue.filter(t => t.status === 'pending').length;
    const running = session.queue.filter(t => t.status === 'running').length;
    const completed = session.queue.filter(t => t.status === 'completed').length;
    const failed = session.queue.filter(t => t.status === 'failed').length;
    return { pending, running, completed, failed, total: session.queue.length };
  };

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
        {SESSIONS.map((sessionId, index) => {
          const session = sessions[sessionId];
          const stats = getSessionStats(session);
          const isRunning = session.isRunning;
          const hasQueue = stats.total > 0;
          const canStart = stats.pending > 0 && !isRunning;

          return (
            <motion.div
              key={sessionId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex flex-col bg-gray-800/30 border border-gray-700/50 rounded-lg overflow-hidden"
            >
              {/* Session Header */}
              <div className="flex items-center justify-between px-3 py-2 bg-gray-800/50 border-b border-gray-700/50">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-300">
                    Session {index + 1}
                  </span>
                  {/* Session resolved count */}
                  {session.completedCount > 0 && (
                    <span className="text-[9px] px-1.5 py-0.5 bg-green-500/10 text-green-400 rounded font-medium">
                      {session.completedCount} resolved
                    </span>
                  )}
                  {/* Claude session indicator */}
                  {session.claudeSessionId && (
                    <span className="text-[9px] text-purple-400/70 font-mono">
                      {session.claudeSessionId.slice(0, 6)}
                    </span>
                  )}
                  {/* Stats */}
                  {hasQueue && (
                    <div className="flex items-center gap-1.5 text-[10px]">
                      {stats.pending > 0 && (
                        <span className="flex items-center gap-0.5 text-amber-400">
                          <Clock className="w-2.5 h-2.5" />
                          {stats.pending}
                        </span>
                      )}
                      {stats.running > 0 && (
                        <span className="flex items-center gap-0.5 text-blue-400">
                          <Play className="w-2.5 h-2.5" />
                          {stats.running}
                        </span>
                      )}
                      {stats.completed > 0 && (
                        <span className="flex items-center gap-0.5 text-green-400">
                          <CheckCircle className="w-2.5 h-2.5" />
                          {stats.completed}
                        </span>
                      )}
                      {stats.failed > 0 && (
                        <span className="flex items-center gap-0.5 text-red-400">
                          <XCircle className="w-2.5 h-2.5" />
                          {stats.failed}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {/* Add selected */}
                  <button
                    onClick={() => handleAddToSession(sessionId)}
                    disabled={selectedTaskIds.length === 0}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title={`Add ${selectedTaskIds.length} selected tasks`}
                  >
                    <Plus className="w-3 h-3" />
                    <span>{selectedTaskIds.length}</span>
                  </button>

                  {/* Start */}
                  {canStart && (
                    <button
                      onClick={() => handleStartSession(sessionId)}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded transition-colors"
                      title="Start queue"
                    >
                      <Play className="w-3 h-3" />
                    </button>
                  )}

                  {/* Clear */}
                  {hasQueue && (
                    <button
                      onClick={() => handleClearSession(sessionId)}
                      className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                      title="Clear session"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Task Queue Preview */}
              {hasQueue && (
                <div className="px-3 py-1.5 border-b border-gray-700/30 max-h-[60px] overflow-y-auto">
                  <div className="flex flex-wrap gap-1">
                    {session.queue.slice(0, 6).map(task => (
                      <button
                        key={task.id}
                        onClick={() => handleCopyFilename(task.id, task.requirementName)}
                        className={`text-[9px] px-1.5 py-0.5 rounded truncate max-w-[100px] flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity ${
                          task.status === 'running' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                          task.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                          task.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                          'bg-gray-700/50 text-gray-400'
                        }`}
                        title={`${task.requirementName} (click to copy)`}
                      >
                        <span className="truncate">{task.requirementName.slice(0, 12)}</span>
                        {copiedTaskId === task.id ? (
                          <Check className="w-2.5 h-2.5 text-green-400 flex-shrink-0" />
                        ) : (
                          <Copy className="w-2.5 h-2.5 opacity-50 flex-shrink-0" />
                        )}
                      </button>
                    ))}
                    {session.queue.length > 6 && (
                      <span className="text-[9px] text-gray-500">
                        +{session.queue.length - 6}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Terminal */}
              <div className="flex-1 min-h-[200px]">
                {session.projectPath ? (
                  <CompactTerminal
                    instanceId={sessionId}
                    projectPath={session.projectPath}
                    title=""
                    className="h-full border-0 rounded-none"
                    taskQueue={session.queue}
                    autoStart={session.autoStart}
                    onTaskStart={(taskId) => handleTaskStart(sessionId, taskId)}
                    onTaskComplete={(taskId, success) => handleTaskComplete(sessionId, taskId, success)}
                    onQueueEmpty={() => handleQueueEmpty(sessionId)}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-600 text-xs">
                    Add tasks to start
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
