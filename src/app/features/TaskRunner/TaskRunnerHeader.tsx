'use client';
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Zap, X } from 'lucide-react';
import type { ProjectRequirement, TaskRunnerActions } from './lib/types';
import QueueVisualization from './components/QueueVisualization';
import TaskRunButton from './components/TaskRunButton';
import { executeNextRequirement as executeTask } from './lib/taskExecutor';

interface TaskRunnerHeaderProps {
  selectedCount: number;
  totalCount: number;
  processedCount: number;
  isRunning: boolean;
  error?: string;
  requirements: ProjectRequirement[];
  selectedRequirements: Set<string>;
  actions: TaskRunnerActions;
  getRequirementId: (req: ProjectRequirement) => string;
}

export default function TaskRunnerHeader({
  selectedCount,
  totalCount,
  processedCount,
  isRunning,
  error,
  requirements,
  selectedRequirements,
  actions,
  getRequirementId,
}: TaskRunnerHeaderProps) {
  const executionQueueRef = useRef<string[]>([]);
  const isExecutingRef = useRef(false);
  const { setRequirements, setIsRunning, setProcessedCount, setError } = actions;

  // Pause/Resume state management with localStorage
  const [isPaused, setIsPaused] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('taskRunnerPaused');
      return stored === 'true';
    }
    return false;
  });

  // Persist pause state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('taskRunnerPaused', isPaused.toString());
    }
  }, [isPaused]);

  // Wrapper for executeNextRequirement from taskExecutor
  const executeNextRequirement = useCallback(() => {
    executeTask({
      executionQueueRef,
      isExecutingRef,
      isPaused,
      requirements,
      actions,
      getRequirementId,
      executeNextRequirement: () => executeNextRequirement(),
    });
  }, [requirements, getRequirementId, actions, isPaused]);

  // Auto-process queue - execute next requirement when current finishes
  useEffect(() => {
    const runningReq = requirements.find((r) => r.status === 'running');

    if (!runningReq && executionQueueRef.current.length > 0 && !isExecutingRef.current && !isPaused) {
      const nextReqId = executionQueueRef.current[0];
      console.log(`[TaskRunner] Auto-processing next requirement: ${nextReqId}`);
      executeNextRequirement();
    }

    // Check if all queued items are done
    if (isRunning && executionQueueRef.current.length === 0 && !runningReq) {
      console.log('[TaskRunner] All requirements completed');
      setIsRunning(false);
      setProcessedCount(0);
    }
  }, [requirements, isRunning, setIsRunning, setProcessedCount, executeNextRequirement, isPaused]);

  const clearError = () => {
    setError(undefined);
  };

  const handlePause = () => {
    console.log('[TaskRunner] Pausing queue execution');
    setIsPaused(true);
  };

  const handleResume = () => {
    console.log('[TaskRunner] Resuming queue execution');
    setIsPaused(false);
    // Trigger queue processing after resume
    setTimeout(() => {
      if (executionQueueRef.current.length > 0 && !isExecutingRef.current) {
        executeNextRequirement();
      }
    }, 100);
  };

  // Filter requirements to show active queue items
  const activeQueueItems = requirements.filter(
    (r) =>
      r.status === 'queued' ||
      r.status === 'running' ||
      r.status === 'completed' ||
      r.status === 'failed' ||
      r.status === 'session-limit'
  );

  return (
    <div className="relative space-y-4">
      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <X className="w-5 h-5 text-red-400" />
            <span className="text-red-400 font-medium">{error}</span>
          </div>
          <button
            onClick={clearError}
            className="text-red-400 hover:text-red-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Queue Visualization */}
      {activeQueueItems.length > 0 && (
        <QueueVisualization
          requirements={requirements}
          getRequirementId={getRequirementId}
        />
      )}

      {/* Main Header */}
      <div className="relative">
        {/* Ambient Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/10 via-blue-900/10 to-cyan-900/10 rounded-lg blur-xl" />

        <div className="relative bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            {/* Left: Title and Stats */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded-lg">
                  <Zap className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                    Task Runner
                  </h1>
                  <p className="text-sm text-gray-500">
                    Batch execute Claude Code requirements
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 ml-8">
                {isRunning ? (
                  <>
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                      <span className="text-sm text-blue-400 font-medium">
                        Processing {processedCount} / {selectedCount}
                      </span>
                    </div>
                    {isPaused && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/30 rounded-lg"
                      >
                        <span className="text-sm text-orange-400 font-medium">
                          Queue Paused
                        </span>
                      </motion.div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg">
                    <span className="text-sm text-gray-400">
                      <span className="text-emerald-400 font-semibold">{selectedCount}</span> selected
                    </span>
                    <span className="text-gray-600">•</span>
                    <span className="text-sm text-gray-500">
                      {totalCount} total
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Center: Batch Run Button */}
            <div className="flex-1 flex justify-center">
              <TaskRunButton
                selectedRequirements={selectedRequirements}
                isRunning={isRunning}
                isPaused={isPaused}
                executionQueueRef={executionQueueRef}
                isExecutingRef={isExecutingRef}
                requirements={requirements}
                actions={actions}
                getRequirementId={getRequirementId}
                executeNextRequirement={executeNextRequirement}
                onPause={handlePause}
                onResume={handleResume}
              />
            </div>

            {/* Right: Placeholder for balance */}
            <div className="w-[200px]" />
          </div>
        </div>
      </div>
    </div>
  );
}
