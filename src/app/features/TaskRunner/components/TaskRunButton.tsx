'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { Play, Loader2, Pause } from 'lucide-react';
import { GradientButton } from '@/components/ui';
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
      {/* Main Run Button */}
      <GradientButton
        onClick={handleBatchRun}
        disabled={selectedRequirements.size === 0 || isRunning}
        colorScheme="emerald"
        icon={isRunning ? Loader2 : Play}
        iconPosition="left"
        loading={isRunning}
        size="md"
        title={
          selectedRequirements.size === 0
            ? 'Select requirements to run'
            : `Run ${selectedRequirements.size} requirement${selectedRequirements.size > 1 ? 's' : ''}`
        }
        className={selectedRequirements.size === 0 || isRunning ? 'opacity-50' : ''}
      >
        {isRunning ? 'Running' : selectedRequirements.size > 0 ? `${selectedRequirements.size}` : 'Run'}
      </GradientButton>

      {/* Pause/Resume Button - Only show when running */}
      {isRunning && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
        >
          <GradientButton
            onClick={isPaused ? onResume : onPause}
            colorScheme={isPaused ? 'blue' : 'orange'}
            icon={isPaused ? Play : Pause}
            iconPosition="left"
            size="md"
            title={isPaused ? 'Resume queue execution' : 'Pause queue execution'}
          >
            {isPaused ? 'Resume' : 'Pause'}
          </GradientButton>
        </motion.div>
      )}
    </div>
  );
}
