/**
 * Custom Brain tab SVG icons — neural-network-inspired line art.
 * 16x16 viewBox, 1.5px stroke, monochrome currentColor or cyan/purple gradient.
 * Compatible with Lucide icon API ({ className }).
 *
 * - BrainPulseIcon     → Dashboard   (brain-shaped pulse monitor)
 * - ThoughtSparkleIcon → Reflection  (thought bubble with sparkle nodes)
 * - NeuronClusterIcon  → Memory Canvas (clustered neuron map)
 * - SynapseTimelineIcon→ Timeline    (synapse timeline)
 * - BrainCrossSection  → Palace      (spatial brain cross-section)
 * - PatternLibraryIcon → Knowledge   (connected pattern library)
 */

import type { SVGProps } from 'react';

export type BrainTabIconProps = SVGProps<SVGSVGElement> & {
  className?: string;
  gradient?: boolean;
};

const GRAD_CYAN = '#22d3ee';
const GRAD_PURPLE = '#a855f7';

/** Brain-shaped pulse monitor — Dashboard tab */
export function BrainPulseIcon({ className, gradient, ...props }: BrainTabIconProps) {
  const strokeRef = gradient ? 'url(#bpGrad)' : 'currentColor';
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="none"
      stroke={strokeRef}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {gradient && (
        <defs>
          <linearGradient id="bpGrad" x1="0" y1="0" x2="16" y2="16" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={GRAD_CYAN} />
            <stop offset="100%" stopColor={GRAD_PURPLE} />
          </linearGradient>
        </defs>
      )}
      {/* Brain hemisphere outline */}
      <path d="M4.5 12C2.5 11 1.5 8.5 2 6.5C2.5 4.5 4 3 5.5 2.5C6.5 2.2 7.5 2.2 8 2.5" />
      <path d="M11.5 12C13.5 11 14.5 8.5 14 6.5C13.5 4.5 12 3 10.5 2.5C9.5 2.2 8.5 2.2 8 2.5" />
      {/* Central fissure */}
      <path d="M8 2.5V5" />
      {/* Pulse line across the brain */}
      <path d="M2.5 8.5H5.5L6.5 6L8 11L9.5 6L10.5 8.5H13.5" />
      {/* Brain stem */}
      <path d="M7 12.5L8 14L9 12.5" />
    </svg>
  );
}

/** Thought bubble with sparkle nodes — Reflection tab */
export function ThoughtSparkleIcon({ className, gradient, ...props }: BrainTabIconProps) {
  const strokeRef = gradient ? 'url(#tsGrad)' : 'currentColor';
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="none"
      stroke={strokeRef}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {gradient && (
        <defs>
          <linearGradient id="tsGrad" x1="0" y1="0" x2="16" y2="16" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={GRAD_CYAN} />
            <stop offset="100%" stopColor={GRAD_PURPLE} />
          </linearGradient>
        </defs>
      )}
      {/* Thought bubble */}
      <path d="M3 9.5C1.8 8.5 1.5 6.5 2.5 5C3.5 3.5 5.5 2.5 8 2.5C10.5 2.5 12.5 3.5 13.5 5C14.5 6.5 14.2 8.5 13 9.5C12 10.3 10.2 10.8 8 10.8C6.8 10.8 5.5 10.5 4.8 10.2" />
      {/* Trailing thought dots */}
      <circle cx={4} cy={12} r={0.8} strokeWidth={1.2} />
      <circle cx={2.5} cy={13.5} r={0.5} strokeWidth={1} />
      {/* Sparkle nodes inside bubble */}
      <circle cx={6} cy={5.8} r={0.6} strokeWidth={1} />
      <circle cx={10} cy={5.8} r={0.6} strokeWidth={1} />
      <circle cx={8} cy={8} r={0.6} strokeWidth={1} />
      {/* Neural connections between sparkles */}
      <path d="M6.5 6.1L7.5 7.5" strokeWidth={1} />
      <path d="M9.5 6.1L8.5 7.5" strokeWidth={1} />
    </svg>
  );
}

/** Clustered neuron map — Memory Canvas tab */
export function NeuronClusterIcon({ className, gradient, ...props }: BrainTabIconProps) {
  const strokeRef = gradient ? 'url(#ncGrad)' : 'currentColor';
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="none"
      stroke={strokeRef}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {gradient && (
        <defs>
          <linearGradient id="ncGrad" x1="0" y1="0" x2="16" y2="16" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={GRAD_CYAN} />
            <stop offset="100%" stopColor={GRAD_PURPLE} />
          </linearGradient>
        </defs>
      )}
      {/* Central neuron */}
      <circle cx={8} cy={8} r={1.5} strokeWidth={1.3} />
      {/* Satellite neurons */}
      <circle cx={3} cy={4} r={1} strokeWidth={1.2} />
      <circle cx={13} cy={4} r={1} strokeWidth={1.2} />
      <circle cx={4} cy={13} r={1} strokeWidth={1.2} />
      <circle cx={12} cy={12} r={1} strokeWidth={1.2} />
      {/* Dendrite connections */}
      <path d="M3.8 4.8L6.8 7.2" strokeWidth={1} />
      <path d="M12.2 4.8L9.2 7.2" strokeWidth={1} />
      <path d="M4.8 12.3L6.8 8.8" strokeWidth={1} />
      <path d="M11.2 11.3L9.2 8.8" strokeWidth={1} />
      {/* Cross-cluster link */}
      <path d="M4 4L12 12" strokeWidth={0.8} strokeDasharray="1.5 1.5" opacity={0.5} />
    </svg>
  );
}

/** Synapse timeline — Timeline tab */
export function SynapseTimelineIcon({ className, gradient, ...props }: BrainTabIconProps) {
  const strokeRef = gradient ? 'url(#stGrad)' : 'currentColor';
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="none"
      stroke={strokeRef}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {gradient && (
        <defs>
          <linearGradient id="stGrad" x1="0" y1="8" x2="16" y2="8" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={GRAD_CYAN} />
            <stop offset="100%" stopColor={GRAD_PURPLE} />
          </linearGradient>
        </defs>
      )}
      {/* Horizontal timeline axis */}
      <path d="M1.5 8H14.5" strokeWidth={1} />
      {/* Synapse nodes along timeline */}
      <circle cx={3.5} cy={8} r={1} strokeWidth={1.2} />
      <circle cx={8} cy={8} r={1} strokeWidth={1.2} />
      <circle cx={12.5} cy={8} r={1} strokeWidth={1.2} />
      {/* Signal arcs between synapses */}
      <path d="M4.5 7.5C5.5 5 6.5 5 7 7.5" strokeWidth={1} />
      <path d="M9 7.5C10 5 11 5 11.5 7.5" strokeWidth={1} />
      {/* Firing sparks above nodes */}
      <path d="M3.5 5.5V4.5" strokeWidth={1} />
      <path d="M3 5L4 5" strokeWidth={1} />
      <path d="M12.5 5.5V4.5" strokeWidth={1} />
      <path d="M12 5L13 5" strokeWidth={1} />
      {/* Timestamp ticks */}
      <path d="M3.5 10V11" strokeWidth={0.8} />
      <path d="M8 10V11" strokeWidth={0.8} />
      <path d="M12.5 10V11" strokeWidth={0.8} />
    </svg>
  );
}

/** Spatial brain cross-section — Palace tab */
export function BrainCrossSection({ className, gradient, ...props }: BrainTabIconProps) {
  const strokeRef = gradient ? 'url(#bcsGrad)' : 'currentColor';
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="none"
      stroke={strokeRef}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {gradient && (
        <defs>
          <linearGradient id="bcsGrad" x1="0" y1="0" x2="16" y2="16" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={GRAD_CYAN} />
            <stop offset="100%" stopColor={GRAD_PURPLE} />
          </linearGradient>
        </defs>
      )}
      {/* Outer brain contour */}
      <path d="M3 11C1.5 9.5 1.5 7 2.5 5C3.5 3 5.5 2 8 2C10.5 2 12.5 3 13.5 5C14.5 7 14.5 9.5 13 11" />
      {/* Inner cortex folds */}
      <path d="M5 9C4 8 4 6.5 5 5.5C5.8 4.7 6.8 4.5 8 4.5" />
      <path d="M11 9C12 8 12 6.5 11 5.5C10.2 4.7 9.2 4.5 8 4.5" />
      {/* Deep brain structure */}
      <path d="M6.5 7.5C7 7 7.5 7 8 7C8.5 7 9 7 9.5 7.5" />
      {/* Spatial markers — room nodes */}
      <circle cx={5} cy={6.5} r={0.5} strokeWidth={1} />
      <circle cx={11} cy={6.5} r={0.5} strokeWidth={1} />
      <circle cx={8} cy={5} r={0.5} strokeWidth={1} />
      <circle cx={8} cy={9} r={0.5} strokeWidth={1} />
      {/* Brain stem connection */}
      <path d="M6.5 11L8 13.5L9.5 11" />
    </svg>
  );
}

/** Connected pattern library — Knowledge tab */
export function PatternLibraryIcon({ className, gradient, ...props }: BrainTabIconProps) {
  const strokeRef = gradient ? 'url(#plGrad)' : 'currentColor';
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="none"
      stroke={strokeRef}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {gradient && (
        <defs>
          <linearGradient id="plGrad" x1="0" y1="0" x2="16" y2="16" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={GRAD_CYAN} />
            <stop offset="100%" stopColor={GRAD_PURPLE} />
          </linearGradient>
        </defs>
      )}
      {/* Book/page base shape */}
      <path d="M3 3V12C3 12 5 11.5 8 12.5C11 11.5 13 12 13 12V3" />
      <path d="M8 12.5V3.5" />
      {/* Left page — neural pattern */}
      <circle cx={5} cy={5.5} r={0.5} strokeWidth={1} />
      <circle cx={5} cy={8} r={0.5} strokeWidth={1} />
      <path d="M5 6L5 7.5" strokeWidth={0.8} />
      <path d="M5.4 5.8L7.5 4.5" strokeWidth={0.8} />
      {/* Right page — neural pattern */}
      <circle cx={11} cy={5.5} r={0.5} strokeWidth={1} />
      <circle cx={11} cy={8} r={0.5} strokeWidth={1} />
      <path d="M11 6L11 7.5" strokeWidth={0.8} />
      <path d="M10.6 5.8L8.5 4.5" strokeWidth={0.8} />
      {/* Cross-page connection */}
      <path d="M5.5 8L7.5 9.5" strokeWidth={0.8} />
      <path d="M10.5 8L8.5 9.5" strokeWidth={0.8} />
      <circle cx={8} cy={9.8} r={0.4} strokeWidth={0.8} />
    </svg>
  );
}
