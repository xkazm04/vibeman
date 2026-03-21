/**
 * PipelineFlowViz — Horizontal pipeline stage visualization
 *
 * Displays 5 stage cards connected by animated arrows.
 * Particles flow along arrows when pipeline is running.
 */

'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PIPELINE_STAGES, V3_PIPELINE_STAGES } from '../lib/types';
import type { PipelineRun, AnyPipelineStage, StageState } from '../lib/types';
import StageCard from './StageCard';

interface PipelineFlowVizProps {
  run: PipelineRun | null;
  onStageClick?: (stage: AnyPipelineStage) => void;
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

      {/* Neural pulse trail (only when active) */}
      {isActive && (
        <>
          <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 48 16">
            <defs>
              <linearGradient id="neural-pulse-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="30%" stopColor="#22d3ee" stopOpacity="0.6" />
                <stop offset="70%" stopColor="#a855f7" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.3" />
              </linearGradient>
            </defs>
            <rect
              x="-16" y="6.5" width="20" height="3" rx="1.5"
              fill="url(#neural-pulse-grad)"
              className="animate-[neuralPulse_1.4s_ease-in-out_infinite]"
            />
          </svg>
          {/* Secondary lime spark (brand accent) */}
          <motion.div
            className="absolute w-1 h-1 rounded-full"
            style={{ backgroundColor: '#d0e41d', boxShadow: '0 0 4px #d0e41d' }}
            animate={{ x: ['-12px', '52px'], opacity: [0, 1, 1, 0] }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              repeatDelay: 2.5,
              ease: 'easeOut',
            }}
          />
        </>
      )}
    </div>
  );
}

const EMPTY_STAGES: Record<string, StageState> = {
  scout: { status: 'pending', itemsIn: 0, itemsOut: 0 },
  triage: { status: 'pending', itemsIn: 0, itemsOut: 0 },
  batch: { status: 'pending', itemsIn: 0, itemsOut: 0 },
  execute: { status: 'pending', itemsIn: 0, itemsOut: 0 },
  review: { status: 'pending', itemsIn: 0, itemsOut: 0 },
};

const EMPTY_V3_STAGES: Record<string, StageState> = {
  plan: { status: 'pending', itemsIn: 0, itemsOut: 0 },
  dispatch: { status: 'pending', itemsIn: 0, itemsOut: 0 },
  reflect: { status: 'pending', itemsIn: 0, itemsOut: 0 },
};

const CELEBRATION_PARTICLES = [
  { shape: 'circle', color: '#22d3ee', tx: '-30px', ty: '-40px', delay: 0 },
  { shape: 'triangle', color: '#a855f7', tx: '25px', ty: '-35px', delay: 0.05 },
  { shape: 'diamond', color: '#10b981', tx: '-15px', ty: '-50px', delay: 0.1 },
  { shape: 'circle', color: '#d0e41d', tx: '35px', ty: '-25px', delay: 0.08 },
  { shape: 'triangle', color: '#22d3ee', tx: '-40px', ty: '-20px', delay: 0.12 },
  { shape: 'diamond', color: '#a855f7', tx: '20px', ty: '-55px', delay: 0.03 },
  { shape: 'circle', color: '#10b981', tx: '45px', ty: '-45px', delay: 0.15 },
  { shape: 'circle', color: '#d0e41d', tx: '-25px', ty: '-55px', delay: 0.07 },
];

function CelebrationBurst({ show }: { show: boolean }) {
  const prefersReduced = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!show || prefersReduced) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible flex items-center justify-end pr-12">
      {CELEBRATION_PARTICLES.map((p, i) => (
        <motion.div
          key={i}
          className="absolute"
          initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
          animate={{ x: p.tx, y: p.ty, scale: 0, opacity: 0 }}
          transition={{ duration: 1.2, delay: p.delay, ease: 'easeOut' }}
        >
          <svg width="8" height="8" viewBox="0 0 8 8">
            {p.shape === 'circle' && <circle cx="4" cy="4" r="3" fill={p.color} />}
            {p.shape === 'triangle' && <polygon points="4,0 8,8 0,8" fill={p.color} />}
            {p.shape === 'diamond' && <polygon points="4,0 8,4 4,8 0,4" fill={p.color} />}
          </svg>
        </motion.div>
      ))}
    </div>
  );
}

export default function PipelineFlowViz({ run, onStageClick }: PipelineFlowVizProps) {
  const isV3 = run?.pipelineVersion === 3;
  const stageList: AnyPipelineStage[] = isV3 ? [...V3_PIPELINE_STAGES] : [...PIPELINE_STAGES];
  const stages: Record<string, StageState> = run?.stages ?? (isV3 ? EMPTY_V3_STAGES : EMPTY_STAGES);
  const currentStage = run?.currentStage ?? null;

  const stageIndex = useMemo(() => {
    if (!currentStage) return -1;
    return stageList.indexOf(currentStage as AnyPipelineStage);
  }, [currentStage, stageList]);

  // Track completion for celebration animation
  const [showCelebration, setShowCelebration] = useState(false);
  const prevStatus = useRef(run?.status);
  useEffect(() => {
    if (prevStatus.current !== 'completed' && run?.status === 'completed') {
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 1500);
      return () => clearTimeout(timer);
    }
    prevStatus.current = run?.status;
  }, [run?.status]);

  return (
    <motion.div
      className="relative flex items-center justify-center gap-0 py-6 px-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      data-testid="pipeline-flow-viz"
    >
      {stageList.map((stage, idx) => {
        const state = stages[stage] || { status: 'pending', itemsIn: 0, itemsOut: 0 };
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
            {idx < stageList.length - 1 && (
              <ConnectorArrow
                isActive={connectorActive}
                isCompleted={connectorCompleted}
              />
            )}
          </div>
        );
      })}

      {/* Completion celebration */}
      <AnimatePresence>
        {showCelebration && <CelebrationBurst show={showCelebration} />}
      </AnimatePresence>
    </motion.div>
  );
}
