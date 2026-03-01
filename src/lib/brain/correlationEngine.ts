/**
 * Cross-Signal Correlation Engine
 * Detects temporal and causal relationships between different signal types
 * without waiting for LLM reflection. Maintains a rolling correlation matrix
 * over the existing behavioral signal stream.
 *
 * Computes pairwise temporal correlations between signal types across a
 * configurable window (default 14 days), surfacing the strongest patterns.
 */

import { behavioralSignalRepository } from '@/app/db/repositories/behavioral-signal.repository';
import type { BehavioralSignalType } from '@/app/db/models/brain.types';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SignalCorrelation {
  /** Source signal type (A precedes B) */
  sourceType: BehavioralSignalType;
  /** Target signal type */
  targetType: BehavioralSignalType;
  /** Pearson correlation coefficient (-1 to 1) */
  coefficient: number;
  /** Strength label derived from coefficient */
  strength: 'strong' | 'moderate' | 'weak' | 'none';
  /** Average time lag in minutes (A before B) */
  avgLagMinutes: number;
  /** Number of co-occurrence pairs observed */
  sampleCount: number;
  /** Percentage of sourceType events followed by targetType within the window */
  followRate: number;
  /** Human-readable description of the pattern */
  description: string;
}

export interface CorrelationReport {
  projectId: string;
  windowDays: number;
  /** Full pairwise matrix (sourceType x targetType) */
  matrix: SignalCorrelation[];
  /** Top N strongest correlations */
  topCorrelations: SignalCorrelation[];
  /** Total signals analyzed */
  signalsAnalyzed: number;
  generatedAt: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const SIGNAL_TYPES: BehavioralSignalType[] = [
  'git_activity',
  'api_focus',
  'context_focus',
  'implementation',
  'cross_task_analysis',
  'cross_task_selection',
  'cli_memory',
];

/** Maximum minutes between two signals to consider them temporally related */
const MAX_LAG_MINUTES = 120;

/** Bucket size in minutes for time-series binning */
const BUCKET_MINUTES = 30;

// ── Helpers ──────────────────────────────────────────────────────────────────

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 3) return 0;

  const mx = mean(xs);
  const my = mean(ys);

  let num = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    num += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  const denom = Math.sqrt(denomX * denomY);
  if (denom === 0) return 0;
  return num / denom;
}

function classifyStrength(coeff: number): SignalCorrelation['strength'] {
  const abs = Math.abs(coeff);
  if (abs >= 0.6) return 'strong';
  if (abs >= 0.3) return 'moderate';
  if (abs >= 0.1) return 'weak';
  return 'none';
}

function formatType(t: BehavioralSignalType): string {
  return t.replace(/_/g, ' ');
}

/**
 * Bucket timestamps into time-series bins of BUCKET_MINUTES width.
 * Returns a Map<bucketIndex, count>.
 */
function bucketTimestamps(
  timestamps: number[],
  startMs: number,
  totalBuckets: number
): number[] {
  const buckets = new Array(totalBuckets).fill(0);
  const bucketMs = BUCKET_MINUTES * 60 * 1000;

  for (const ts of timestamps) {
    const idx = Math.floor((ts - startMs) / bucketMs);
    if (idx >= 0 && idx < totalBuckets) {
      buckets[idx]++;
    }
  }

  return buckets;
}

// ── Core Engine ──────────────────────────────────────────────────────────────

/**
 * Compute pairwise temporal correlations between all signal types
 * for a given project over the specified window.
 */
export function computeCorrelations(
  projectId: string,
  windowDays: number = 14,
  topN: number = 5
): CorrelationReport {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
  const startMs = new Date(since).getTime();
  const totalBuckets = Math.ceil((windowDays * 24 * 60) / BUCKET_MINUTES);

  // Fetch all signals per type and extract timestamps
  const signalsByType = new Map<BehavioralSignalType, number[]>();
  let totalSignals = 0;

  for (const signalType of SIGNAL_TYPES) {
    const signals = behavioralSignalRepository.getByProject(projectId, {
      signalType,
      since,
      limit: 10000,
    });
    const timestamps = signals.map((s) => new Date(s.timestamp).getTime());
    signalsByType.set(signalType, timestamps);
    totalSignals += signals.length;
  }

  // Build bucketed time-series for each type
  const seriesByType = new Map<BehavioralSignalType, number[]>();
  for (const [type, timestamps] of signalsByType) {
    seriesByType.set(type, bucketTimestamps(timestamps, startMs, totalBuckets));
  }

  // Compute pairwise correlations
  const matrix: SignalCorrelation[] = [];

  for (let i = 0; i < SIGNAL_TYPES.length; i++) {
    for (let j = 0; j < SIGNAL_TYPES.length; j++) {
      if (i === j) continue;

      const sourceType = SIGNAL_TYPES[i];
      const targetType = SIGNAL_TYPES[j];

      const sourceSeries = seriesByType.get(sourceType)!;
      const targetSeries = seriesByType.get(targetType)!;

      const coeff = pearson(sourceSeries, targetSeries);
      const strength = classifyStrength(coeff);

      // Compute temporal lag: for each source event, find closest subsequent target event
      const sourceTimestamps = signalsByType.get(sourceType)!;
      const targetTimestamps = signalsByType.get(targetType)!;

      let lagSum = 0;
      let lagCount = 0;

      if (sourceTimestamps.length > 0 && targetTimestamps.length > 0) {
        // Sort target timestamps for binary-search-style scanning
        const sortedTargets = [...targetTimestamps].sort((a, b) => a - b);

        for (const srcTs of sourceTimestamps) {
          // Find the first target timestamp after srcTs within MAX_LAG_MINUTES
          let lo = 0;
          let hi = sortedTargets.length - 1;
          let best = -1;

          while (lo <= hi) {
            const mid = (lo + hi) >>> 1;
            if (sortedTargets[mid] >= srcTs) {
              best = mid;
              hi = mid - 1;
            } else {
              lo = mid + 1;
            }
          }

          if (best !== -1) {
            const lagMs = sortedTargets[best] - srcTs;
            const lagMin = lagMs / (60 * 1000);
            if (lagMin >= 0 && lagMin <= MAX_LAG_MINUTES) {
              lagSum += lagMin;
              lagCount++;
            }
          }
        }
      }

      const avgLagMinutes = lagCount > 0 ? lagSum / lagCount : 0;
      const followRate = sourceTimestamps.length > 0
        ? lagCount / sourceTimestamps.length
        : 0;

      // Build description
      let description = '';
      if (strength === 'strong' || strength === 'moderate') {
        if (coeff > 0) {
          description = `${formatType(sourceType)} and ${formatType(targetType)} tend to occur together`;
          if (lagCount > 2 && avgLagMinutes > 1) {
            description += ` (${formatType(targetType)} follows ~${Math.round(avgLagMinutes)} min later)`;
          }
        } else {
          description = `${formatType(sourceType)} activity inversely correlates with ${formatType(targetType)}`;
        }
      } else if (strength === 'weak') {
        description = `Weak temporal link between ${formatType(sourceType)} and ${formatType(targetType)}`;
      } else {
        description = `No significant correlation between ${formatType(sourceType)} and ${formatType(targetType)}`;
      }

      matrix.push({
        sourceType,
        targetType,
        coefficient: Math.round(coeff * 1000) / 1000,
        strength,
        avgLagMinutes: Math.round(avgLagMinutes * 10) / 10,
        sampleCount: lagCount,
        followRate: Math.round(followRate * 1000) / 1000,
        description,
      });
    }
  }

  // Surface top N by absolute coefficient, preferring those with decent sample counts
  const topCorrelations = [...matrix]
    .filter((c) => c.sampleCount >= 2)
    .sort((a, b) => {
      // Score: |coefficient| * log(sampleCount + 1) for balanced ranking
      const scoreA = Math.abs(a.coefficient) * Math.log(a.sampleCount + 1);
      const scoreB = Math.abs(b.coefficient) * Math.log(b.sampleCount + 1);
      return scoreB - scoreA;
    })
    .slice(0, topN);

  return {
    projectId,
    windowDays,
    matrix,
    topCorrelations,
    signalsAnalyzed: totalSignals,
    generatedAt: new Date().toISOString(),
  };
}
