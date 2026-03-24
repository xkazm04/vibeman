/**
 * Stage-specific animated loading indicators for pipeline stages.
 *
 * Each stage gets a unique 16x16 SVG animation reflecting its purpose:
 *   scout    — magnifying glass with scanning sweep line
 *   triage   — balance scale with gently tilting arms
 *   batch    — grid cells filling in sequence
 *   execute  — lightning bolt with crackling energy arcs
 *   review   — eye with iris pulse
 *   plan     — brain with synapse flash
 *   dispatch — signal waves radiating outward
 *   reflect  — mirror with shimmering reflection
 *
 * Pure SVG animations (animate/animateTransform) for GPU-composited motion.
 * All use currentColor to inherit stage theme color.
 */

import type { AnyPipelineStage } from '../lib/types';

interface StageLoaderProps {
  className?: string;
  reduced?: boolean;
}

function ReducedFallback({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.2" opacity="0.2" />
      <circle cx="8" cy="8" r="2" fill="currentColor" opacity="0.5">
        <animate attributeName="opacity" values="0.5;0.2;0.5" dur="1.5s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

function ScoutLoader({ className, reduced }: StageLoaderProps) {
  if (reduced) return <ReducedFallback className={className} />;
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.2" opacity="0.2" />
      <line x1="9.7" y1="9.7" x2="14" y2="14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.2" />
      <line x1="6.5" y1="6.5" x2="6.5" y2="2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.7">
        <animateTransform attributeName="transform" type="rotate" from="0 6.5 6.5" to="360 6.5 6.5" dur="2s" repeatCount="indefinite" />
      </line>
      <circle cx="6.5" cy="2.2" r="0.8" fill="currentColor" opacity="0.9">
        <animateTransform attributeName="transform" type="rotate" from="0 6.5 6.5" to="360 6.5 6.5" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

function TriageLoader({ className, reduced }: StageLoaderProps) {
  if (reduced) return <ReducedFallback className={className} />;
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <line x1="8" y1="2.5" x2="8" y2="14" stroke="currentColor" strokeWidth="1" opacity="0.2" />
      <path d="M6 14 L10 14 L8 12.5 Z" fill="currentColor" opacity="0.2" />
      <g>
        <line x1="2.5" y1="4.5" x2="13.5" y2="4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
        <line x1="3.5" y1="4.5" x2="2.5" y2="7.5" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
        <line x1="3.5" y1="4.5" x2="5.5" y2="7.5" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
        <path d="M2 7.5 Q4 9.5 6 7.5" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.5" />
        <line x1="12.5" y1="4.5" x2="10.5" y2="7.5" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
        <line x1="12.5" y1="4.5" x2="13.5" y2="7.5" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
        <path d="M10 7.5 Q12 9.5 14 7.5" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.5" />
        <animateTransform
          attributeName="transform" type="rotate"
          values="-7 8 4.5;7 8 4.5;-7 8 4.5"
          dur="2s" repeatCount="indefinite"
          calcMode="spline" keySplines="0.45 0.05 0.55 0.95;0.45 0.05 0.55 0.95"
        />
      </g>
    </svg>
  );
}

function BatchLoader({ className, reduced }: StageLoaderProps) {
  if (reduced) return <ReducedFallback className={className} />;
  const cells = [
    { x: 1, y: 1 }, { x: 6, y: 1 }, { x: 11, y: 1 },
    { x: 1, y: 6 }, { x: 6, y: 6 }, { x: 11, y: 6 },
    { x: 1, y: 11 }, { x: 6, y: 11 }, { x: 11, y: 11 },
  ];
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      {cells.map((c, i) => (
        <rect key={i} x={c.x} y={c.y} width="4" height="4" rx="0.6"
          stroke="currentColor" strokeWidth="0.6" fill="currentColor"
        >
          <animate
            attributeName="opacity" values="0.1;0.7;0.1"
            dur="1.8s" begin={`${(i * 0.2).toFixed(1)}s`}
            repeatCount="indefinite"
          />
        </rect>
      ))}
    </svg>
  );
}

function ExecuteLoader({ className, reduced }: StageLoaderProps) {
  if (reduced) return <ReducedFallback className={className} />;
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M9.5 1 L5 8.5 H8.5 L7 15 L12.5 7 H9 Z"
        stroke="currentColor" strokeWidth="0.8" strokeLinejoin="round"
        fill="currentColor" fillOpacity="0.12"
      />
      <path d="M9.5 1 L5 8.5 H8.5 L7 15 L12.5 7 H9 Z"
        stroke="currentColor" strokeWidth="0.8" strokeLinejoin="round" fill="none"
      >
        <animate attributeName="opacity" values="0.3;1;0.5;0.9;0.3" dur="1.5s" repeatCount="indefinite" />
      </path>
      <path d="M3 3.5 L1.5 4.5 L2.5 5.5" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round" fill="none">
        <animate attributeName="opacity" values="0;0.9;0;0" dur="1.5s" repeatCount="indefinite" />
      </path>
      <path d="M13 2.5 L14.5 3.5 L13.5 4.5" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round" fill="none">
        <animate attributeName="opacity" values="0;0;0.9;0" dur="1.5s" repeatCount="indefinite" />
      </path>
      <path d="M2.5 10 L1 11.5 L2 12.5" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round" fill="none">
        <animate attributeName="opacity" values="0;0;0;0.9" dur="1.5s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}

function ReviewLoader({ className, reduced }: StageLoaderProps) {
  if (reduced) return <ReducedFallback className={className} />;
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M1 8 Q8 2.5 15 8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" fill="none" opacity="0.4" />
      <path d="M1 8 Q8 13.5 15 8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" fill="none" opacity="0.4" />
      <circle cx="8" cy="8" r="2.8" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
      <circle cx="8" cy="8" fill="currentColor">
        <animate
          attributeName="r" values="1;2.2;1"
          dur="1.8s" repeatCount="indefinite"
          calcMode="spline" keySplines="0.45 0.05 0.55 0.95;0.45 0.05 0.55 0.95"
        />
        <animate attributeName="opacity" values="0.8;0.35;0.8" dur="1.8s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

function PlanLoader({ className, reduced }: StageLoaderProps) {
  if (reduced) return <ReducedFallback className={className} />;
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M8 2 C5 2 2 4.5 2 7.5 C2 10.5 4.5 13 7 14 L8 14"
        stroke="currentColor" strokeWidth="1" opacity="0.25" fill="none" />
      <path d="M8 2 C11 2 14 4.5 14 7.5 C14 10.5 11.5 13 9 14 L8 14"
        stroke="currentColor" strokeWidth="1" opacity="0.25" fill="none" />
      <line x1="8" y1="2.5" x2="8" y2="13.5" stroke="currentColor" strokeWidth="0.6" opacity="0.15" />
      <circle cx="5" cy="5.5" r="0.7" fill="currentColor" opacity="0.4" />
      <circle cx="11" cy="5.5" r="0.7" fill="currentColor" opacity="0.4" />
      <circle cx="4" cy="9" r="0.7" fill="currentColor" opacity="0.4" />
      <circle cx="12" cy="9" r="0.7" fill="currentColor" opacity="0.4" />
      <circle cx="8" cy="7" r="0.8" fill="currentColor" opacity="0.5" />
      <line x1="5" y1="5.5" x2="8" y2="7" stroke="currentColor" strokeWidth="0.8">
        <animate attributeName="opacity" values="0.08;0.9;0.08" dur="1.8s" begin="0s" repeatCount="indefinite" />
      </line>
      <line x1="8" y1="7" x2="11" y2="5.5" stroke="currentColor" strokeWidth="0.8">
        <animate attributeName="opacity" values="0.08;0.9;0.08" dur="1.8s" begin="0.45s" repeatCount="indefinite" />
      </line>
      <line x1="4" y1="9" x2="8" y2="7" stroke="currentColor" strokeWidth="0.8">
        <animate attributeName="opacity" values="0.08;0.9;0.08" dur="1.8s" begin="0.9s" repeatCount="indefinite" />
      </line>
      <line x1="8" y1="7" x2="12" y2="9" stroke="currentColor" strokeWidth="0.8">
        <animate attributeName="opacity" values="0.08;0.9;0.08" dur="1.8s" begin="1.35s" repeatCount="indefinite" />
      </line>
    </svg>
  );
}

function DispatchLoader({ className, reduced }: StageLoaderProps) {
  if (reduced) return <ReducedFallback className={className} />;
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <circle cx="2.5" cy="8" r="1.3" fill="currentColor" opacity="0.6" />
      <path d="M5.5 4.5 Q8 8 5.5 11.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" fill="none">
        <animate attributeName="opacity" values="0.7;0.1;0.7" dur="1.5s" begin="0s" repeatCount="indefinite" />
      </path>
      <path d="M8.5 2.5 Q12.5 8 8.5 13.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" fill="none">
        <animate attributeName="opacity" values="0.7;0.1;0.7" dur="1.5s" begin="0.35s" repeatCount="indefinite" />
      </path>
      <path d="M11.5 1 Q16 8 11.5 15" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" fill="none">
        <animate attributeName="opacity" values="0.7;0.1;0.7" dur="1.5s" begin="0.7s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}

function ReflectLoader({ className, reduced }: StageLoaderProps) {
  if (reduced) return <ReducedFallback className={className} />;
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="3.5" y="1" width="9" height="14" rx="1.5"
        stroke="currentColor" strokeWidth="1" opacity="0.25" fill="none" />
      <rect x="3.5" y="1.5" width="1.5" height="13" rx="0.5"
        fill="currentColor"
      >
        <animate attributeName="x" values="3.5;11;3.5" dur="2s" repeatCount="indefinite"
          calcMode="spline" keySplines="0.45 0.05 0.55 0.95;0.45 0.05 0.55 0.95" />
        <animate attributeName="opacity" values="0.04;0.5;0.04" dur="2s" repeatCount="indefinite"
          calcMode="spline" keySplines="0.45 0.05 0.55 0.95;0.45 0.05 0.55 0.95" />
      </rect>
      <circle cx="7" cy="5" r="0.5" fill="currentColor">
        <animate attributeName="opacity" values="0.1;0.45;0.1" dur="2s" begin="0.3s" repeatCount="indefinite" />
      </circle>
      <circle cx="9.5" cy="8" r="0.5" fill="currentColor">
        <animate attributeName="opacity" values="0.1;0.45;0.1" dur="2s" begin="0.8s" repeatCount="indefinite" />
      </circle>
      <circle cx="7.5" cy="11.5" r="0.5" fill="currentColor">
        <animate attributeName="opacity" values="0.1;0.45;0.1" dur="2s" begin="1.3s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

const STAGE_LOADERS: Record<string, (props: StageLoaderProps) => React.JSX.Element> = {
  scout: ScoutLoader,
  triage: TriageLoader,
  batch: BatchLoader,
  execute: ExecuteLoader,
  review: ReviewLoader,
  plan: PlanLoader,
  dispatch: DispatchLoader,
  reflect: ReflectLoader,
};

interface StageLoadingAnimationProps {
  stage: AnyPipelineStage;
  className?: string;
  reduced?: boolean;
}

export default function StageLoadingAnimation({ stage, className, reduced }: StageLoadingAnimationProps) {
  const Loader = STAGE_LOADERS[stage] || ExecuteLoader;
  return <Loader className={className} reduced={reduced} />;
}
