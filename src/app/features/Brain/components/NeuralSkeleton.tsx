'use client';

/**
 * NeuralSkeleton
 *
 * Branded skeleton loading component for Brain panels.
 * Uses a neural-pathway SVG pattern with a traveling gradient shimmer
 * that flows left-to-right like a signal propagating through a network.
 * Nodes light up sequentially as the signal passes.
 * CSS-only animation — no JS overhead.
 */

interface NeuralSkeletonProps {
  accentColor: string;
  /** Number of skeleton lines to show */
  lines?: number;
  /** Show a larger block (e.g. for chart areas) */
  block?: boolean;
  className?: string;
}

/* Unique ID counter to avoid SVG gradient collisions when multiple skeletons render */
let idCounter = 0;

export default function NeuralSkeleton({
  accentColor,
  lines = 3,
  block = false,
  className = '',
}: NeuralSkeletonProps) {
  const uid = `ns-${++idCounter}`;

  const toRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  };

  return (
    <div className={`relative overflow-hidden ${className}`} role="status" aria-label="Loading">
      {/* Neural pathway SVG background — more detailed branching network */}
      <svg
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="none"
        viewBox="0 0 300 100"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          {/* Traveling signal gradient */}
          <linearGradient id={`${uid}-sig`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0" />
            <stop offset="40%" stopColor={accentColor} stopOpacity="0.35" />
            <stop offset="50%" stopColor={accentColor} stopOpacity="0.5" />
            <stop offset="60%" stopColor={accentColor} stopOpacity="0.35" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* ── Main neural pathways ──────────────────────────────── */}
        {/* Primary horizontal trunk */}
        <path
          d="M0 50 Q30 35 60 50 T120 45 Q150 55 180 48 T240 50 L300 45"
          stroke={accentColor}
          strokeWidth="0.6"
          opacity="0.08"
          strokeDasharray="4 4"
          style={{ animation: 'neuralPathDash 3s linear infinite' }}
        />
        {/* Upper branch */}
        <path
          d="M0 28 Q40 18 80 30 T160 22 Q200 30 240 25 L300 20"
          stroke={accentColor}
          strokeWidth="0.4"
          opacity="0.06"
          strokeDasharray="3 5"
          style={{ animation: 'neuralPathDash 4s linear infinite' }}
        />
        {/* Lower branch */}
        <path
          d="M0 72 Q50 80 100 70 T200 75 Q240 68 270 72 L300 70"
          stroke={accentColor}
          strokeWidth="0.4"
          opacity="0.06"
          strokeDasharray="3 5"
          style={{ animation: 'neuralPathDash 4.5s linear infinite' }}
        />
        {/* Cross-connections (vertical bridges between pathways) */}
        <path d="M60 30 Q65 40 60 50" stroke={accentColor} strokeWidth="0.3" opacity="0.05" />
        <path d="M120 45 Q125 58 120 70" stroke={accentColor} strokeWidth="0.3" opacity="0.05" />
        <path d="M180 22 Q185 35 180 48" stroke={accentColor} strokeWidth="0.3" opacity="0.05" />
        <path d="M240 25 Q235 38 240 50" stroke={accentColor} strokeWidth="0.3" opacity="0.05" />
        <path d="M200 50 Q205 62 200 75" stroke={accentColor} strokeWidth="0.3" opacity="0.05" />

        {/* ── Synapse nodes — pulse sequentially to simulate signal travel ── */}
        {[
          { cx: 30, cy: 38, delay: '0s' },
          { cx: 60, cy: 50, delay: '0.3s' },
          { cx: 80, cy: 30, delay: '0.5s' },
          { cx: 120, cy: 45, delay: '0.8s' },
          { cx: 120, cy: 70, delay: '0.9s' },
          { cx: 160, cy: 22, delay: '1.1s' },
          { cx: 180, cy: 48, delay: '1.3s' },
          { cx: 200, cy: 75, delay: '1.5s' },
          { cx: 240, cy: 50, delay: '1.7s' },
          { cx: 240, cy: 25, delay: '1.8s' },
          { cx: 270, cy: 72, delay: '2.0s' },
        ].map((n, i) => (
          <circle
            key={i}
            cx={n.cx}
            cy={n.cy}
            r="1.5"
            fill={accentColor}
            style={{
              animation: `neuralNodePulse 2.5s ease-in-out ${n.delay} infinite`,
            }}
          />
        ))}
      </svg>

      {/* Skeleton content lines with traveling signal shimmer */}
      <div className="relative space-y-2.5">
        {block && (
          <div
            className="h-24 rounded-md relative overflow-hidden"
            style={{ background: toRgba(accentColor, 0.05) }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(90deg, transparent 0%, ${toRgba(accentColor, 0.1)} 40%, ${toRgba(accentColor, 0.15)} 50%, ${toRgba(accentColor, 0.1)} 60%, transparent 100%)`,
                animation: 'neuralSignal 2.2s ease-in-out infinite',
              }}
            />
          </div>
        )}
        {Array.from({ length: lines }).map((_, i) => {
          const widths = ['85%', '92%', '60%', '75%', '50%'];
          return (
            <div
              key={i}
              className="h-3.5 rounded relative overflow-hidden"
              style={{
                background: toRgba(accentColor, 0.05),
                width: widths[i % widths.length],
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(90deg, transparent 0%, ${toRgba(accentColor, 0.12)} 40%, ${toRgba(accentColor, 0.18)} 50%, ${toRgba(accentColor, 0.12)} 60%, transparent 100%)`,
                  animation: `neuralSignal 2.2s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
