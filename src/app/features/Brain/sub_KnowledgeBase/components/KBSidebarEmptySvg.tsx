'use client';

import { motion } from 'framer-motion';
import { BRAIN_CHART } from '../../lib/brainChartColors';

const ACCENT = BRAIN_CHART.brand.accent; // purple

/**
 * Folder-tree outline growing from a seed on a dot-grid.
 * Used for the sidebar "no entries yet" empty state.
 * Compact size suitable for the narrow sidebar width.
 */
export default function KBSidebarEmptySvg({ reducedMotion }: { reducedMotion?: boolean | null }) {
  // Small dot-grid background
  const dots: { cx: number; cy: number }[] = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      dots.push({ cx: 6 + col * 14, cy: 6 + row * 14 });
    }
  }

  // Tree branches (trunk + 3 levels)
  const branches = [
    { x1: 22, y1: 60, x2: 22, y2: 38, delay: 0 },       // trunk
    { x1: 22, y1: 38, x2: 38, y2: 28, delay: 0.4 },      // branch right
    { x1: 22, y1: 46, x2: 38, y2: 42, delay: 0.8 },      // branch right mid
    { x1: 22, y1: 52, x2: 38, y2: 54, delay: 1.2 },      // branch right low
    { x1: 38, y1: 28, x2: 54, y2: 22, delay: 1.6 },      // sub-branch
    { x1: 38, y1: 28, x2: 54, y2: 32, delay: 2.0 },      // sub-branch lower
  ];

  // Folder/leaf nodes
  const nodes = [
    { cx: 38, cy: 42, r: 2.5, delay: 0.8, type: 'folder' as const },
    { cx: 38, cy: 54, r: 2.5, delay: 1.2, type: 'folder' as const },
    { cx: 54, cy: 22, r: 2, delay: 1.6, type: 'leaf' as const },
    { cx: 54, cy: 32, r: 2, delay: 2.0, type: 'leaf' as const },
    { cx: 38, cy: 28, r: 3, delay: 0.4, type: 'folder' as const },
  ];

  return (
    <svg width="70" height="72" viewBox="0 0 70 72" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <radialGradient id="kbSeedGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={ACCENT} stopOpacity="0.4" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Dot-grid */}
      {dots.map((d, i) => (
        <circle key={`grid-${i}`} cx={d.cx} cy={d.cy} r="0.6" fill="#3f3f46" opacity="0.2" />
      ))}

      {/* Tree branches */}
      {branches.map((b, i) =>
        reducedMotion ? (
          <line
            key={`br-${i}`}
            x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2}
            stroke={ACCENT} strokeWidth="0.8" opacity="0.2"
            strokeLinecap="round"
          />
        ) : (
          <motion.line
            key={`br-${i}`}
            x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2}
            stroke={ACCENT} strokeWidth="0.8"
            strokeLinecap="round"
            initial={{ opacity: 0, pathLength: 0 }}
            animate={{ opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 4, delay: b.delay, repeat: Infinity, ease: 'easeInOut' }}
          />
        )
      )}

      {/* Folder/leaf nodes */}
      {nodes.map((n, i) =>
        reducedMotion ? (
          <circle key={`node-${i}`} cx={n.cx} cy={n.cy} r={n.r} fill={ACCENT} opacity="0.25" />
        ) : (
          <motion.circle
            key={`node-${i}`}
            cx={n.cx} cy={n.cy} r={n.r}
            fill={ACCENT}
            initial={{ opacity: 0.1, scale: 0.5 }}
            animate={{ opacity: [0.1, 0.4, 0.1], scale: [0.7, 1, 0.7] }}
            transition={{ duration: 3, delay: n.delay, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformOrigin: `${n.cx}px ${n.cy}px` }}
          />
        )
      )}

      {/* Seed at the trunk base */}
      <circle cx="22" cy="62" r="6" fill="url(#kbSeedGlow)" />
      {reducedMotion ? (
        <circle cx="22" cy="62" r="3.5" fill={ACCENT} opacity="0.35" />
      ) : (
        <motion.circle
          cx="22" cy="62" r="3.5"
          fill={ACCENT}
          initial={{ opacity: 0.2 }}
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Tiny root lines from seed */}
      <line x1="22" y1="65" x2="18" y2="70" stroke="#52525b" strokeWidth="0.5" opacity="0.2" />
      <line x1="22" y1="65" x2="26" y2="70" stroke="#52525b" strokeWidth="0.5" opacity="0.15" />
      <line x1="22" y1="65" x2="22" y2="71" stroke="#52525b" strokeWidth="0.5" opacity="0.18" />

      {/* Dashed outline of future folders (potential growth) */}
      {!reducedMotion && (
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.2, 0] }}
          transition={{ duration: 5, delay: 2.5, repeat: Infinity }}
        >
          <rect x="50" y="40" width="10" height="8" rx="1.5" stroke={ACCENT} strokeWidth="0.6" strokeDasharray="2 2" fill="none" />
          <rect x="50" y="52" width="10" height="8" rx="1.5" stroke={ACCENT} strokeWidth="0.6" strokeDasharray="2 2" fill="none" />
        </motion.g>
      )}
    </svg>
  );
}
