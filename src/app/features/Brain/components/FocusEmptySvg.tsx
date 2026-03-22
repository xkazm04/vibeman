'use client';

import { motion } from 'framer-motion';
import { BRAIN_CHART } from '../lib/brainChartColors';
import { DATA_FONT } from '../lib/brainFonts';

const ACCENT = BRAIN_CHART.panel.focus; // cyan

/**
 * Calm-brainwave illustration for BehavioralFocusPanel empty state.
 * Three gentle waveforms at rest, suggesting activity waiting to begin.
 */
export default function FocusEmptySvg({ reducedMotion }: { reducedMotion?: boolean | null }) {
  // Three wave paths at different vertical positions, very gentle undulation
  const waves = [
    {
      d: 'M4 22 Q14 18, 24 22 T44 22 T64 22 T76 22',
      opacity: 0.35,
      delay: 0,
      strokeWidth: 1.4,
    },
    {
      d: 'M4 34 Q14 31, 24 34 T44 34 T64 34 T76 34',
      opacity: 0.25,
      delay: 0.6,
      strokeWidth: 1.2,
    },
    {
      d: 'M4 46 Q14 43, 24 46 T44 46 T64 46 T76 46',
      opacity: 0.18,
      delay: 1.2,
      strokeWidth: 1.0,
    },
  ];

  // Small baseline dots along the bottom
  const dots = [
    { cx: 12, cy: 56, r: 1.5, delay: 0.2 },
    { cx: 28, cy: 56, r: 1.2, delay: 0.6 },
    { cx: 44, cy: 56, r: 1.8, delay: 1.0 },
    { cx: 60, cy: 56, r: 1.3, delay: 1.4 },
    { cx: 72, cy: 56, r: 1.0, delay: 1.8 },
  ];

  return (
    <svg width="80" height="68" viewBox="0 0 80 68" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id="focusWaveGrad" x1="0" y1="0" x2="80" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={ACCENT} stopOpacity="0" />
          <stop offset="20%" stopColor={ACCENT} stopOpacity="1" />
          <stop offset="80%" stopColor={ACCENT} stopOpacity="1" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Gentle wave lines */}
      {waves.map((w, i) =>
        reducedMotion ? (
          <path
            key={i}
            d={w.d}
            stroke="url(#focusWaveGrad)"
            strokeWidth={w.strokeWidth}
            strokeLinecap="round"
            fill="none"
            opacity={w.opacity}
          />
        ) : (
          <motion.path
            key={i}
            d={w.d}
            stroke="url(#focusWaveGrad)"
            strokeWidth={w.strokeWidth}
            strokeLinecap="round"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{
              pathLength: [0, 1, 1, 0],
              opacity: [0, w.opacity, w.opacity, 0],
            }}
            transition={{
              duration: 5,
              delay: w.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )
      )}

      {/* Horizontal baseline */}
      <line
        x1="8" y1="56" x2="72" y2="56"
        stroke={ACCENT} strokeWidth="0.5" opacity="0.1"
        strokeDasharray="2 4"
      />

      {/* Small signal dots along baseline */}
      {dots.map((dot, i) =>
        reducedMotion ? (
          <circle key={i} cx={dot.cx} cy={dot.cy} r={dot.r} fill={ACCENT} opacity="0.3" />
        ) : (
          <motion.circle
            key={i}
            cx={dot.cx} cy={dot.cy} r={dot.r}
            fill={ACCENT}
            initial={{ opacity: 0.1 }}
            animate={{ opacity: [0.1, 0.4, 0.1] }}
            transition={{ duration: 3, delay: dot.delay, repeat: Infinity, ease: 'easeInOut' }}
          />
        )
      )}

      {/* Subtle "~" pulse indicator at center top */}
      {!reducedMotion && (
        <motion.text
          x="36" y="12"
          fontSize="10" fontFamily={DATA_FONT} fill={ACCENT}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.3, 0] }}
          transition={{ duration: 4, delay: 2.5, repeat: Infinity }}
        >
          ~
        </motion.text>
      )}
    </svg>
  );
}
