/**
 * Harness Stability Widget
 *
 * Compact sparkline+KPI card showing harness-level stability metrics:
 * - Average cycles per run (trend over last 20 runs)
 * - Healing patch fire rate
 * - Config change frequency (provider switches, config target patches)
 * - Provider switch events
 *
 * Data pulled from conductor run history and healing patch records.
 * Scores high in the widget registry when instability is detected.
 */

'use client';

import { useMemo, useId } from 'react';
import { motion } from 'framer-motion';
import { duration } from '@/lib/motion';
import { ShieldAlert, Activity, Wrench, ArrowRightLeft, TrendingDown } from 'lucide-react';
import GlowCard from './GlowCard';
import BrainPanelHeader from './BrainPanelHeader';
import { useConductorStore } from '@/app/features/Conductor/lib/conductorStore';
import { BRAIN_CHART } from '../lib/brainChartColors';
import type { PipelineRunSummary, HealingPatch } from '@/app/features/Conductor/lib/types';

// ── Constants ────────────────────────────────────────────────────────────

const ACCENT = '#f43f5e';                        // rose-500
const GLOW = 'rgba(244, 63, 94, 0.15)';

// ── Types ────────────────────────────────────────────────────────────────

export interface StabilityMetrics {
  /** Average cycles across all runs */
  avgCycles: number;
  /** Per-run cycle counts for sparkline (oldest → newest) */
  cyclesTrend: number[];
  /** Total healing patches fired / total runs */
  healingFireRate: number;
  /** Number of config-targeted healing patches (proxy for config churn) */
  configChangeCount: number;
  /** Number of distinct provider values observed across patches */
  providerSwitchCount: number;
  /** Overall instability score 0-100 — higher = less stable */
  instabilityScore: number;
}

// ── Metric computation ───────────────────────────────────────────────────

export function computeStabilityMetrics(
  runHistory: PipelineRunSummary[],
  healingPatches: HealingPatch[],
): StabilityMetrics {
  // --- cycles trend (oldest first) ---
  const runs = [...runHistory].reverse(); // oldest → newest
  const cyclesTrend = runs.map((r) => r.cycles);
  const avgCycles =
    cyclesTrend.length > 0
      ? cyclesTrend.reduce((s, c) => s + c, 0) / cyclesTrend.length
      : 0;

  // --- healing fire rate ---
  const totalPatches = healingPatches.filter((p) => !p.reverted).length;
  const healingFireRate = runs.length > 0 ? totalPatches / runs.length : 0;

  // --- config change frequency (config-targeted patches) ---
  const configChangeCount = healingPatches.filter(
    (p) => p.targetType === 'config' && !p.reverted,
  ).length;

  // --- provider switch events ---
  // Count unique (pipelineRunId, patchedValue) pairs where the patch changed a
  // provider-related config key. We approximate by counting config patches whose
  // originalValue !== patchedValue as provider switches.
  const providerPatches = healingPatches.filter(
    (p) => p.targetType === 'config' && !p.reverted && p.originalValue !== p.patchedValue,
  );
  const providerSwitchCount = providerPatches.length;

  // --- instability score (0-100) ---
  // Weighted heuristic: high cycles + frequent healing + config churn = unstable
  let score = 0;
  if (avgCycles > 1) score += Math.min((avgCycles - 1) * 15, 30);
  if (healingFireRate > 0) score += Math.min(healingFireRate * 20, 30);
  if (configChangeCount > 0) score += Math.min(configChangeCount * 5, 20);
  if (providerSwitchCount > 0) score += Math.min(providerSwitchCount * 5, 20);
  const instabilityScore = Math.min(Math.round(score), 100);

  return {
    avgCycles,
    cyclesTrend,
    healingFireRate,
    configChangeCount,
    providerSwitchCount,
    instabilityScore,
  };
}

// ── Mini sparkline (inline SVG) ──────────────────────────────────────────

function MiniSparkline({ data, color, width = 64, height = 22 }: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  const gradientId = useId().replace(/:/g, '');

  if (data.length < 2) {
    return (
      <svg width={width} height={height} className="inline-block opacity-40">
        <line x1={4} y1={height / 2} x2={width - 4} y2={height / 2} stroke={color} strokeWidth={1.5} strokeDasharray="3 3" />
      </svg>
    );
  }

  const pad = 3;
  const cw = width - pad * 2;
  const ch = height - pad * 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const pts = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * cw,
    y: pad + ch - ((v - min) / range) * ch,
  }));

  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaD = `${pathD} L ${pts[pts.length - 1].x.toFixed(1)} ${(pad + ch).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(pad + ch).toFixed(1)} Z`;

  let totalLen = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    totalLen += Math.sqrt(dx * dx + dy * dy);
  }
  const dash = Math.ceil(totalLen + 2);

  return (
    <svg width={width} height={height} className="inline-block">
      <defs>
        <linearGradient id={`sg${gradientId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <style>{`
        @keyframes sd${gradientId}{from{stroke-dashoffset:${dash}}to{stroke-dashoffset:0}}
        @keyframes sf${gradientId}{from{opacity:0}to{opacity:1}}
      `}</style>
      <path d={areaD} fill={`url(#sg${gradientId})`} style={{ animation: `sf${gradientId} 0.8s ease-out forwards`, opacity: 0 }} />
      <path d={pathD} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray={dash} strokeDashoffset={dash}
        style={{ animation: `sd${gradientId} 0.6s ease-out forwards` }}
      />
    </svg>
  );
}

// ── KPI row ──────────────────────────────────────────────────────────────

function KpiRow({ icon: Icon, label, value, sub, color, delay }: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      className="flex items-center gap-2.5 py-1.5"
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: duration.normal }}
    >
      <div
        className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}15` }}
      >
        <Icon className="w-3 h-3" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-2xs text-zinc-500 block leading-tight">{label}</span>
      </div>
      <div className="text-right flex-shrink-0">
        <span className="text-xs font-mono font-medium text-zinc-200">{value}</span>
        {sub && <span className="text-2xs text-zinc-600 ml-1">{sub}</span>}
      </div>
    </motion.div>
  );
}

// ── Instability badge ────────────────────────────────────────────────────

function InstabilityBadge({ score }: { score: number }) {
  const level = score >= 60 ? 'high' : score >= 30 ? 'moderate' : 'stable';
  const color =
    level === 'high' ? BRAIN_CHART.negative
      : level === 'moderate' ? BRAIN_CHART.warning
        : BRAIN_CHART.positive;
  const label = level === 'high' ? 'Unstable' : level === 'moderate' ? 'Moderate' : 'Stable';

  return (
    <span
      className="text-2xs font-mono px-1.5 py-0.5 rounded flex-shrink-0"
      style={{ color, background: `${color}15`, border: `1px solid ${color}25` }}
    >
      {label} {score}
    </span>
  );
}

// ── Main widget ──────────────────────────────────────────────────────────

interface Props {
  scope?: 'project' | 'global';
}

export default function HarnessStabilityWidget({ scope = 'project' }: Props) {
  const runHistory = useConductorStore((s) => s.runHistory);
  const healingPatches = useConductorStore((s) => s.healingPatches);

  const metrics = useMemo(
    () => computeStabilityMetrics(runHistory, healingPatches),
    [runHistory, healingPatches],
  );

  const hasData = runHistory.length > 0;

  // Sparkline color based on trend direction
  const trendColor = (() => {
    if (metrics.cyclesTrend.length < 2) return BRAIN_CHART.sparkline.stable;
    const recent = metrics.cyclesTrend.slice(-5);
    const earlier = metrics.cyclesTrend.slice(0, 5);
    const recentAvg = recent.reduce((s, v) => s + v, 0) / recent.length;
    const earlierAvg = earlier.reduce((s, v) => s + v, 0) / earlier.length;
    if (recentAvg > earlierAvg + 0.3) return BRAIN_CHART.sparkline.declining; // more cycles = worse
    if (recentAvg < earlierAvg - 0.3) return BRAIN_CHART.sparkline.growing;  // fewer cycles = better
    return BRAIN_CHART.sparkline.stable;
  })();

  return (
    <GlowCard accentColor={ACCENT} glowColor={GLOW} borderColorClass="border-rose-500/20">
      <div className="p-4">
        <BrainPanelHeader
          icon={ShieldAlert}
          title="Harness Stability"
          accentColor={ACCENT}
          glowColor={GLOW}
          count={runHistory.length}
          trailing={hasData ? <InstabilityBadge score={metrics.instabilityScore} /> : undefined}
        />

        {!hasData ? (
          <div className="py-6 text-center">
            <ShieldAlert className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
            <p className="text-xs text-zinc-600">No run history yet</p>
            <p className="text-2xs text-zinc-700 mt-1">Stability metrics appear after conductor runs complete.</p>
          </div>
        ) : (
          <div className="mt-3 space-y-0.5">
            {/* Sparkline header — cycles trend */}
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-2xs text-zinc-500 uppercase tracking-wide">Cycles / run</span>
              <MiniSparkline data={metrics.cyclesTrend} color={trendColor} width={72} height={20} />
            </div>

            <KpiRow
              icon={Activity}
              label="Avg cycles / run"
              value={metrics.avgCycles.toFixed(1)}
              sub={`of ${runHistory.length} runs`}
              color={metrics.avgCycles > 2 ? BRAIN_CHART.negative : metrics.avgCycles > 1.3 ? BRAIN_CHART.warning : BRAIN_CHART.positive}
              delay={0.05}
            />

            <KpiRow
              icon={Wrench}
              label="Healing fire rate"
              value={metrics.healingFireRate.toFixed(2)}
              sub="patches / run"
              color={metrics.healingFireRate > 1 ? BRAIN_CHART.negative : metrics.healingFireRate > 0.3 ? BRAIN_CHART.warning : BRAIN_CHART.positive}
              delay={0.1}
            />

            <KpiRow
              icon={TrendingDown}
              label="Config changes"
              value={String(metrics.configChangeCount)}
              sub="patches"
              color={metrics.configChangeCount > 3 ? BRAIN_CHART.negative : metrics.configChangeCount > 0 ? BRAIN_CHART.warning : BRAIN_CHART.positive}
              delay={0.15}
            />

            <KpiRow
              icon={ArrowRightLeft}
              label="Provider switches"
              value={String(metrics.providerSwitchCount)}
              sub="events"
              color={metrics.providerSwitchCount > 2 ? BRAIN_CHART.negative : metrics.providerSwitchCount > 0 ? BRAIN_CHART.warning : BRAIN_CHART.positive}
              delay={0.2}
            />

            {/* Footer */}
            <div className="mt-3 pt-2 border-t border-zinc-800/50 text-2xs text-zinc-600 flex justify-between">
              <span>Last {runHistory.length} runs</span>
              <span className="text-zinc-700">Harness health monitor</span>
            </div>
          </div>
        )}
      </div>
    </GlowCard>
  );
}
