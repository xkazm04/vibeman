'use client';

import { motion } from 'framer-motion';
import { BRAIN_CHART } from '../../lib/brainChartColors';

const ACCENT = BRAIN_CHART.panel.focus; // cyan

/**
 * Magnifying glass over disconnected dot-grid nodes.
 * Used for "no results" / "no matches" empty states in KB.
 */
export default function KBNoResultsSvg({ reducedMotion }: { reducedMotion?: boolean | null }) {
  // Dot-grid background
  const dots: { cx: number; cy: number }[] = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 6; col++) {
      dots.push({ cx: 8 + col * 14, cy: 10 + row * 14 });
    }
  }

  // Disconnected nodes (larger dots that "should" connect but don't)
  const nodes = [
    { cx: 22, cy: 24, r: 3, delay: 0 },
    { cx: 50, cy: 10, r: 2.5, delay: 0.5 },
    { cx: 64, cy: 38, r: 3.5, delay: 1.0 },
    { cx: 36, cy: 52, r: 2.8, delay: 1.5 },
    { cx: 8, cy: 52, r: 2.2, delay: 2.0 },
  ];

  // Broken edges (dashed, representing missing connections)
  const edges = [
    { x1: 22, y1: 24, x2: 50, y2: 10 },
    { x1: 50, y1: 10, x2: 64, y2: 38 },
    { x1: 22, y1: 24, x2: 36, y2: 52 },
    { x1: 64, y1: 38, x2: 36, y2: 52 },
  ];

  return (
    <svg width="90" height="80" viewBox="0 0 90 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <radialGradient id="kbSearchGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={ACCENT} stopOpacity="0.25" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Dot-grid canvas */}
      {dots.map((d, i) => (
        <circle key={`grid-${i}`} cx={d.cx} cy={d.cy} r="0.8" fill="#3f3f46" opacity="0.25" />
      ))}

      {/* Dashed edges — connections that can't be found */}
      {edges.map((e, i) =>
        reducedMotion ? (
          <line
            key={`edge-${i}`}
            x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
            stroke={ACCENT} strokeWidth="0.7" strokeDasharray="2 4" opacity="0.12"
          />
        ) : (
          <motion.line
            key={`edge-${i}`}
            x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
            stroke={ACCENT} strokeWidth="0.7" strokeDasharray="2 4"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.06, 0.18, 0.06] }}
            transition={{ duration: 4, delay: i * 0.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        )
      )}

      {/* Disconnected nodes */}
      {nodes.map((n, i) =>
        reducedMotion ? (
          <circle key={`node-${i}`} cx={n.cx} cy={n.cy} r={n.r} fill={ACCENT} opacity="0.35" />
        ) : (
          <motion.circle
            key={`node-${i}`}
            cx={n.cx} cy={n.cy} r={n.r}
            fill={ACCENT}
            initial={{ opacity: 0.15 }}
            animate={{ opacity: [0.15, 0.45, 0.15] }}
            transition={{ duration: 3.5, delay: n.delay, repeat: Infinity, ease: 'easeInOut' }}
          />
        )
      )}

      {/* Magnifying glass */}
      <g>
        {/* Lens glow */}
        <circle cx="56" cy="42" r="18" fill="url(#kbSearchGlow)" />

        {/* Lens ring */}
        {reducedMotion ? (
          <circle cx="56" cy="42" r="14" stroke={ACCENT} strokeWidth="1.5" fill="none" opacity="0.4" />
        ) : (
          <motion.circle
            cx="56" cy="42" r="14"
            stroke={ACCENT} strokeWidth="1.5" fill="none"
            initial={{ opacity: 0.25 }}
            animate={{ opacity: [0.25, 0.55, 0.25] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* Inner lens cross-hair marks */}
        <line x1="50" y1="42" x2="47" y2="42" stroke={ACCENT} strokeWidth="0.6" opacity="0.2" />
        <line x1="62" y1="42" x2="65" y2="42" stroke={ACCENT} strokeWidth="0.6" opacity="0.2" />
        <line x1="56" y1="36" x2="56" y2="33" stroke={ACCENT} strokeWidth="0.6" opacity="0.2" />
        <line x1="56" y1="48" x2="56" y2="51" stroke={ACCENT} strokeWidth="0.6" opacity="0.2" />

        {/* Handle */}
        <line x1="66" y1="52" x2="78" y2="66" stroke="#52525b" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
        <line x1="66" y1="52" x2="78" y2="66" stroke={ACCENT} strokeWidth="1.2" strokeLinecap="round" opacity="0.2" />
      </g>

      {/* Small "x" marks inside lens area to suggest no match */}
      {!reducedMotion && (
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.3, 0] }}
          transition={{ duration: 4, delay: 1.5, repeat: Infinity }}
        >
          <line x1="52" y1="39" x2="54" y2="41" stroke={ACCENT} strokeWidth="0.8" />
          <line x1="54" y1="39" x2="52" y2="41" stroke={ACCENT} strokeWidth="0.8" />
          <line x1="58" y1="43" x2="60" y2="45" stroke={ACCENT} strokeWidth="0.8" />
          <line x1="60" y1="43" x2="58" y2="45" stroke={ACCENT} strokeWidth="0.8" />
        </motion.g>
      )}
    </svg>
  );
}
