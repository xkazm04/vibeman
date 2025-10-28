'use client';
import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Loader2, ListPlus } from 'lucide-react';
import { Requirement, executeRequirementAsync, getTaskStatus } from '../lib/requirementApi';
import { getRunButtonText, getRunButtonTitle } from '../lib/requirementUtils';
import { usePollingTask } from '@/app/lib/hooks/usePollingTask';

interface ClaudeRequirementRunProps {
  requirement: Requirement;
  projectPath: string;
  projectId: string;
  isAnyRunning: boolean;
  executionQueueRef: React.MutableRefObject<string[]>;
  onStatusUpdate: (name: string, updates: Partial<Requirement>) => void;
  onQueueUpdate: () => void;
}

export default function ClaudeRequirementRun({
  requirement,
  projectPath,
  projectId,
  isAnyRunning,
  executionQueueRef,
  onStatusUpdate,
  onQueueUpdate,
}: ClaudeRequirementRunProps) {
  const runButtonText = getRunButtonText(requirement.status, isAnyRunning);
  const runButtonTitle = getRunButtonTitle(requirement.status, isAnyRunning);

  const isRunning = requirement.status === 'running';
  const isQueued = requirement.status === 'queued';
  const isDisabled = isRunning || isQueued;

  // State to track active task ID and polling
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const pollCountRef = useRef(0);
  const MAX_POLLS = 600; // 10 minutes max (600 * 2 seconds)

  // Polling function for task status
  const pollTaskStatus = async (signal: AbortSignal): Promise<any> => {
    if (!activeTaskId) {
      return null;
    }

    pollCountRef.current++;

    // Timeout safeguard
    if (pollCountRef.current >= MAX_POLLS) {
      console.error('[Execute] Task polling timeout - marking as failed');
      setPollingEnabled(false);

      onStatusUpdate(requirement.name, {
        status: 'failed',
        error: 'Execution timeout - task did not complete within 10 minutes',
      });

      onQueueUpdate();
      return null;
    }

    const task = await getTaskStatus(activeTaskId);

    // Update requirement status
    onStatusUpdate(requirement.name, {
      status: task.status,
      output: task.output,
      error: task.error,
      logFilePath: task.logFilePath,
      sessionLimitReached: task.sessionLimitReached,
    });

    // Stop polling if completed
    if (
      task.status === 'completed' ||
      task.status === 'failed' ||
      task.status === 'session-limit'
    ) {
      console.log(`[Execute] Finished: ${requirement.name}, status: ${task.status}`);
      setPollingEnabled(false);
      setActiveTaskId(null);
      pollCountRef.current = 0;
      onQueueUpdate(); // Trigger queue processing
    }

    return task;
  };

  // Use polling hook with cleanup
  const { error: pollingError } = usePollingTask(
    pollTaskStatus,
    {
      interval: 2000, // Poll every 2 seconds
      startImmediately: pollingEnabled,
      dependencies: [activeTaskId, pollingEnabled],
    }
  );

  // Handle polling errors
  useEffect(() => {
    if (pollingError && activeTaskId) {
      console.error('Polling error:', pollingError);
      // Don't stop polling on error, hook will retry automatically
    }
  }, [pollingError, activeTaskId]);

  const executeRequirement = async (name: string) => {
    console.log(`[Execute] Starting execution: ${name}`);

    // Update status to running
    onStatusUpdate(name, {
      status: 'running',
      startTime: new Date(),
      output: undefined,
      error: undefined,
    });

    // Remove from queue
    executionQueueRef.current = executionQueueRef.current.filter((n) => n !== name);
    console.log(`[Execute] Queue now has ${executionQueueRef.current.length} items`);
    onQueueUpdate();

    try {
      // Use async execution (non-blocking)
      const { taskId } = await executeRequirementAsync(projectPath, name, projectId);

      // Store task ID
      onStatusUpdate(name, { taskId });

      // Start polling via hook
      pollCountRef.current = 0;
      setActiveTaskId(taskId);
      setPollingEnabled(true);
    } catch (err: any) {
      // Failed to queue task
      console.error(`[Execute] Failed to queue: ${name}`, err);

      onStatusUpdate(name, {
        status: 'failed',
        error: err instanceof Error ? err.message : 'Failed to queue execution',
      });
    }
  };

  const handleRun = () => {
    if (isAnyRunning) {
      // Add to queue
      if (!executionQueueRef.current.includes(requirement.name)) {
        executionQueueRef.current.push(requirement.name);
        onStatusUpdate(requirement.name, { status: 'queued' });
        onQueueUpdate();
      }
    } else {
      // Execute immediately
      executeRequirement(requirement.name);
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleRun}
      disabled={isDisabled}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
        isDisabled
          ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
          : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white'
      }`}
      title={runButtonTitle}
    >
      {isRunning ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : isQueued ? (
        <ListPlus className="w-3 h-3" />
      ) : (
        <Play className="w-3 h-3" />
      )}
      <span>{runButtonText}</span>
    </motion.button>
  );
}
