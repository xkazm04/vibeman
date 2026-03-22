'use client';

import { motion } from 'framer-motion';
import { BRAIN_CHART } from '../lib/brainChartColors';
import { DATA_FONT } from '../lib/brainFonts';

const ACCENT = BRAIN_CHART.panel.correlation;

/**
 * Disconnected-nodes illustration for CorrelationMatrix empty state.
 * Five isolated nodes with dashed potential-connection lines,
 * suggesting data that hasn't yet been linked.
 */
export default function CorrelationEmptySvg({ reducedMotion }: { reducedMotion?: boolean | null }) {
  const nodes = [
    { cx: 16, cy: 18, r: 4.5, delay: 0 },
    { cx: 64, cy: 14, r: 4,   delay: 0.4 },
    { cx: 40, cy: 36, r: 5.5, delay: 0.8 },
    { cx: 20, cy: 56, r: 3.5, delay: 1.2 },
    { cx: 60, cy: 54, r: 4,   delay: 1.6 },
  ];

  const edges = [
    { x1: 16, y1: 18, x2: 40, y2: 36 },
    { x1: 64, y1: 14, x2: 40, y2: 36 },
    { x1: 20, y1: 56, x2: 40, y2: 36 },
    { x1: 60, y1: 54, x2: 40, y2: 36 },
    { x1: 16, y1: 18, x2: 64, y2: 14 },
    { x1: 20, y1: 56, x2: 60, y2: 54 },
  ];

  return (
    <svg width="80" height="72" viewBox="0 0 80 72" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <radialGradient id="corrNodeGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={ACCENT} stopOpacity="0.6" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Dashed connection lines — potential links not yet formed */}
      {edges.map((e, i) =>
        reducedMotion ? (
          <line
            key={i}
            x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
            stroke={ACCENT} strokeWidth="0.8" strokeDasharray="3 4" opacity="0.15"
          />
        ) : (
          <motion.line
            key={i}
            x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
            stroke={ACCENT} strokeWidth="0.8" strokeDasharray="3 4"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.08, 0.22, 0.08] }}
            transition={{ duration: 4, delay: i * 0.3, repeat: Infinity, ease: 'easeInOut' }}
          />
        )
      )}

      {/* Node glow halos */}
      {nodes.map((n, i) => (
        <circle key={`glow-${i}`} cx={n.cx} cy={n.cy} r={n.r * 2.5} fill="url(#corrNodeGlow)" opacity="0.3" />
      ))}

      {/* Solid nodes */}
      {nodes.map((n, i) =>
        reducedMotion ? (
          <circle key={i} cx={n.cx} cy={n.cy} r={n.r} fill={ACCENT} opacity="0.5" />
        ) : (
          <motion.circle
            key={i}
            cx={n.cx} cy={n.cy} r={n.r}
            fill={ACCENT}
            initial={{ opacity: 0.25, scale: 0.8 }}
            animate={{ opacity: [0.25, 0.6, 0.25], scale: [0.85, 1, 0.85] }}
            transition={{ duration: 3, delay: n.delay, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformOrigin: `${n.cx}px ${n.cy}px` }}
          />
        )
      )}

      {/* Tiny question-mark spark near center node */}
      {!reducedMotion && (
        <motion.text
          x="48" y="32"
          fontSize="8" fontFamily={DATA_FONT} fill={ACCENT}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.4, 0] }}
          transition={{ duration: 4, delay: 2, repeat: Infinity }}
        >
          ?
        </motion.text>
      )}
    </svg>
  );
}
