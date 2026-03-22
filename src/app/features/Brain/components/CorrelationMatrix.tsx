/**
 * Correlation Matrix
 * Visualizes pairwise temporal correlations between signal types
 * as a heatmap matrix with top-correlations summary cards.
 */

'use client';

import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collapse, collapseTransition } from '../lib/motionPresets';
import {
  Network,
  ArrowRight,
  Clock,
  Hash,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import { useClientProjectStore } from '@/stores/clientProjectStore';
import { useBehavioralCorrelations } from '../lib/queries';
import GlowCard from './GlowCard';
import BrainPanelHeader from './BrainPanelHeader';
import NeuralSkeleton from './NeuralSkeleton';
import SectionHeading from './SectionHeading';
import BrainEmptyState from './BrainEmptyState';
import ChartTooltip from './ChartTooltip';
import CorrelationEmptySvg from './CorrelationEmptySvg';
import type { BehavioralSignalType } from '@/app/db/models/brain.types';
import { BRAIN_CHART, getCorrelationCellColor } from '../lib/brainChartColors';

// ── Types ────────────────────────────────────────────────────────────────────

import type { SignalCorrelation } from '../lib/queries/apiClient';

// ── Constants ────────────────────────────────────────────────────────────────

const ACCENT = BRAIN_CHART.panel.correlation;
const GLOW = BRAIN_CHART.panel.correlationGlow;

const SIGNAL_LABELS: Record<string, string> = {
  git_activity: 'Git',
  api_focus: 'API',
  context_focus: 'Context',
  implementation: 'Impl',
  cross_task_analysis: 'X-Task',
  cross_task_selection: 'X-Select',
  cli_memory: 'CLI',
};

const SIGNAL_TYPES_ORDER: BehavioralSignalType[] = [
  'git_activity',
  'api_focus',
  'context_focus',
  'implementation',
  'cross_task_analysis',
  'cross_task_selection',
  'cli_memory',
];

const STRENGTH_COLORS = BRAIN_CHART.correlation.strength;

interface Props {
  scope?: 'project' | 'global';
}

// ── Component ────────────────────────────────────────────────────────────────

export default function CorrelationMatrix({ scope = 'project' }: Props) {
  const activeProject = useClientProjectStore((s) => s.activeProject);
  const { data, isLoading, refetch } = useBehavioralCorrelations(
    scope === 'global' ? undefined : activeProject?.id
  );
  const [expanded, setExpanded] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{ src: string; tgt: string } | null>(null);
  const [tooltipAnchor, setTooltipAnchor] = useState<DOMRect | null>(null);
  const hoveredCorr = useRef<SignalCorrelation | null>(null);

  if (scope === 'global') {
    return (
      <GlowCard accentColor={ACCENT} glowColor={GLOW} borderColorClass="border-orange-500/20">
        <div className="p-5">
          <BrainPanelHeader
            icon={Network}
            title="Signal Correlations"
            accentColor={ACCENT}
            glowColor={GLOW}
            glow
          />
          <div className="py-6 flex justify-center">
            <BrainEmptyState
              icon={<Network className="w-10 h-10 text-zinc-600" />}
              title="Project scope only"
              description="Select a specific project to view cross-signal correlation analysis."
            />
          </div>
        </div>
      </GlowCard>
    );
  }

  if (isLoading) {
    return (
      <GlowCard accentColor={ACCENT} glowColor={GLOW} borderColorClass="border-orange-500/20" animate={false}>
        <div className="p-5">
          <BrainPanelHeader
            icon={Network}
            title="Signal Correlations"
            accentColor={ACCENT}
            glowColor={GLOW}
            glow
          />
          <NeuralSkeleton accentColor={ACCENT} lines={2} block />
        </div>
      </GlowCard>
    );
  }

  if (!data || data.signalsAnalyzed < 5) {
    return (
      <GlowCard accentColor={ACCENT} glowColor={GLOW} borderColorClass="border-orange-500/20">
        <div className="p-5">
          <BrainPanelHeader
            icon={Network}
            title="Signal Correlations"
            accentColor={ACCENT}
            glowColor={GLOW}
            glow
          />
          <div className="py-6 flex justify-center">
            <BrainEmptyState
              icon={<CorrelationEmptySvg />}
              title="Not enough signal data yet"
              description="At least 5 signals across multiple types are needed for correlation analysis."
            />
          </div>
        </div>
      </GlowCard>
    );
  }

  const { topCorrelations, matrix, signalsAnalyzed, windowDays } = data;

  // Build matrix lookup
  const matrixLookup = new Map<string, SignalCorrelation>();
  for (const c of matrix) {
    matrixLookup.set(`${c.sourceType}:${c.targetType}`, c);
  }

  // Determine which signal types actually have data
  const activeTypes = SIGNAL_TYPES_ORDER.filter((t) =>
    matrix.some((c) => (c.sourceType === t || c.targetType === t) && c.sampleCount > 0)
  );

  return (
    <GlowCard accentColor={ACCENT} glowColor={GLOW} borderColorClass="border-orange-500/20">
      <div className="p-5">
        <BrainPanelHeader
          icon={Network}
          title="Signal Correlations"
          accentColor={ACCENT}
          glowColor={GLOW}
          glow
          count={`${signalsAnalyzed} signals`}
          trailing={
            <span className="text-2xs text-zinc-600 font-mono ml-2">
              {windowDays}d window
            </span>
          }
          right={
            <button
              onClick={() => refetch()}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
              title="Refresh correlations"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          }
        />

        {/* Top Correlations Cards */}
        {topCorrelations.length > 0 && (
          <div className="space-y-2 mb-5">
            <SectionHeading>Strongest Patterns</SectionHeading>
            <div className="grid grid-cols-1 gap-2">
              {topCorrelations.map((c, i) => (
                <motion.div
                  key={`${c.sourceType}-${c.targetType}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{
                    background: `rgba(249, 115, 22, ${0.03 + Math.abs(c.coefficient) * 0.07})`,
                    border: `1px solid rgba(249, 115, 22, ${0.1 + Math.abs(c.coefficient) * 0.15})`,
                  }}
                >
                  {/* Rank */}
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-2xs font-bold flex-shrink-0"
                    style={{
                      background: 'rgba(249, 115, 22, 0.2)',
                      color: ACCENT,
                    }}
                  >
                    {i + 1}
                  </span>

                  {/* Signal flow */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-xs font-mono text-zinc-300">
                      {SIGNAL_LABELS[c.sourceType]}
                    </span>
                    <ArrowRight className="w-3 h-3 text-zinc-600" />
                    <span className="text-xs font-mono text-zinc-300">
                      {SIGNAL_LABELS[c.targetType]}
                    </span>
                  </div>

                  {/* Description */}
                  <span className="text-2xs text-zinc-500 flex-1 truncate">
                    {c.description}
                  </span>

                  {/* Stats */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {c.avgLagMinutes > 0 && (
                      <span className="flex items-center gap-1 text-2xs text-zinc-500" title="Avg lag">
                        <Clock className="w-3 h-3" />
                        {c.avgLagMinutes < 1 ? '<1' : Math.round(c.avgLagMinutes)}m
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-2xs text-zinc-500" title="Sample count">
                      <Hash className="w-3 h-3" />
                      {c.sampleCount}
                    </span>
                    <CoefficientBadge value={c.coefficient} strength={c.strength} />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Expand/Collapse Matrix */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors w-full justify-center py-2 rounded-lg hover:bg-zinc-800/30"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              Hide Correlation Matrix
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              Show Full Matrix ({activeTypes.length}x{activeTypes.length})
            </>
          )}
        </button>

        {/* Full Matrix Heatmap */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              variants={collapse}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={collapseTransition}
              className="overflow-hidden"
            >
              <div className="mt-4 overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="w-16" />
                      {activeTypes.map((t) => (
                        <th
                          key={t}
                          className="text-2xs font-mono text-zinc-500 px-1 py-2 text-center"
                          style={{ minWidth: 48 }}
                        >
                          {SIGNAL_LABELS[t]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeTypes.map((srcType) => (
                      <tr key={srcType}>
                        <td className="text-2xs font-mono text-zinc-500 pr-2 text-right py-1">
                          {SIGNAL_LABELS[srcType]}
                        </td>
                        {activeTypes.map((tgtType) => {
                          if (srcType === tgtType) {
                            return (
                              <td key={tgtType} className="px-1 py-1 text-center">
                                <div
                                  className="w-full aspect-square rounded-md flex items-center justify-center"
                                  style={{ background: 'rgba(63, 63, 70, 0.15)' }}
                                >
                                  <span className="text-3xs text-zinc-700">-</span>
                                </div>
                              </td>
                            );
                          }

                          const corr = matrixLookup.get(`${srcType}:${tgtType}`);
                          const coeff = corr?.coefficient ?? 0;
                          const isHovered =
                            hoveredCell?.src === srcType && hoveredCell?.tgt === tgtType;

                          return (
                            <td key={tgtType} className="px-1 py-1 text-center">
                              <div
                                className="w-full aspect-square rounded-md flex items-center justify-center cursor-default transition-all"
                                style={{
                                  background: getCorrelationCellColor(coeff),
                                  boxShadow: isHovered
                                    ? `0 0 12px ${getCorrelationCellColor(coeff)}`
                                    : undefined,
                                  transform: isHovered ? 'scale(1.15)' : undefined,
                                }}
                                onMouseEnter={(e) => {
                                  setHoveredCell({ src: srcType, tgt: tgtType });
                                  setTooltipAnchor(e.currentTarget.getBoundingClientRect());
                                  hoveredCorr.current = corr ?? null;
                                }}
                                onMouseLeave={() => {
                                  setHoveredCell(null);
                                  setTooltipAnchor(null);
                                  hoveredCorr.current = null;
                                }}
                              >
                                <span
                                  className="text-3xs font-mono"
                                  style={{
                                    color:
                                      Math.abs(coeff) > 0.3
                                        ? 'rgba(255,255,255,0.9)'
                                        : 'rgba(255,255,255,0.4)',
                                  }}
                                >
                                  {coeff > 0 ? '+' : ''}
                                  {coeff.toFixed(2)}
                                </span>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Portal-based tooltip — rendered outside overflow container */}
                <ChartTooltip
                  anchorRect={tooltipAnchor}
                  visible={!!hoveredCell && !!hoveredCorr.current}
                >
                  {hoveredCell && hoveredCorr.current && (
                    <>
                      <div className="text-2xs text-zinc-300 font-medium mb-1">
                        {SIGNAL_LABELS[hoveredCell.src]} → {SIGNAL_LABELS[hoveredCell.tgt]}
                      </div>
                      <div className="text-3xs text-zinc-500 space-y-0.5">
                        <div>r = {hoveredCorr.current.coefficient.toFixed(3)}</div>
                        <div>{hoveredCorr.current.sampleCount} co-occurrences</div>
                        {hoveredCorr.current.avgLagMinutes > 0 && (
                          <div>~{Math.round(hoveredCorr.current.avgLagMinutes)}m avg lag</div>
                        )}
                        <div>{(hoveredCorr.current.followRate * 100).toFixed(0)}% follow rate</div>
                      </div>
                    </>
                  )}
                </ChartTooltip>

                {/* Legend */}
                <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-zinc-800/50">
                  <span className="text-3xs text-zinc-600">Negative</span>
                  <div className="flex gap-0.5">
                    {[-0.8, -0.4, -0.1, 0, 0.1, 0.4, 0.8].map((v) => (
                      <div
                        key={v}
                        className="w-4 h-3 rounded-sm"
                        style={{ background: getCorrelationCellColor(v) }}
                      />
                    ))}
                  </div>
                  <span className="text-3xs text-zinc-600">Positive</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GlowCard>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function CoefficientBadge({
  value,
  strength,
}: {
  value: number;
  strength: string;
}) {
  return (
    <span
      className="text-2xs font-mono font-bold px-1.5 py-0.5 rounded"
      style={{
        color: STRENGTH_COLORS[strength] || BRAIN_CHART.neutral,
        background: `${STRENGTH_COLORS[strength] || BRAIN_CHART.neutral}20`,
        textShadow:
          strength === 'strong'
            ? `0 0 8px ${STRENGTH_COLORS[strength]}80`
            : undefined,
      }}
    >
      {value > 0 ? '+' : ''}
      {value.toFixed(2)}
    </span>
  );
}
