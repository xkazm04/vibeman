/**
 * PipelineFlowViz — Horizontal pipeline stage visualization
 *
 * Displays 5 stage cards connected by animated arrows.
 * Particles flow along arrows when pipeline is running.
 */

'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { PIPELINE_STAGES } from '../../lib/conductor/types';
import type { PipelineRun, PipelineStage, StageState } from '../../lib/conductor/types';
import StageCard from './StageCard';

interface PipelineFlowVizProps {
  run: PipelineRun | null;
  onStageClick?: (stage: PipelineStage) => void;
}

function ConnectorArrow({
  isActive,
  isCompleted,
}: {
  isActive: boolean;
  isCompleted: boolean;
}) {
  return (
    <div className="flex items-center justify-center w-12 relative">
      {/* Base line */}
      <div
        className={`h-[2px] w-full transition-colors duration-300
          ${isCompleted ? 'bg-emerald-500/60' : isActive ? 'bg-cyan-500/60' : 'bg-gray-700/40'}
        `}
      />

      {/* Arrow head */}
      <div
        className={`absolute right-0 w-0 h-0
          border-l-[6px] border-y-[4px] border-y-transparent transition-colors duration-300
          ${isCompleted ? 'border-l-emerald-500/60' : isActive ? 'border-l-cyan-500/60' : 'border-l-gray-700/40'}
        `}
      />

      {/* Animated particle (only when active) */}
      {isActive && (
        <motion.div
          className="absolute w-2 h-2 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/60"
          animate={{ x: ['-20px', '48px'] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
    </div>
  );
}

const EMPTY_STAGES: Record<PipelineStage, StageState> = {
  scout: { status: 'pending', itemsIn: 0, itemsOut: 0 },
  triage: { status: 'pending', itemsIn: 0, itemsOut: 0 },
  batch: { status: 'pending', itemsIn: 0, itemsOut: 0 },
  execute: { status: 'pending', itemsIn: 0, itemsOut: 0 },
  review: { status: 'pending', itemsIn: 0, itemsOut: 0 },
};

export default function PipelineFlowViz({ run, onStageClick }: PipelineFlowVizProps) {
  const stages = run?.stages ?? EMPTY_STAGES;
  const currentStage = run?.currentStage ?? null;

  const stageIndex = useMemo(() => {
    if (!currentStage) return -1;
    return PIPELINE_STAGES.indexOf(currentStage);
  }, [currentStage]);

  return (
    <motion.div
      className="flex items-center justify-center gap-0 py-6 px-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      data-testid="pipeline-flow-viz"
    >
      {PIPELINE_STAGES.map((stage, idx) => {
        const state = stages[stage];
        const isCurrentStage = stage === currentStage;
        const connectorActive = currentStage !== null && idx === stageIndex;
        const connectorCompleted = idx < stageIndex;

        return (
          <div key={stage} className="flex items-center">
            <StageCard
              stage={stage}
              state={state}
              isCurrentStage={isCurrentStage}
              onClick={() => onStageClick?.(stage)}
            />
            {idx < PIPELINE_STAGES.length - 1 && (
              <ConnectorArrow
                isActive={connectorActive}
                isCompleted={connectorCompleted}
              />
            )}
          </div>
        );
      })}
    </motion.div>
  );
}
