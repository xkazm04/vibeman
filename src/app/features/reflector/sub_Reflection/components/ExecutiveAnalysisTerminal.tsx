'use client';

import { useState, useEffect, useCallback } from 'react';
import { CompactTerminal } from '@/components/cli/CompactTerminal';
import type { QueuedTask } from '@/components/cli/types';

interface ExecutiveAnalysisTerminalProps {
  analysisStatus: string;
  promptContent: string | null;
  runningAnalysisId: string | null;
  projectPath: string;
  projectId?: string;
  projectName?: string;
  onStatusRefresh: () => void;
}

export function ExecutiveAnalysisTerminal({
  analysisStatus,
  promptContent,
  runningAnalysisId,
  projectPath,
  projectId = 'reflector',
  projectName = 'Reflector',
  onStatusRefresh,
}: ExecutiveAnalysisTerminalProps) {
  const [terminalTask, setTerminalTask] = useState<QueuedTask | null>(null);
  const [autoStart, setAutoStart] = useState(false);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [storedTaskId, setStoredTaskId] = useState<string | null>(null);

  // When a running analysis is detected with prompt content, create terminal task
  useEffect(() => {
    if (analysisStatus === 'running' && promptContent && runningAnalysisId) {
      const taskId = `exec-analysis-${runningAnalysisId}`;

      if (!terminalTask || terminalTask.id !== taskId) {
        const task: QueuedTask = {
          id: taskId,
          projectId,
          projectPath,
          projectName,
          requirementName: `Analysis ${runningAnalysisId.slice(0, 12)}`,
          status: 'pending',
          addedAt: Date.now(),
          directPrompt: promptContent,
        };
        setTerminalTask(task);
        setAutoStart(true);
      }
    }
  }, [analysisStatus, promptContent, runningAnalysisId, projectPath, projectId, projectName, terminalTask]);

  // Clean up terminal state when analysis completes/fails
  useEffect(() => {
    if (analysisStatus !== 'running' && terminalTask) {
      const timeout = setTimeout(() => setAutoStart(false), 2000);
      return () => clearTimeout(timeout);
    }
  }, [analysisStatus, terminalTask]);

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
    // Refresh status after a short delay to allow completion API to be processed
    setTimeout(onStatusRefresh, 1000);
  }, [terminalTask, onStatusRefresh]);

  const handleExecutionChange = useCallback((newExecId: string | null, newTaskId: string | null) => {
    setExecutionId(newExecId);
    setStoredTaskId(newTaskId);
  }, []);

  const isRunning = analysisStatus === 'running';
  const hasPrompt = !!promptContent;
  const taskQueue = terminalTask ? [terminalTask] : [];

  // Only show terminal if running AND we have the prompt content
  if (!isRunning || !hasPrompt || !terminalTask) {
    return null;
  }

  return (
    <div className="mb-4 rounded-lg overflow-hidden border border-purple-500/30 bg-gray-900/50">
      <div className="px-3 py-2 bg-purple-500/10 border-b border-purple-500/20">
        <span className="text-xs font-medium text-purple-300">
          Executive Analysis in Progress
        </span>
      </div>
      <CompactTerminal
        instanceId="executive-analysis"
        projectPath={projectPath}
        title="Executive Analysis"
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
