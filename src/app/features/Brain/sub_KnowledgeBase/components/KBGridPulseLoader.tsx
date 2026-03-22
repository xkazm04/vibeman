'use client';

import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * KBGridPulseLoader
 *
 * Branded loading skeleton for KB table views.
 * Shows the dot-grid background pulsing outward from center in concentric rings
 * (radar-sweep style) while faint cyan grid lines assemble into skeleton rows
 * that mirror the actual table layout: type badge, title bar, confidence bar.
 *
 * CSS-only animation — no JS runtime cost.
 */

const SKELETON_ROWS = 6;

const ROW_WIDTHS = ['72%', '88%', '55%', '80%', '65%', '92%'];
const BADGE_LABELS = ['BP', 'CV', 'AP', 'OP', 'GT', 'CV'];
const BADGE_COLORS = [
  'rgba(16,185,129,0.12)',  // emerald
  'rgba(59,130,246,0.12)',  // blue
  'rgba(239,68,68,0.12)',   // red
  'rgba(6,182,212,0.12)',   // cyan
  'rgba(245,158,11,0.12)',  // amber
  'rgba(59,130,246,0.12)',  // blue
];
const CONFIDENCE_WIDTHS = ['78%', '45%', '92%', '60%', '33%', '85%'];

export default function KBGridPulseLoader() {
  const prefersReduced = useReducedMotion();

  return (
    <div
      className="relative w-full overflow-hidden py-8 px-4"
      role="status"
      aria-label="Loading knowledge base entries"
    >
      {/* ── Dot-grid background with concentric pulse rings ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(113,113,122,0.15) 1px, transparent 1px)',
          backgroundSize: '16px 16px',
        }}
      />

      {/* Concentric pulse rings — radar sweep from center */}
      {!prefersReduced && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className="absolute rounded-full border border-cyan-500/[0.07] kb-grid-pulse-ring"
              style={{
                width: `${120 + i * 100}px`,
                height: `${120 + i * 100}px`,
                animationDelay: `${i * 0.5}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* ── Skeleton rows mirroring actual table layout ── */}
      <div className="relative space-y-0">
        {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-800/20 kb-grid-pulse-row"
            style={{
              animationDelay: prefersReduced ? '0s' : `${i * 0.1}s`,
            }}
          >
            {/* Type badge skeleton */}
            <div
              className="flex-shrink-0 w-7 h-5 rounded flex items-center justify-center"
              style={{ background: BADGE_COLORS[i % BADGE_COLORS.length] }}
            >
              <span
                className="text-2xs font-mono font-medium"
                style={{ color: 'rgba(161,161,170,0.3)' }}
              >
                {BADGE_LABELS[i % BADGE_LABELS.length]}
              </span>
            </div>

            {/* Title + subtitle skeleton */}
            <div className="flex-1 min-w-0 space-y-1.5">
              <div
                className="h-3 rounded-sm relative overflow-hidden"
                style={{
                  width: ROW_WIDTHS[i % ROW_WIDTHS.length],
                  background: 'rgba(113,113,122,0.08)',
                }}
              >
                {!prefersReduced && (
                  <div
                    className="absolute inset-0 kb-grid-pulse-shimmer"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                )}
              </div>
              <div
                className="h-2 rounded-sm"
                style={{
                  width: `${parseInt(ROW_WIDTHS[i % ROW_WIDTHS.length]) * 0.6}%`,
                  background: 'rgba(113,113,122,0.05)',
                }}
              />
            </div>

            {/* Category skeleton */}
            <div
              className="hidden sm:block flex-shrink-0 w-12 h-2.5 rounded-sm"
              style={{ background: 'rgba(113,113,122,0.06)' }}
            />

            {/* Confidence bar skeleton */}
            <div className="flex items-center gap-1 flex-shrink-0 w-14">
              <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(113,113,122,0.1)' }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: CONFIDENCE_WIDTHS[i % CONFIDENCE_WIDTHS.length],
                    background: 'rgba(6,182,212,0.15)',
                  }}
                />
              </div>
              <div
                className="w-4 h-2 rounded-sm"
                style={{ background: 'rgba(113,113,122,0.06)' }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* ── Assembling grid-line overlay ── */}
      {!prefersReduced && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {/* Horizontal faint cyan grid lines that assemble */}
          {[0.18, 0.34, 0.50, 0.66, 0.82].map((y, i) => (
            <line
              key={`h-${i}`}
              x1="0%"
              y1={`${y * 100}%`}
              x2="100%"
              y2={`${y * 100}%`}
              stroke="rgba(6,182,212,0.06)"
              strokeWidth="0.5"
              className="kb-grid-pulse-line"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
          {/* Vertical faint cyan grid lines */}
          {[0.06, 0.12, 0.65, 0.85].map((x, i) => (
            <line
              key={`v-${i}`}
              x1={`${x * 100}%`}
              y1="0%"
              x2={`${x * 100}%`}
              y2="100%"
              stroke="rgba(6,182,212,0.04)"
              strokeWidth="0.5"
              className="kb-grid-pulse-line"
              style={{ animationDelay: `${0.5 + i * 0.15}s` }}
            />
          ))}
        </svg>
      )}

      {/* Screen-reader text */}
      <span className="sr-only">Loading knowledge base entries...</span>
    </div>
  );
}
