'use client';

import { motion } from 'framer-motion';
import { BRAIN_CHART } from '../../lib/brainChartColors';

const ACCENT = BRAIN_CHART.brand.accent; // purple

/**
 * Open book with radiating connection lines waiting to be filled.
 * Used for "no entries yet" empty states in KB table/list views.
 */
export default function KBEmptyBookSvg({ reducedMotion }: { reducedMotion?: boolean | null }) {
  // Dot-grid background
  const dots: { cx: number; cy: number }[] = [];
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 7; col++) {
      dots.push({ cx: 6 + col * 13, cy: 6 + row * 13 });
    }
  }

  // Radiating connection lines from the book's spine
  const rays = [
    { x2: 16, y2: 8, delay: 0 },
    { x2: 30, y2: 4, delay: 0.3 },
    { x2: 60, y2: 4, delay: 0.6 },
    { x2: 74, y2: 8, delay: 0.9 },
    { x2: 80, y2: 18, delay: 1.2 },
    { x2: 10, y2: 18, delay: 1.5 },
    { x2: 24, y2: 12, delay: 1.8 },
    { x2: 66, y2: 12, delay: 2.1 },
  ];

  // Terminal nodes at ray endpoints
  const terminals = rays.map(r => ({ cx: r.x2, cy: r.y2, delay: r.delay }));

  return (
    <svg width="90" height="80" viewBox="0 0 90 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <radialGradient id="kbBookGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={ACCENT} stopOpacity="0.3" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="kbBookSpine" x1="45" y1="30" x2="45" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={ACCENT} stopOpacity="0.6" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0.15" />
        </linearGradient>
      </defs>

      {/* Dot-grid canvas */}
      {dots.map((d, i) => (
        <circle key={`grid-${i}`} cx={d.cx} cy={d.cy} r="0.7" fill="#3f3f46" opacity="0.2" />
      ))}

      {/* Center glow behind book */}
      <circle cx="45" cy="38" r="24" fill="url(#kbBookGlow)" />

      {/* Radiating connection lines from spine top */}
      {rays.map((r, i) =>
        reducedMotion ? (
          <line
            key={`ray-${i}`}
            x1="45" y1="30" x2={r.x2} y2={r.y2}
            stroke={ACCENT} strokeWidth="0.6" strokeDasharray="2 3" opacity="0.15"
          />
        ) : (
          <motion.line
            key={`ray-${i}`}
            x1="45" y1="30" x2={r.x2} y2={r.y2}
            stroke={ACCENT} strokeWidth="0.6" strokeDasharray="2 3"
            initial={{ opacity: 0, pathLength: 0 }}
            animate={{ opacity: [0.05, 0.25, 0.05] }}
            transition={{ duration: 4, delay: r.delay, repeat: Infinity, ease: 'easeInOut' }}
          />
        )
      )}

      {/* Terminal nodes */}
      {terminals.map((t, i) =>
        reducedMotion ? (
          <circle key={`term-${i}`} cx={t.cx} cy={t.cy} r="2" fill={ACCENT} opacity="0.25" />
        ) : (
          <motion.circle
            key={`term-${i}`}
            cx={t.cx} cy={t.cy} r="2"
            fill={ACCENT}
            initial={{ opacity: 0.1, scale: 0.6 }}
            animate={{ opacity: [0.1, 0.4, 0.1], scale: [0.7, 1, 0.7] }}
            transition={{ duration: 3.5, delay: t.delay, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformOrigin: `${t.cx}px ${t.cy}px` }}
          />
        )
      )}

      {/* ── Open book ── */}
      <g>
        {/* Spine */}
        <line x1="45" y1="30" x2="45" y2="68" stroke="url(#kbBookSpine)" strokeWidth="1.2" />

        {/* Left page */}
        <path
          d="M45 32 Q35 30, 18 34 L18 64 Q35 60, 45 62"
          fill="none"
          stroke="#52525b"
          strokeWidth="1"
          opacity="0.5"
        />
        {/* Left page inner lines (text placeholder) */}
        <line x1="24" y1="40" x2="40" y2="38" stroke="#3f3f46" strokeWidth="0.5" opacity="0.25" />
        <line x1="24" y1="45" x2="38" y2="43" stroke="#3f3f46" strokeWidth="0.5" opacity="0.2" />
        <line x1="24" y1="50" x2="36" y2="48" stroke="#3f3f46" strokeWidth="0.5" opacity="0.15" />
        <line x1="24" y1="55" x2="38" y2="53" stroke="#3f3f46" strokeWidth="0.5" opacity="0.1" />

        {/* Right page */}
        <path
          d="M45 32 Q55 30, 72 34 L72 64 Q55 60, 45 62"
          fill="none"
          stroke="#52525b"
          strokeWidth="1"
          opacity="0.5"
        />
        {/* Right page inner lines (text placeholder) */}
        <line x1="50" y1="38" x2="66" y2="40" stroke="#3f3f46" strokeWidth="0.5" opacity="0.25" />
        <line x1="52" y1="43" x2="66" y2="45" stroke="#3f3f46" strokeWidth="0.5" opacity="0.2" />
        <line x1="54" y1="48" x2="66" y2="50" stroke="#3f3f46" strokeWidth="0.5" opacity="0.15" />
        <line x1="52" y1="53" x2="66" y2="55" stroke="#3f3f46" strokeWidth="0.5" opacity="0.1" />

        {/* Page outer fill — very subtle */}
        <path
          d="M45 32 Q35 30, 18 34 L18 64 Q35 60, 45 62 Q55 60, 72 64 L72 34 Q55 30, 45 32 Z"
          fill={ACCENT}
          opacity="0.03"
        />
      </g>

      {/* Spine glow dot */}
      {!reducedMotion && (
        <motion.circle
          cx="45" cy="30"
          r="2.5"
          fill={ACCENT}
          initial={{ opacity: 0.2 }}
          animate={{ opacity: [0.2, 0.5, 0.2], r: [2, 3, 2] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      {reducedMotion && (
        <circle cx="45" cy="30" r="2.5" fill={ACCENT} opacity="0.3" />
      )}

      {/* "+" spark near the book to suggest adding */}
      {!reducedMotion && (
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.35, 0] }}
          transition={{ duration: 4.5, delay: 2, repeat: Infinity }}
        >
          <line x1="76" y1="24" x2="82" y2="24" stroke={ACCENT} strokeWidth="0.8" strokeLinecap="round" />
          <line x1="79" y1="21" x2="79" y2="27" stroke={ACCENT} strokeWidth="0.8" strokeLinecap="round" />
        </motion.g>
      )}
    </svg>
  );
}
