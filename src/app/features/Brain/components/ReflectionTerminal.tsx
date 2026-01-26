'use client';

import { useState, useEffect, useCallback } from 'react';
import { CompactTerminal } from '@/components/cli/CompactTerminal';
import type { QueuedTask } from '@/components/cli/types';

interface ReflectionTerminalProps {
  scope: 'project' | 'global';
  reflectionStatus: string;
  /** Direct prompt content for CLI execution (no file) */
  promptContent: string | null;
  runningReflectionId: string | null;
  activeProject: { id: string; name: string; path: string } | null;
  allProjects: { id: string; name: string; path: string }[];
  onStatusRefresh: () => void;
}

export function ReflectionTerminal({
  scope,
  reflectionStatus,
  promptContent,
  runningReflectionId,
  activeProject,
  allProjects,
  onStatusRefresh,
}: ReflectionTerminalProps) {
  const [terminalTask, setTerminalTask] = useState<QueuedTask | null>(null);
  const [autoStart, setAutoStart] = useState(false);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [storedTaskId, setStoredTaskId] = useState<string | null>(null);

  // When a running reflection is detected with prompt content, create terminal task
  useEffect(() => {
    if (reflectionStatus === 'running' && promptContent && runningReflectionId) {
      const projectPath = scope === 'global'
        ? (allProjects[0]?.path?.replace(/[/\\][^/\\]+$/, '') || '.')
        : activeProject?.path;
      const projectName = scope === 'global' ? 'Global' : activeProject?.name;
      const projectId = scope === 'global' ? '__global__' : activeProject?.id;

      if (!projectPath || !projectId) return;

      // Use reflection ID as the task identifier
      const taskId = `brain-reflection-${runningReflectionId}`;

      if (!terminalTask || terminalTask.id !== taskId) {
        const task: QueuedTask = {
          id: taskId,
          projectId,
          projectPath,
          projectName: projectName || 'Unknown',
          requirementName: `Reflection ${runningReflectionId.slice(0, 12)}`, // Display name only
          status: 'pending',
          addedAt: Date.now(),
          directPrompt: promptContent, // Use direct prompt instead of file
        };
        setTerminalTask(task);
        setAutoStart(true);
      }
    }
  }, [reflectionStatus, promptContent, runningReflectionId, scope, activeProject, allProjects, terminalTask]);

  // Clean up terminal state when reflection completes/fails
  useEffect(() => {
    if (reflectionStatus !== 'running' && terminalTask) {
      const timeout = setTimeout(() => setAutoStart(false), 2000);
      return () => clearTimeout(timeout);
    }
  }, [reflectionStatus, terminalTask]);

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
    onStatusRefresh();
  }, [terminalTask, onStatusRefresh]);

  const handleExecutionChange = useCallback((newExecId: string | null, newTaskId: string | null) => {
    setExecutionId(newExecId);
    setStoredTaskId(newTaskId);
  }, []);

  const isRunning = reflectionStatus === 'running';
  const hasPrompt = !!promptContent;
  const taskQueue = terminalTask ? [terminalTask] : [];

  // Only show terminal if running AND we have the prompt content
  // (prompt content is only available right after triggering, not on page refresh)
  if (!isRunning || !hasPrompt || !terminalTask || (!activeProject && scope !== 'global')) {
    return null;
  }

  return (
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
  );
}
