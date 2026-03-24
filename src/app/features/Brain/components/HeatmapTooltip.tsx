/**
 * Rich hover tooltip for heatmap cells.
 * Replaces native SVG <title> with a positioned glassmorphic card
 * showing signal count, weight, and type breakdown mini-bars.
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { BRAIN_CHART } from '../lib/brainChartColors';
import { DATA_FONT } from '../lib/brainFonts';

// ── Types ────────────────────────────────────────────────────────────────────

export interface TooltipTypeBreakdown {
  type: string;
  label: string;
  count: number;
  weight: number;
  color: string;
}

export interface HeatmapTooltipData {
  /** Primary label (e.g. date or time slot) */
  label: string;
  /** Total signal count */
  count: number;
  /** Total effective weight */
  weight: number;
  /** Per-type breakdown for mini bars */
  breakdown: TooltipTypeBreakdown[];
  /** Accent color for the ring highlight */
  accentColor: string;
}

interface HeatmapTooltipProps {
  data: HeatmapTooltipData | null;
  /** Position relative to the SVG container */
  x: number;
  y: number;
  /** Bounds of the container for edge-clamping */
  containerWidth: number;
}

// ── Component ────────────────────────────────────────────────────────────────

const TOOLTIP_WIDTH = 220;

export default function HeatmapTooltip({ data, x, y, containerWidth }: HeatmapTooltipProps) {
  // Clamp horizontally so tooltip doesn't overflow container
  const clampedX = Math.min(
    Math.max(x - TOOLTIP_WIDTH / 2, 4),
    containerWidth - TOOLTIP_WIDTH - 4
  );
  // Position above the cell by default
  const posY = y - 8;

  return (
    <AnimatePresence>
      {data && (
        <motion.div
          initial={{ opacity: 0, y: 4, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.96 }}
          transition={{ duration: 0.12, ease: 'easeOut' }}
          className="absolute z-50 pointer-events-none"
          style={{
            left: clampedX,
            bottom: `calc(100% - ${posY}px)`,
            width: TOOLTIP_WIDTH,
            fontFamily: DATA_FONT,
          }}
        >
          <div className="bg-zinc-800 border border-zinc-600 rounded-lg shadow-2xl p-3 space-y-2">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-200">{data.label}</span>
              <span className="text-2xs text-zinc-400 tabular-nums">
                {data.weight.toFixed(1)}w
              </span>
            </div>

            {/* Signal count */}
            <div className="text-2xs text-zinc-400">
              {data.count} signal{data.count !== 1 ? 's' : ''}
            </div>

            {/* Type breakdown mini-bars */}
            {data.breakdown.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-zinc-700/50">
                {data.breakdown.slice(0, 5).map((entry) => {
                  const maxWeight = Math.max(...data.breakdown.map((b) => b.weight), 1);
                  const barPct = (entry.weight / maxWeight) * 100;
                  return (
                    <div key={entry.type} className="space-y-0.5">
                      <div className="flex items-center justify-between text-2xs">
                        <span className="text-zinc-300 truncate">{entry.label}</span>
                        <span className="text-zinc-500 tabular-nums ml-1.5">
                          {entry.count}
                        </span>
                      </div>
                      <div className="h-1 rounded-full bg-zinc-700/60 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-200"
                          style={{
                            width: `${barPct}%`,
                            backgroundColor: entry.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
                {data.breakdown.length > 5 && (
                  <span className="text-2xs text-zinc-600">+{data.breakdown.length - 5} more</span>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
