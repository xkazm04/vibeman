/**
 * PipelineFlowViz — Horizontal pipeline stage visualization
 *
 * Displays 5 stage cards connected by animated arrows.
 * Particles flow along arrows when pipeline is running.
 */

'use client';

import { useId, useMemo, useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { PIPELINE_STAGES, V3_PIPELINE_STAGES } from '../lib/types';
import type { PipelineRun, AnyPipelineStage, StageState } from '../lib/types';
import { useConductorStore } from '../lib/conductorStore';
import { useThemeStore } from '@/stores/themeStore';
import { getConnectorTheme } from '../lib/stageTheme';
import type { ConnectorTheme } from '../lib/stageTheme';
import StageCard from './StageCard';

interface PipelineFlowVizProps {
  run: PipelineRun | null;
  onStageClick?: (stage: AnyPipelineStage) => void;
}

function ConnectorArrow({
  isActive,
  isCompleted,
  theme,
}: {
  isActive: boolean;
  isCompleted: boolean;
  theme: ConnectorTheme;
}) {
  const uid = useId();
  const gradId = `npg-${uid}`;
  const glowId = `npgl-${uid}`;
  const vGradId = `npgv-${uid}`;
  const vGlowId = `npglv-${uid}`;

  const lineClass = isCompleted ? theme.completedLine : isActive ? theme.activeLine : theme.inactiveLine;
  const arrowClass = isCompleted ? theme.completedArrow : isActive ? theme.activeArrow : theme.inactiveArrow;

  return (
    <>
      {/* Horizontal connector (sm and above) */}
      <div className="hidden sm:flex items-center justify-center w-12 relative">
        {/* Base line */}
        <div
          className={`h-[2px] w-full transition-colors duration-300 ${lineClass}`}
        />

        {/* Arrow head */}
        <div
          className={`absolute right-0 w-0 h-0
            border-l-[6px] border-y-[4px] border-y-transparent transition-colors duration-300
            ${arrowClass}
          `}
        />

        {/* Neural pulse trail (only when active) */}
        {isActive && (
          <>
            <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 48 16">
              <defs>
                <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="transparent" />
                  <stop offset="20%" stopColor={theme.pulseHex[0]} stopOpacity="0.4" />
                  <stop offset="50%" stopColor={theme.pulseHex[1]} stopOpacity="0.9" />
                  <stop offset="80%" stopColor={theme.pulseHex[0]} stopOpacity="0.6" />
                  <stop offset="100%" stopColor="transparent" />
                </linearGradient>
                <filter id={glowId}>
                  <feGaussianBlur stdDeviation="1.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <rect
                x="-16" y="6" width="22" height="4" rx="2"
                fill={`url(#${gradId})`}
                filter={`url(#${glowId})`}
                className="animate-[neuralPulse_1.4s_ease-in-out_infinite]"
              />
            </svg>
            {/* Secondary lime spark (brand accent #d0e41d) */}
            <span className="absolute w-1 h-1 rounded-full animate-[limeSpark_0.8s_ease-out_2.5s_infinite] pointer-events-none" />
          </>
        )}
      </div>

      {/* Vertical connector (below sm) */}
      <div className="flex sm:hidden items-center justify-center h-10 w-full relative">
        {/* Base line */}
        <div
          className={`w-[2px] h-full transition-colors duration-300 ${lineClass}`}
        />

        {/* Arrow head (pointing down) */}
        <div
          className={`absolute bottom-0 w-0 h-0
            border-t-[6px] border-x-[4px] border-x-transparent transition-colors duration-300
            ${arrowClass.replace('border-l-', 'border-t-')}
          `}
        />

        {/* Vertical neural pulse trail (only when active) */}
        {isActive && (
          <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 16 40">
            <defs>
              <linearGradient id={vGradId} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="20%" stopColor={theme.pulseHex[0]} stopOpacity="0.4" />
                <stop offset="50%" stopColor={theme.pulseHex[1]} stopOpacity="0.9" />
                <stop offset="80%" stopColor={theme.pulseHex[0]} stopOpacity="0.6" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
              <filter id={vGlowId}>
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <rect
              x="6" y="-12" width="4" height="22" rx="2"
              fill={`url(#${vGradId})`}
              filter={`url(#${vGlowId})`}
              className="animate-[neuralPulseVertical_1.4s_ease-in-out_infinite]"
            />
          </svg>
        )}
      </div>
    </>
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

const BRAND_COLORS = ['#22d3ee', '#a855f7', '#10b981', '#d0e41d'] as const;
const SHAPES = ['circle', 'triangle', 'diamond'] as const;

function generateParticles(count: number) {
  const particles: { shape: typeof SHAPES[number]; color: string; tx: number; ty: number; delay: number }[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const radius = 35 + Math.random() * 30;
    particles.push({
      shape: SHAPES[i % SHAPES.length],
      color: BRAND_COLORS[i % BRAND_COLORS.length],
      tx: Math.cos(angle) * radius,
      ty: Math.sin(angle) * radius,
      delay: (i * 0.03),
    });
  }
  return particles;
}

const CELEBRATION_PARTICLES = generateParticles(18);

function CelebrationBurst({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none overflow-visible celebration-burst"
      viewBox="-60 -60 120 120"
      aria-hidden="true"
    >
      {CELEBRATION_PARTICLES.map((p, i) => (
        <g
          key={i}
          className="animate-[celebrationBurst_1.2s_ease-out_forwards]"
          style={{
            '--tx': `${p.tx}px`,
            '--ty': `${p.ty}px`,
            animationDelay: `${p.delay}s`,
            transformOrigin: '0 0',
          } as React.CSSProperties}
        >
          {p.shape === 'circle' && (
            <circle cx="0" cy="0" r="3" fill={p.color} />
          )}
          {p.shape === 'triangle' && (
            <polygon points="0,-3.5 3,2.5 -3,2.5" fill={p.color} />
          )}
          {p.shape === 'diamond' && (
            <polygon points="0,-3.5 3.5,0 0,3.5 -3.5,0" fill={p.color} />
          )}
        </g>
      ))}
    </svg>
  );
}

export default function PipelineFlowViz({ run, onStageClick }: PipelineFlowVizProps) {
  const appTheme = useThemeStore((s) => s.theme);
  const connectorTheme = getConnectorTheme(appTheme);
  const isV3 = run?.pipelineVersion === 3;
  const stageList: AnyPipelineStage[] = isV3 ? [...V3_PIPELINE_STAGES] : [...PIPELINE_STAGES];
  const stages: Record<string, StageState> = run?.stages ?? (isV3 ? EMPTY_V3_STAGES : EMPTY_STAGES);
  const currentStage = run?.currentStage ?? null;

  const stageIndex = useMemo(() => {
    if (!currentStage) return -1;
    return stageList.indexOf(currentStage as AnyPipelineStage);
  }, [currentStage, stageList]);

  // Track completion for celebration animation via runHistory
  // (runs are removed from the store immediately on completion,
  //  so we detect new 'completed' entries in history instead)
  const [showCelebration, setShowCelebration] = useState(false);
  const runHistory = useConductorStore((s) => s.runHistory);
  const prevHistoryLen = useRef(runHistory.length);
  useEffect(() => {
    if (
      runHistory.length > prevHistoryLen.current &&
      runHistory[0]?.status === 'completed'
    ) {
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 1500);
      prevHistoryLen.current = runHistory.length;
      return () => clearTimeout(timer);
    }
    prevHistoryLen.current = runHistory.length;
  }, [runHistory]);

  return (
    <motion.div
      className="relative flex flex-col sm:flex-row items-center justify-center gap-0 py-6 px-4"
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

        const isLastStage = idx === stageList.length - 1;

        return (
          <div key={stage} className="relative flex flex-col sm:flex-row items-center w-full sm:w-auto">
            <StageCard
              stage={stage}
              state={state}
              isCurrentStage={isCurrentStage}
              onClick={() => onStageClick?.(stage)}
            />
            {!isLastStage && (
              <ConnectorArrow
                isActive={connectorActive}
                isCompleted={connectorCompleted}
                theme={connectorTheme}
              />
            )}
            {/* Celebration burst anchored to final stage */}
            {isLastStage && showCelebration && (
              <CelebrationBurst show={showCelebration} />
            )}
          </div>
        );
      })}
    </motion.div>
  );
}
