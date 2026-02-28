'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';

export interface AnomalyZone {
  /** Start day (0 = today) */
  startDay: number;
  /** End day */
  endDay: number;
  /** Severity determines the zone color */
  severity: 'warning' | 'critical';
  /** Tooltip label */
  label?: string;
}

interface SignalDecayCurveProps {
  decayFactor: number;
  retentionDays: number;
  /** Actual signal data points: [daysAgo, weight] */
  actualSignals?: Array<{ daysAgo: number; weight: number }>;
  /** Highlighted anomaly zones on the chart */
  anomalyZones?: AnomalyZone[];
}

const CHART_WIDTH = 280;
const CHART_HEIGHT = 120;
const PADDING = { top: 10, right: 10, bottom: 24, left: 32 };
const INNER_WIDTH = CHART_WIDTH - PADDING.left - PADDING.right;
const INNER_HEIGHT = CHART_HEIGHT - PADDING.top - PADDING.bottom;

/**
 * SVG chart showing exponential weight decay over time.
 * Overlays actual signal weights as dots on the theoretical curve.
 */
function formatDayLabel(day: number): string {
  if (day === 0) return 'Today';
  if (day === 7) return '1 week';
  if (day === 14) return '2 weeks';
  if (day === 21) return '3 weeks';
  if (day === 28 || day === 30) return '1 month';
  if (day === 60) return '2 months';
  if (day === 90) return '3 months';
  if (day % 7 === 0) return `${day / 7}w`;
  return `${day}d`;
}

export default function SignalDecayCurve({ decayFactor, retentionDays, actualSignals, anomalyZones }: SignalDecayCurveProps) {
  const curvePoints = useMemo(() => {
    const points: string[] = [];
    const steps = 50;
    for (let i = 0; i <= steps; i++) {
      const day = (i / steps) * retentionDays;
      const weight = Math.pow(decayFactor, day);
      const x = PADDING.left + (day / retentionDays) * INNER_WIDTH;
      const y = PADDING.top + (1 - weight) * INNER_HEIGHT;
      points.push(`${x},${y}`);
    }
    return points.join(' ');
  }, [decayFactor, retentionDays]);

  // Compute where the "minimal weight" threshold is (weight < 0.1 = effectively gone)
  const minimalDay = useMemo(() => {
    // Solve: factor^d = 0.1 → d = log(0.1) / log(factor)
    if (decayFactor >= 1) return retentionDays;
    const d = Math.log(0.1) / Math.log(decayFactor);
    return Math.min(d, retentionDays);
  }, [decayFactor, retentionDays]);

  const minimalX = PADDING.left + (minimalDay / retentionDays) * INNER_WIDTH;

  // X-axis labels
  const xLabels = useMemo(() => {
    const labels: Array<{ day: number; x: number }> = [];
    const step = retentionDays <= 14 ? 7 : retentionDays <= 30 ? 10 : 30;
    for (let d = 0; d <= retentionDays; d += step) {
      labels.push({ day: d, x: PADDING.left + (d / retentionDays) * INNER_WIDTH });
    }
    return labels;
  }, [retentionDays]);

  const endStrength = useMemo(() => {
    return Math.round(Math.pow(decayFactor, retentionDays) * 100);
  }, [decayFactor, retentionDays]);

  const ariaLabel = `Signal decay curve: starts at 100%, decays to ${endStrength}% over ${retentionDays} days with factor ${decayFactor.toFixed(2)}${anomalyZones?.length ? `, ${anomalyZones.length} anomaly zone${anomalyZones.length > 1 ? 's' : ''} detected` : ''}`;

  return (
    <div className="w-full">
      <svg width="100%" viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="overflow-visible" role="img" aria-label={ariaLabel}>
        {/* Background */}
        <rect
          x={PADDING.left}
          y={PADDING.top}
          width={INNER_WIDTH}
          height={INNER_HEIGHT}
          fill="rgba(39,39,42,0.3)"
          rx={4}
        />

        {/* Fade zone (after minimal weight threshold) */}
        {minimalDay < retentionDays && (
          <motion.rect
            x={minimalX}
            y={PADDING.top}
            width={PADDING.left + INNER_WIDTH - minimalX}
            height={INNER_HEIGHT}
            fill="rgba(239,68,68,0.05)"
            rx={2}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.6, ease: 'easeOut' }}
          />
        )}

        {/* Anomaly zones */}
        {anomalyZones?.map((zone, i) => {
          const x1 = PADDING.left + (Math.max(0, zone.startDay) / retentionDays) * INNER_WIDTH;
          const x2 = PADDING.left + (Math.min(zone.endDay, retentionDays) / retentionDays) * INNER_WIDTH;
          const fill = zone.severity === 'critical' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.10)';
          const stroke = zone.severity === 'critical' ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.35)';
          return (
            <g key={`anomaly-${i}`}>
              <motion.rect
                x={x1}
                y={PADDING.top}
                width={Math.max(x2 - x1, 2)}
                height={INNER_HEIGHT}
                fill={fill}
                rx={2}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.8 + i * 0.1 }}
              />
              <line
                x1={x1} y1={PADDING.top}
                x2={x1} y2={PADDING.top + INNER_HEIGHT}
                stroke={stroke} strokeWidth={1} strokeDasharray="2,2"
              />
              {zone.label && (
                <text
                  x={x1 + 2}
                  y={PADDING.top + 8}
                  className={`text-[9px] font-medium ${zone.severity === 'critical' ? 'fill-red-400' : 'fill-amber-400'}`}
                >
                  {zone.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Y-axis gridlines */}
        {[0.25, 0.5, 0.75].map(v => {
          const y = PADDING.top + (1 - v) * INNER_HEIGHT;
          return (
            <g key={v}>
              <line
                x1={PADDING.left} y1={y}
                x2={PADDING.left + INNER_WIDTH} y2={y}
                stroke="rgba(63,63,70,0.3)" strokeDasharray="2,2"
              />
              <text x={PADDING.left - 4} y={y + 3} textAnchor="end" className="fill-zinc-600 text-[8px]">
                {(v * 100).toFixed(0)}%
              </text>
            </g>
          );
        })}

        {/* Decay curve */}
        <motion.polyline
          points={curvePoints}
          fill="none"
          stroke="url(#decayCurveGradient)"
          strokeWidth={2}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />

        {/* Gradient for curve */}
        <defs aria-hidden="true">
          <linearGradient id="decayCurveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>

        {/* Actual signal dots */}
        {actualSignals?.map((signal, i) => {
          if (signal.daysAgo > retentionDays) return null;
          const x = PADDING.left + (signal.daysAgo / retentionDays) * INNER_WIDTH;
          const y = PADDING.top + (1 - Math.min(signal.weight, 1)) * INNER_HEIGHT;
          return (
            <motion.circle
              key={i}
              cx={x}
              cy={y}
              r={2.5}
              fill="#10b981"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              transition={{ duration: 0.3, delay: 0.4 + i * 0.05, ease: 'easeOut' }}
            />
          );
        })}

        {/* X-axis labels */}
        {xLabels.map(({ day, x }) => (
          <text key={day} x={x} y={CHART_HEIGHT - 4} textAnchor="middle" className="fill-zinc-500 text-[8px]">
            {formatDayLabel(day)}
          </text>
        ))}

        {/* Y-axis label */}
        <text x={2} y={PADDING.top + INNER_HEIGHT / 2} textAnchor="start" className="fill-zinc-600 text-[7px]" transform={`rotate(-90, 8, ${PADDING.top + INNER_HEIGHT / 2})`}>
          Weight
        </text>

        {/* Retention cutoff line */}
        <line
          x1={PADDING.left + INNER_WIDTH}
          y1={PADDING.top}
          x2={PADDING.left + INNER_WIDTH}
          y2={PADDING.top + INNER_HEIGHT}
          stroke="rgba(239,68,68,0.4)"
          strokeDasharray="3,2"
          strokeWidth={1}
        />
      </svg>
    </div>
  );
}
