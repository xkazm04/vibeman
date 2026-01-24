/**
 * Reflection Status Panel
 * Shows autonomous reflection agent status with CLI terminal for session visibility.
 * Fetches status on mount to recover from page reloads during active reflections.
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  Play,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  StopCircle,
} from 'lucide-react';
import { useBrainStore } from '@/stores/brainStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { useServerProjectStore } from '@/stores/serverProjectStore';
import { CompactTerminal } from '@/components/cli/CompactTerminal';
import type { QueuedTask } from '@/components/cli/types';

interface Props {
  isLoading: boolean;
  scope?: 'project' | 'global';
}

const POLL_INTERVAL_MS = 8000;

export default function ReflectionStatus({ isLoading, scope = 'project' }: Props) {
  const [isTriggering, setIsTriggering] = useState(false);
  const [terminalTask, setTerminalTask] = useState<QueuedTask | null>(null);
  const [autoStart, setAutoStart] = useState(false);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [storedTaskId, setStoredTaskId] = useState<string | null>(null);
  const [completionMessage, setCompletionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const prevStatusRef = useRef<string | null>(null);

  const activeProject = useActiveProjectStore((state) => state.activeProject);
  const allProjects = useServerProjectStore((state) => state.projects);
  const {
    reflectionStatus: projectStatus,
    lastReflection,
    decisionsSinceReflection,
    nextThreshold,
    shouldTrigger,
    triggerReason,
    runningReflectionId: projectRunningId,
    requirementName: projectRequirementName,
    globalReflectionStatus,
    lastGlobalReflection,
    globalRunningReflectionId,
    globalRequirementName,
    triggerReflection,
    triggerGlobalReflection,
    cancelReflection,
    fetchReflectionStatus,
    fetchGlobalReflectionStatus,
  } = useBrainStore();

  // Resolve scope-aware values
  const reflectionStatus = scope === 'global' ? globalReflectionStatus : projectStatus;
  const runningReflectionId = scope === 'global' ? globalRunningReflectionId : projectRunningId;
  const requirementName = scope === 'global' ? globalRequirementName : projectRequirementName;
  const lastReflectionForDisplay = scope === 'global' ? lastGlobalReflection : lastReflection;

  // Detect completion transitions and show feedback message
  useEffect(() => {
    const prev = prevStatusRef.current;
    if (prev === 'running' && reflectionStatus === 'completed') {
      setCompletionMessage({ type: 'success', text: 'Reflection completed successfully! Insights have been updated.' });
      const timeout = setTimeout(() => setCompletionMessage(null), 8000);
      return () => clearTimeout(timeout);
    }
    if (prev === 'running' && reflectionStatus === 'failed') {
      setCompletionMessage({ type: 'error', text: 'Reflection failed. Check the logs for details.' });
      const timeout = setTimeout(() => setCompletionMessage(null), 8000);
      return () => clearTimeout(timeout);
    }
    prevStatusRef.current = reflectionStatus;
  }, [reflectionStatus]);

  // Fetch status on mount to recover from page reloads
  useEffect(() => {
    if (scope === 'global') {
      fetchGlobalReflectionStatus();
    } else if (activeProject?.id) {
      fetchReflectionStatus(activeProject.id);
    }
  }, [scope, activeProject?.id, fetchReflectionStatus, fetchGlobalReflectionStatus]);

  // Poll while reflection is running to detect completion
  useEffect(() => {
    if (reflectionStatus === 'running') {
      pollRef.current = setInterval(() => {
        if (scope === 'global') {
          fetchGlobalReflectionStatus();
        } else if (activeProject?.id) {
          fetchReflectionStatus(activeProject.id);
        }
      }, POLL_INTERVAL_MS);
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [reflectionStatus, scope, activeProject?.id, fetchReflectionStatus, fetchGlobalReflectionStatus]);

  // When a running reflection is detected (fresh trigger or page reload), create terminal task
  useEffect(() => {
    if (reflectionStatus === 'running' && requirementName) {
      // For global mode, use workspace path; for project mode, require activeProject
      const projectPath = scope === 'global'
        ? (allProjects[0]?.path?.replace(/[/\\][^/\\]+$/, '') || '.')
        : activeProject?.path;
      const projectName = scope === 'global' ? 'Global' : activeProject?.name;
      const projectId = scope === 'global' ? '__global__' : activeProject?.id;

      if (!projectPath || !projectId) return;

      // Only create a new task if we don't already have one for this reflection
      if (!terminalTask || terminalTask.requirementName !== requirementName) {
        const task: QueuedTask = {
          id: `brain-reflection-${runningReflectionId || Date.now()}`,
          projectId,
          projectPath,
          projectName: projectName || 'Unknown',
          requirementName,
          status: 'pending',
          addedAt: Date.now(),
        };
        setTerminalTask(task);
        setAutoStart(true);
      }
    }
  }, [reflectionStatus, requirementName, runningReflectionId, scope, activeProject, allProjects, terminalTask]);

  // Clean up terminal state when reflection completes/fails
  useEffect(() => {
    if (reflectionStatus !== 'running' && terminalTask) {
      // Delay cleanup slightly so terminal can show final state
      const timeout = setTimeout(() => {
        setAutoStart(false);
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [reflectionStatus, terminalTask]);

  const handleTrigger = async () => {
    setIsTriggering(true);
    setCompletionMessage(null);
    try {
      if (scope === 'global') {
        const projects = allProjects.map(p => ({ id: p.id, name: p.name, path: p.path }));
        const workspacePath = projects[0]?.path?.replace(/[/\\][^/\\]+$/, '') || '.';
        await triggerGlobalReflection(projects, workspacePath);
      } else {
        if (!activeProject) return;
        await triggerReflection(activeProject.id, activeProject.name, activeProject.path);
      }
    } finally {
      setIsTriggering(false);
    }
  };

  const handleCancel = async () => {
    if (!activeProject && scope !== 'global') return;
    await cancelReflection(scope === 'global' ? '__global__' : activeProject!.id);
    setTerminalTask(null);
    setAutoStart(false);
  };

  const handleTaskStart = useCallback((taskId: string) => {
    setStoredTaskId(taskId);
    if (terminalTask) {
      setTerminalTask({ ...terminalTask, status: 'running', startedAt: Date.now() });
    }
  }, [terminalTask]);

  const handleTaskComplete = useCallback((taskId: string, success: boolean) => {
    setAutoStart(false);
    setExecutionId(null);
    setStoredTaskId(null);
    if (terminalTask) {
      setTerminalTask({
        ...terminalTask,
        status: success ? 'completed' : 'failed',
        completedAt: Date.now(),
      });
    }
    // Fetch final status from server
    if (scope === 'global') {
      fetchGlobalReflectionStatus();
    } else if (activeProject?.id) {
      fetchReflectionStatus(activeProject.id);
    }
  }, [terminalTask, scope, activeProject?.id, fetchReflectionStatus, fetchGlobalReflectionStatus]);

  const handleExecutionChange = useCallback((newExecId: string | null, newTaskId: string | null) => {
    setExecutionId(newExecId);
    setStoredTaskId(newTaskId);
  }, []);

  if (isLoading) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-zinc-200">Reflection Agent</h2>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-zinc-800 rounded w-3/4" />
          <div className="h-8 bg-zinc-800 rounded" />
        </div>
      </div>
    );
  }

  const progress = nextThreshold > 0
    ? Math.min((decisionsSinceReflection / nextThreshold) * 100, 100)
    : 0;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const isRunning = reflectionStatus === 'running';
  const taskQueue = terminalTask ? [terminalTask] : [];

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-zinc-200">
            {scope === 'global' ? 'Global Reflection' : 'Reflection Agent'}
          </h2>
        </div>

        {/* Status Badge */}
        <div
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            reflectionStatus === 'running'
              ? 'bg-blue-500/20 text-blue-400'
              : reflectionStatus === 'completed'
              ? 'bg-green-500/20 text-green-400'
              : reflectionStatus === 'failed'
              ? 'bg-red-500/20 text-red-400'
              : 'bg-zinc-700/50 text-zinc-400'
          }`}
        >
          {reflectionStatus === 'running' ? (
            <span className="flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Running
            </span>
          ) : reflectionStatus === 'completed' ? (
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Idle
            </span>
          ) : reflectionStatus === 'failed' ? (
            <span className="flex items-center gap-1">
              <XCircle className="w-3 h-3" />
              Failed
            </span>
          ) : (
            'Idle'
          )}
        </div>
      </div>

      {/* Completion Feedback */}
      {completionMessage && (
        <div
          className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
            completionMessage.type === 'success'
              ? 'bg-green-500/10 border border-green-500/20'
              : 'bg-red-500/10 border border-red-500/20'
          }`}
        >
          {completionMessage.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          )}
          <span className={`text-sm ${completionMessage.type === 'success' ? 'text-green-300' : 'text-red-300'}`}>
            {completionMessage.text}
          </span>
          <button
            onClick={() => setCompletionMessage(null)}
            className="ml-auto text-xs text-zinc-500 hover:text-zinc-300"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Last Reflection */}
      <div className="flex items-center gap-2 text-sm text-zinc-400 mb-4">
        <Clock className="w-4 h-4" />
        <span>Last {scope === 'global' ? 'global ' : ''}reflection: {formatDate(lastReflectionForDisplay?.completed_at || null)}</span>
      </div>

      {/* CLI Terminal - shown when reflection is running or just completed */}
      {isRunning && terminalTask && (activeProject || scope === 'global') && (
        <div className="mb-4 rounded-lg overflow-hidden border border-zinc-800/50">
          <CompactTerminal
            instanceId={`brain-reflection-${scope}`}
            projectPath={terminalTask.projectPath}
            title={scope === 'global' ? 'Global Reflection' : 'Reflection Session'}
            className="h-[250px]"
            taskQueue={taskQueue}
            autoStart={autoStart}
            onTaskStart={handleTaskStart}
            onTaskComplete={handleTaskComplete}
            onQueueEmpty={() => setAutoStart(false)}
            currentExecutionId={executionId}
            currentStoredTaskId={storedTaskId}
            onExecutionChange={handleExecutionChange}
          />
        </div>
      )}

      {/* Progress to Next Trigger (hidden when running, project mode only) */}
      {!isRunning && scope === 'project' && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-zinc-500">Decisions until next reflection</span>
            <span className="text-xs text-zinc-400">
              {decisionsSinceReflection} / {nextThreshold}
            </span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Trigger Reason (project mode only) */}
      {shouldTrigger && !isRunning && scope === 'project' && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 mb-4">
          <AlertTriangle className="w-4 h-4 text-purple-400 flex-shrink-0" />
          <span className="text-xs text-purple-300">{triggerReason}</span>
        </div>
      )}

      {/* Action Buttons */}
      {isRunning ? (
        <button
          onClick={handleCancel}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
        >
          <StopCircle className="w-4 h-4" />
          Cancel Reflection
        </button>
      ) : (
        <button
          onClick={handleTrigger}
          disabled={isTriggering}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            isTriggering
              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              : shouldTrigger
              ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white hover:opacity-90'
              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
          }`}
        >
          {isTriggering ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              {scope === 'global' ? 'Trigger Global Reflection' : 'Trigger Reflection'}
            </>
          )}
        </button>
      )}

      {/* Info Text */}
      <p className="text-xs text-zinc-600 mt-3 text-center">
        {scope === 'global'
          ? 'Global reflection analyzes patterns across all projects and identifies cross-project meta-patterns.'
          : 'Reflection analyzes your direction decisions and updates brain-guide.md with learned patterns.'}
      </p>
    </div>
  );
}
