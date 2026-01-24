'use client';

import { useState, useEffect, useCallback } from 'react';
import { CompactTerminal } from '@/components/cli/CompactTerminal';
import type { QueuedTask } from '@/components/cli/types';

interface ReflectionTerminalProps {
  scope: 'project' | 'global';
  reflectionStatus: string;
  requirementName: string | null;
  runningReflectionId: string | null;
  activeProject: { id: string; name: string; path: string } | null;
  allProjects: { id: string; name: string; path: string }[];
  onStatusRefresh: () => void;
}

export function ReflectionTerminal({
  scope,
  reflectionStatus,
  requirementName,
  runningReflectionId,
  activeProject,
  allProjects,
  onStatusRefresh,
}: ReflectionTerminalProps) {
  const [terminalTask, setTerminalTask] = useState<QueuedTask | null>(null);
  const [autoStart, setAutoStart] = useState(false);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [storedTaskId, setStoredTaskId] = useState<string | null>(null);

  // When a running reflection is detected, create terminal task
  useEffect(() => {
    if (reflectionStatus === 'running' && requirementName) {
      const projectPath = scope === 'global'
        ? (allProjects[0]?.path?.replace(/[/\\][^/\\]+$/, '') || '.')
        : activeProject?.path;
      const projectName = scope === 'global' ? 'Global' : activeProject?.name;
      const projectId = scope === 'global' ? '__global__' : activeProject?.id;

      if (!projectPath || !projectId) return;

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
  const taskQueue = terminalTask ? [terminalTask] : [];

  if (!isRunning || !terminalTask || (!activeProject && scope !== 'global')) {
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
