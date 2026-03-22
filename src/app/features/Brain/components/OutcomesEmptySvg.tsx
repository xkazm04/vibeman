'use client';

import { motion } from 'framer-motion';
import { BRAIN_CHART } from '../lib/brainChartColors';

const ACCENT = BRAIN_CHART.panel.outcomes; // amber

/**
 * Empty-target illustration for OutcomesSummary empty state.
 * Concentric target rings with no arrows — outcomes waiting to be tracked.
 */
export default function OutcomesEmptySvg({ reducedMotion }: { reducedMotion?: boolean | null }) {
  const rings = [
    { r: 28, opacity: 0.12, delay: 0 },
    { r: 21, opacity: 0.18, delay: 0.3 },
    { r: 14, opacity: 0.25, delay: 0.6 },
    { r: 7,  opacity: 0.35, delay: 0.9 },
  ];

  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <radialGradient id="targetGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={ACCENT} stopOpacity="0.2" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Background glow */}
      <circle cx="40" cy="40" r="36" fill="url(#targetGlow)" />

      {/* Concentric target rings */}
      {rings.map((ring, i) =>
        reducedMotion ? (
          <circle
            key={i}
            cx="40" cy="40" r={ring.r}
            stroke={ACCENT} strokeWidth="1.2" fill="none" opacity={ring.opacity}
          />
        ) : (
          <motion.circle
            key={i}
            cx="40" cy="40" r={ring.r}
            stroke={ACCENT} strokeWidth="1.2" fill="none"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: [ring.opacity * 0.5, ring.opacity, ring.opacity * 0.5],
              scale: [0.95, 1, 0.95],
            }}
            transition={{
              duration: 4,
              delay: ring.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{ transformOrigin: '40px 40px' }}
          />
        )
      )}

      {/* Crosshair lines */}
      {reducedMotion ? (
        <>
          <line x1="40" y1="8" x2="40" y2="28" stroke={ACCENT} strokeWidth="0.6" opacity="0.15" strokeDasharray="2 3" />
          <line x1="40" y1="52" x2="40" y2="72" stroke={ACCENT} strokeWidth="0.6" opacity="0.15" strokeDasharray="2 3" />
          <line x1="8" y1="40" x2="28" y2="40" stroke={ACCENT} strokeWidth="0.6" opacity="0.15" strokeDasharray="2 3" />
          <line x1="52" y1="40" x2="72" y2="40" stroke={ACCENT} strokeWidth="0.6" opacity="0.15" strokeDasharray="2 3" />
        </>
      ) : (
        <>
          <motion.line
            x1="40" y1="8" x2="40" y2="28"
            stroke={ACCENT} strokeWidth="0.6" strokeDasharray="2 3"
            animate={{ opacity: [0.08, 0.2, 0.08] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.line
            x1="40" y1="52" x2="40" y2="72"
            stroke={ACCENT} strokeWidth="0.6" strokeDasharray="2 3"
            animate={{ opacity: [0.08, 0.2, 0.08] }}
            transition={{ duration: 3, delay: 0.5, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.line
            x1="8" y1="40" x2="28" y2="40"
            stroke={ACCENT} strokeWidth="0.6" strokeDasharray="2 3"
            animate={{ opacity: [0.08, 0.2, 0.08] }}
            transition={{ duration: 3, delay: 1, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.line
            x1="52" y1="40" x2="72" y2="40"
            stroke={ACCENT} strokeWidth="0.6" strokeDasharray="2 3"
            animate={{ opacity: [0.08, 0.2, 0.08] }}
            transition={{ duration: 3, delay: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </>
      )}

      {/* Center bullseye dot — faintly pulsing, awaiting impact */}
      {reducedMotion ? (
        <circle cx="40" cy="40" r="2" fill={ACCENT} opacity="0.4" />
      ) : (
        <motion.circle
          cx="40" cy="40" r="2"
          fill={ACCENT}
          animate={{ opacity: [0.2, 0.5, 0.2], r: [1.5, 2.5, 1.5] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </svg>
  );
}
