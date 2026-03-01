/**
 * Correlation Matrix
 * Visualizes pairwise temporal correlations between signal types
 * as a heatmap matrix with top-correlations summary cards.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Network,
  ArrowRight,
  Clock,
  Hash,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import GlowCard from './GlowCard';
import BrainPanelHeader from './BrainPanelHeader';
import type { BehavioralSignalType } from '@/app/db/models/brain.types';

// ── Types ────────────────────────────────────────────────────────────────────

interface SignalCorrelation {
  sourceType: BehavioralSignalType;
  targetType: BehavioralSignalType;
  coefficient: number;
  strength: 'strong' | 'moderate' | 'weak' | 'none';
  avgLagMinutes: number;
  sampleCount: number;
  followRate: number;
  description: string;
}

interface CorrelationResponse {
  success: boolean;
  projectId: string;
  windowDays: number;
  matrix: SignalCorrelation[];
  topCorrelations: SignalCorrelation[];
  signalsAnalyzed: number;
  generatedAt: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const ACCENT = '#f97316'; // Orange
const GLOW = 'rgba(249, 115, 22, 0.15)';

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

const STRENGTH_COLORS: Record<string, string> = {
  strong: '#f97316',
  moderate: '#fb923c',
  weak: '#fdba74',
  none: 'rgba(63, 63, 70, 0.3)',
};

interface Props {
  scope?: 'project' | 'global';
}

// ── Component ────────────────────────────────────────────────────────────────

export default function CorrelationMatrix({ scope = 'project' }: Props) {
  const activeProject = useActiveProjectStore((s) => s.activeProject);
  const [data, setData] = useState<CorrelationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{ src: string; tgt: string } | null>(null);

  const fetchCorrelations = useCallback(async (projectId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/brain/correlations?projectId=${encodeURIComponent(projectId)}&windowDays=14&topN=5`
      );
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setData(json);
        }
      }
    } catch {
      // Non-critical
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (scope === 'global' || !activeProject?.id) return;
    fetchCorrelations(activeProject.id);
  }, [scope, activeProject?.id, fetchCorrelations]);

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
          <p className="text-zinc-500 text-sm">
            Select a specific project to view cross-signal correlation analysis.
          </p>
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
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-zinc-800 rounded w-3/4" />
            <div className="h-32 bg-zinc-800 rounded" />
          </div>
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
          <p className="text-zinc-500 text-sm">
            Not enough signal data for correlation analysis. At least 5 signals across multiple types are needed.
          </p>
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
              onClick={() => activeProject?.id && fetchCorrelations(activeProject.id)}
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
            <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
              Strongest Patterns
            </h3>
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
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
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
                                className="w-full aspect-square rounded-md flex items-center justify-center cursor-default transition-all relative"
                                style={{
                                  background: getCellColor(coeff),
                                  boxShadow: isHovered
                                    ? `0 0 12px ${getCellColor(coeff)}`
                                    : undefined,
                                  transform: isHovered ? 'scale(1.15)' : undefined,
                                }}
                                onMouseEnter={() =>
                                  setHoveredCell({ src: srcType, tgt: tgtType })
                                }
                                onMouseLeave={() => setHoveredCell(null)}
                                title={corr?.description || 'No data'}
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

                              {/* Tooltip on hover */}
                              {isHovered && corr && (
                                <div className="absolute z-50 mt-1 left-1/2 -translate-x-1/2 bg-zinc-900/95 backdrop-blur-sm border border-zinc-700/50 rounded-lg px-3 py-2 text-left shadow-xl pointer-events-none whitespace-nowrap">
                                  <div className="text-2xs text-zinc-300 font-medium mb-1">
                                    {SIGNAL_LABELS[srcType]} → {SIGNAL_LABELS[tgtType]}
                                  </div>
                                  <div className="text-3xs text-zinc-500 space-y-0.5">
                                    <div>r = {corr.coefficient.toFixed(3)}</div>
                                    <div>{corr.sampleCount} co-occurrences</div>
                                    {corr.avgLagMinutes > 0 && (
                                      <div>~{Math.round(corr.avgLagMinutes)}m avg lag</div>
                                    )}
                                    <div>{(corr.followRate * 100).toFixed(0)}% follow rate</div>
                                  </div>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Legend */}
                <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-zinc-800/50">
                  <span className="text-3xs text-zinc-600">Negative</span>
                  <div className="flex gap-0.5">
                    {[-0.8, -0.4, -0.1, 0, 0.1, 0.4, 0.8].map((v) => (
                      <div
                        key={v}
                        className="w-4 h-3 rounded-sm"
                        style={{ background: getCellColor(v) }}
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

function getCellColor(coefficient: number): string {
  const abs = Math.abs(coefficient);
  if (abs < 0.05) return 'rgba(63, 63, 70, 0.2)';

  if (coefficient > 0) {
    // Orange scale for positive correlations
    if (abs >= 0.6) return 'rgba(249, 115, 22, 0.7)';
    if (abs >= 0.3) return 'rgba(249, 115, 22, 0.4)';
    return 'rgba(249, 115, 22, 0.2)';
  } else {
    // Blue scale for negative correlations
    if (abs >= 0.6) return 'rgba(59, 130, 246, 0.7)';
    if (abs >= 0.3) return 'rgba(59, 130, 246, 0.4)';
    return 'rgba(59, 130, 246, 0.2)';
  }
}

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
        color: STRENGTH_COLORS[strength] || '#71717a',
        background: `${STRENGTH_COLORS[strength] || '#71717a'}20`,
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
