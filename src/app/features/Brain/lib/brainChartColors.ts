/**
 * Brain Chart Color Palette
 *
 * Unified color system for all Brain data visualizations.
 * Anchored on brand accent (#8b5cf6 purple) and primary (#3b82f6 blue).
 *
 * Usage: import { BRAIN_CHART } from '../lib/brainChartColors';
 */

export const BRAIN_CHART = {
  // ── Semantic chart tokens ────────────────────────────────────────────
  positive: '#10b981',      // emerald-500 — success, improving
  negative: '#ef4444',      // red-500 — failure, declining
  neutral: '#a1a1aa',       // zinc-400 — stable, no change
  warning: '#f59e0b',       // amber-500 — caution, needs attention

  // ── Trend tokens ────────────────────────────────────────────────────
  trend: {
    improving: '#10b981',   // emerald
    declining: '#f59e0b',   // amber
    stable: '#a1a1aa',      // zinc-400
  },

  // ── Decay / signal curve ────────────────────────────────────────────
  decay: {
    start: '#a855f7',       // purple — brand accent
    end: '#3b82f6',         // blue — primary
    signal: '#10b981',      // emerald — actual data points
  },

  // ── Sparkline (confidence trend) ────────────────────────────────────
  sparkline: {
    growing: '#4ade80',     // green-400
    stable: '#a1a1aa',      // zinc-400
    declining: '#fbbf24',   // amber-400
  },

  // ── Correlation matrix ──────────────────────────────────────────────
  correlation: {
    positive: '#f97316',    // orange — positive correlation
    negative: '#3b82f6',    // blue — negative correlation
    none: 'rgba(63, 63, 70, 0.3)',
    strength: {
      strong: '#f97316',
      moderate: '#fb923c',
      weak: '#fdba74',
      none: 'rgba(63, 63, 70, 0.3)',
    },
  },

  // ── Panel accent colors ─────────────────────────────────────────────
  panel: {
    insights: '#f59e0b',    // amber
    focus: '#06b6d4',       // cyan
    correlation: '#f97316', // orange
    outcomes: '#f59e0b',    // amber
    decay: '#a855f7',       // purple
    // Glow variants (15% opacity of the accent)
    insightsGlow: 'rgba(245, 158, 11, 0.15)',
    focusGlow: 'rgba(6, 182, 212, 0.15)',
    correlationGlow: 'rgba(249, 115, 22, 0.15)',
    outcomesGlow: 'rgba(245, 158, 11, 0.15)',
    decayGlow: 'rgba(168, 85, 247, 0.15)',
  },

  // ── Sequential heatmap scale (light to dark) ────────────────────────
  heatmap: [
    'rgba(139, 92, 246, 0.05)',   // 0 — near-zero
    'rgba(139, 92, 246, 0.15)',   // 1
    'rgba(139, 92, 246, 0.30)',   // 2
    'rgba(139, 92, 246, 0.50)',   // 3
    'rgba(139, 92, 246, 0.70)',   // 4
    'rgba(139, 92, 246, 0.90)',   // 5 — peak
  ],

  // ── Outcome status colors ───────────────────────────────────────────
  outcome: {
    success: { color: '#10b981', glow: 'rgba(16, 185, 129, 0.15)', border: 'border-emerald-500/20' },
    failed: { color: '#ef4444', glow: 'rgba(239, 68, 68, 0.15)', border: 'border-red-500/20' },
    reverted: { color: '#f97316', glow: 'rgba(249, 115, 22, 0.15)', border: 'border-orange-500/20' },
    pending: { color: '#a855f7', glow: 'rgba(168, 85, 247, 0.15)', border: 'border-purple-500/20' },
    total: { color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.15)', border: 'border-amber-500/20' },
  },

  // ── Signal type colors (heatmap drill-down, activity views) ────────
  signalType: {
    git_activity: '#10b981',
    api_focus: '#3b82f6',
    context_focus: '#8b5cf6',
    implementation: '#f59e0b',
    cross_task_analysis: '#ec4899',
    cross_task_selection: '#f43f5e',
    cli_memory: '#06b6d4',
  } as Record<string, string>,

  // ── Verdict / effectiveness colors ─────────────────────────────────
  verdict: {
    helpful:    { color: '#10b981', glow: 'rgba(16, 185, 129, 0.15)', border: 'border-emerald-500/20' },
    misleading: { color: '#ef4444', glow: 'rgba(239, 68, 68, 0.15)', border: 'border-red-500/20' },
    neutral:    { color: '#a855f7', glow: 'rgba(168, 85, 247, 0.15)', border: 'border-purple-500/20' },
  },

  // ── Freshness indicator ────────────────────────────────────────────
  freshness: {
    fresh:    { color: '#10b981', glow: 'rgba(16, 185, 129, 0.5)' },
    moderate: { color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.5)' },
    stale:    { color: '#71717a', glow: 'none' },
  },

  // ── Brand anchors (from globals.css) ───────────────────────────────
  brand: {
    accent: '#8b5cf6',    // purple — used as heatmap base, trend gradients
    primary: '#3b82f6',   // blue — used as primary data color
    accentDark: '#7c3aed', // purple-600 — gradient end
  },
} as const;

/** Helper: get heatmap intensity color for a value within a max range */
export function getHeatmapIntensity(value: number, max: number): string {
  if (max === 0 || value === 0) return 'rgba(63, 63, 70, 0.3)';
  const ratio = Math.min(value / max, 1);
  if (ratio < 0.2) return BRAIN_CHART.heatmap[1];
  if (ratio < 0.4) return BRAIN_CHART.heatmap[2];
  if (ratio < 0.6) return BRAIN_CHART.heatmap[3];
  if (ratio < 0.8) return BRAIN_CHART.heatmap[4];
  return BRAIN_CHART.heatmap[5];
}

/** Helper: get correlation cell background for a coefficient value */
export function getCorrelationCellColor(coefficient: number): string {
  const abs = Math.abs(coefficient);
  if (abs < 0.05) return 'rgba(63, 63, 70, 0.2)';

  if (coefficient > 0) {
    if (abs >= 0.6) return 'rgba(249, 115, 22, 0.7)';
    if (abs >= 0.3) return 'rgba(249, 115, 22, 0.4)';
    return 'rgba(249, 115, 22, 0.2)';
  } else {
    if (abs >= 0.6) return 'rgba(59, 130, 246, 0.7)';
    if (abs >= 0.3) return 'rgba(59, 130, 246, 0.4)';
    return 'rgba(59, 130, 246, 0.2)';
  }
}
