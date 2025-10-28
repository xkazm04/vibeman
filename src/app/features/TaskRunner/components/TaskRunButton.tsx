'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { Play, Loader2, Pause } from 'lucide-react';
import type { ProjectRequirement, TaskRunnerActions } from '../lib/types';

interface TaskRunButtonProps {
  selectedRequirements: Set<string>;
  isRunning: boolean;
  isPaused: boolean;
  executionQueueRef: React.MutableRefObject<string[]>;
  isExecutingRef: React.MutableRefObject<boolean>;
  requirements: ProjectRequirement[];
  actions: TaskRunnerActions;
  getRequirementId: (req: ProjectRequirement) => string;
  executeNextRequirement: () => void;
  onPause: () => void;
  onResume: () => void;
}

export default function TaskRunButton({
  selectedRequirements,
  isRunning,
  isPaused,
  executionQueueRef,
  requirements,
  actions,
  getRequirementId,
  executeNextRequirement,
  onPause,
  onResume,
}: TaskRunButtonProps) {
  const { setRequirements, setIsRunning, setProcessedCount, setError } = actions;

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

  return (
    <div className="flex items-center gap-3">
      {/* Main Run Button - Compact circular or small pill shape */}
      <motion.button
        whileHover={{ scale: selectedRequirements.size > 0 && !isRunning ? 1.1 : 1 }}
        whileTap={{ scale: selectedRequirements.size > 0 && !isRunning ? 0.9 : 1 }}
        onClick={handleBatchRun}
        disabled={selectedRequirements.size === 0 || isRunning}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm
          transition-all duration-200 shadow-lg
          ${
            selectedRequirements.size === 0 || isRunning
              ? 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700/50'
              : 'bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white border border-emerald-500/30 shadow-emerald-500/20'
          }
        `}
        title={
          selectedRequirements.size === 0
            ? 'Select requirements to run'
            : `Run ${selectedRequirements.size} requirement${selectedRequirements.size > 1 ? 's' : ''}`
        }
      >
        {isRunning ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Running</span>
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            {selectedRequirements.size > 0 && (
              <span className="font-bold">{selectedRequirements.size}</span>
            )}
          </>
        )}
      </motion.button>

      {/* Pause/Resume Button - Only show when running */}
      {isRunning && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={isPaused ? onResume : onPause}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm
            transition-all duration-200 shadow-lg
            ${
              isPaused
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white border border-blue-500/30 shadow-blue-500/20'
                : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white border border-orange-500/30 shadow-orange-500/20'
            }
          `}
          title={isPaused ? 'Resume queue execution' : 'Pause queue execution'}
        >
          {isPaused ? (
            <>
              <Play className="w-4 h-4" />
              <span>Resume</span>
            </>
          ) : (
            <>
              <Pause className="w-4 h-4" />
              <span>Pause</span>
            </>
          )}
        </motion.button>
      )}
    </div>
  );
}
