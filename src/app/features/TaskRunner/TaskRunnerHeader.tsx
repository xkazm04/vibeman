'use client';
import React, { useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Loader2, Zap, X } from 'lucide-react';
import { executeRequirementAsync, getTaskStatus, deleteRequirement } from '@/app/Claude/lib/requirementApi';
import type { ProjectRequirement, TaskRunnerActions } from './lib/types';

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

  const executeNextRequirement = useCallback(async () => {
    if (executionQueueRef.current.length === 0 || isExecutingRef.current) return;

    isExecutingRef.current = true;
    const reqId = executionQueueRef.current[0];
    const req = requirements.find((r) => getRequirementId(r) === reqId);

    if (!req) {
      executionQueueRef.current.shift();
      isExecutingRef.current = false;
      return;
    }

    console.log(`[TaskRunner] Executing: ${req.requirementName} (${req.projectName})`);

    // Update status to running
    setRequirements((prev) =>
      prev.map((r) =>
        getRequirementId(r) === reqId
          ? { ...r, status: 'running' as const }
          : r
      )
    );

    // Remove from queue
    executionQueueRef.current.shift();
    setProcessedCount((prev) => prev + 1);

    try {
      // Start async execution
      const { taskId } = await executeRequirementAsync(
        req.projectPath,
        req.requirementName,
        req.projectId
      );

      // Store task ID (should be the requirement name)
      setRequirements((prev) =>
        prev.map((r) =>
          getRequirementId(r) === reqId ? { ...r, taskId } : r
        )
      );

      // Poll for status using the requirement name as task ID
      const pollInterval = setInterval(async () => {
        try {
          const task = await getTaskStatus(req.requirementName);

          setRequirements((prev) =>
            prev.map((r) =>
              getRequirementId(r) === reqId
                ? { ...r, status: task.status }
                : r
            )
          );

          // Stop polling if completed
          if (
            task.status === 'completed' ||
            task.status === 'failed' ||
            task.status === 'session-limit'
          ) {
            clearInterval(pollInterval);
            isExecutingRef.current = false;

            // Handle completion
            if (task.status === 'completed') {
              // Delete requirement file after successful completion
              try {
                await deleteRequirement(req.projectPath, req.requirementName);
                // Remove from requirements list
                setRequirements((prev) => prev.filter((r) => getRequirementId(r) !== reqId));
                console.log(`[TaskRunner] Successfully completed and deleted: ${req.requirementName}`);
              } catch (deleteError) {
                console.error('Failed to delete completed requirement:', deleteError);
                setError(`Failed to delete completed requirement: ${req.requirementName}`);
              }
            } else if (task.status === 'failed') {
              const errorMessage = task.error || 'Unknown error';
              const logInfo = task.logFilePath ? ` Check log: ${task.logFilePath}` : '';
              console.error(`[TaskRunner] Task failed:`, {
                requirementName: req.requirementName,
                error: errorMessage,
                logFilePath: task.logFilePath,
                progress: task.progress,
              });
              setError(`Task failed: ${req.requirementName}\nError: ${errorMessage}${logInfo}`);
            } else if (task.status === 'session-limit') {
              const errorMessage = task.error || 'Session limit reached';
              console.log('[TaskRunner] Session limit reached, clearing queue');
              setError(`Session limit reached: ${errorMessage}\nPlease try again later.`);
              executionQueueRef.current = [];
              setIsRunning(false);
              setRequirements((prev) =>
                prev.map((r) =>
                  r.status === 'queued' ? { ...r, status: 'idle' as const } : r
                )
              );
            }
          }
        } catch (pollErr) {
          console.error('Error polling task status:', pollErr);
        }
      }, 2000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[TaskRunner] Failed to execute ${req.requirementName}:`, {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
      isExecutingRef.current = false;
      setError(`Failed to execute: ${req.requirementName}\nError: ${errorMessage}`);

      setRequirements((prev) =>
        prev.map((r) =>
          getRequirementId(r) === reqId
            ? { ...r, status: 'failed' as const }
            : r
        )
      );
    }
  }, [requirements, getRequirementId, setRequirements, setProcessedCount, setError, setIsRunning]);

  // Auto-process queue - execute next requirement when current finishes
  useEffect(() => {
    const runningReq = requirements.find((r) => r.status === 'running');

    if (!runningReq && executionQueueRef.current.length > 0 && !isExecutingRef.current) {
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
  }, [requirements, isRunning, setIsRunning, setProcessedCount, executeNextRequirement]);

  const handleBatchRun = () => {
    if (selectedRequirements.size === 0 || isRunning) return;

    console.log(`[TaskRunner] Starting batch run of ${selectedRequirements.size} requirements`);
    setError(undefined); // Clear any previous errors

    // Queue all selected requirements
    executionQueueRef.current = Array.from(selectedRequirements);

    // Update all as queued
    setRequirements((prev) =>
      prev.map((r) =>
        selectedRequirements.has(getRequirementId(r))
          ? { ...r, status: 'queued' as const }
          : r
      )
    );

    setIsRunning(true);
    setProcessedCount(0);

    // Start execution
    setTimeout(() => {
      executeNextRequirement();
    }, 100);
  };

  const clearError = () => {
    setError(undefined);
  };

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
                  <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                    <span className="text-sm text-blue-400 font-medium">
                      Processing {processedCount} / {selectedCount}
                    </span>
                  </div>
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
              <motion.button
                whileHover={{ scale: selectedCount > 0 && !isRunning ? 1.05 : 1 }}
                whileTap={{ scale: selectedCount > 0 && !isRunning ? 0.95 : 1 }}
                onClick={handleBatchRun}
                disabled={selectedCount === 0 || isRunning}
                className={`
                  flex items-center gap-3 px-8 py-4 rounded-lg font-semibold text-base
                  transition-all duration-200 shadow-lg
                  ${
                    selectedCount === 0 || isRunning
                      ? 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700/50'
                      : 'bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white border border-emerald-500/30 shadow-emerald-500/20'
                  }
                `}
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Running...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    <span>
                      {selectedCount === 0
                        ? 'Select Requirements'
                        : `Run ${selectedCount} Requirement${selectedCount > 1 ? 's' : ''}`}
                    </span>
                  </>
                )}
              </motion.button>
            </div>

            {/* Right: Placeholder for balance */}
            <div className="w-[200px]" />
          </div>
        </div>
      </div>
    </div>
  );
}
