/**
 * Anomaly Detector
 * Compares current-period signal metrics against a rolling baseline
 * (30-day average ± standard deviation) to surface unusual patterns.
 */

import { behavioralSignalRepository } from '@/app/db/repositories/behavioral-signal.repository';
import type { BehavioralSignalType } from '@/app/db/models/brain.types';

// ── Types ────────────────────────────────────────────────────────────────────

export type AnomalySeverity = 'info' | 'warning' | 'critical';
export type AnomalyKind =
  | 'activity_drop'
  | 'activity_spike'
  | 'failure_spike'
  | 'context_neglected'
  | 'signal_gap';

export interface SignalAnomaly {
  id: string;
  kind: AnomalyKind;
  severity: AnomalySeverity;
  title: string;
  description: string;
  /** Signal type that triggered this anomaly */
  signalType: BehavioralSignalType | 'all';
  /** Current period metric value */
  currentValue: number;
  /** Baseline average */
  baselineAvg: number;
  /** How many standard deviations from the mean */
  zScore: number;
  /** ISO timestamp of detection */
  detectedAt: string;
  /** Optional context that is affected */
  contextId?: string;
  contextName?: string;
}

export interface AnomalyReport {
  projectId: string;
  anomalies: SignalAnomaly[];
  baselineDays: number;
  currentWindowDays: number;
  generatedAt: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: number[], avg: number): number {
  if (values.length < 2) return 0;
  const variance = values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function makeId(kind: AnomalyKind, signalType: string, extra?: string): string {
  return `anomaly_${kind}_${signalType}${extra ? '_' + extra : ''}`;
}

/**
 * Bucket signals by day, returning an array of daily counts
 * for the specified number of past days.
 */
function bucketByDay(
  timestamps: string[],
  days: number
): number[] {
  const now = Date.now();
  const buckets = new Array(days).fill(0);

  for (const ts of timestamps) {
    const daysAgo = Math.floor((now - new Date(ts).getTime()) / (24 * 60 * 60 * 1000));
    if (daysAgo >= 0 && daysAgo < days) {
      buckets[daysAgo]++;
    }
  }

  return buckets;
}

// ── Core detection ───────────────────────────────────────────────────────────

const SIGNAL_TYPES: BehavioralSignalType[] = [
  'git_activity',
  'api_focus',
  'context_focus',
  'implementation',
];

const Z_THRESHOLD_WARNING = 1.5;
const Z_THRESHOLD_CRITICAL = 2.5;

function classifySeverity(zScore: number): AnomalySeverity {
  const abs = Math.abs(zScore);
  if (abs >= Z_THRESHOLD_CRITICAL) return 'critical';
  if (abs >= Z_THRESHOLD_WARNING) return 'warning';
  return 'info';
}

/**
 * Detect anomalies for a project by comparing recent activity
 * against a rolling baseline.
 */
export function detectAnomalies(
  projectId: string,
  baselineDays: number = 30,
  currentWindowDays: number = 3
): AnomalyReport {
  const anomalies: SignalAnomaly[] = [];
  const now = new Date();
  const nowIso = now.toISOString();

  for (const signalType of SIGNAL_TYPES) {
    // Fetch all signals in the baseline window
    const signals = behavioralSignalRepository.getByProject(projectId, {
      signalType,
      since: new Date(Date.now() - baselineDays * 24 * 60 * 60 * 1000).toISOString(),
      limit: 10000,
    });

    if (signals.length < 5) continue; // Not enough data for meaningful baseline

    const dailyCounts = bucketByDay(
      signals.map((s) => s.timestamp),
      baselineDays
    );

    // Split into baseline (older) and current (recent)
    const baselineCounts = dailyCounts.slice(currentWindowDays);
    const currentCounts = dailyCounts.slice(0, currentWindowDays);

    const baselineAvg = mean(baselineCounts);
    const baselineStd = stdDev(baselineCounts, baselineAvg);
    const currentAvg = mean(currentCounts);

    // Skip if baseline has no variance (all zeros or all same)
    if (baselineStd === 0 && baselineAvg === 0) continue;

    const zScore = baselineStd > 0
      ? (currentAvg - baselineAvg) / baselineStd
      : (currentAvg === baselineAvg ? 0 : currentAvg > baselineAvg ? 3 : -3);

    const severity = classifySeverity(zScore);
    if (severity === 'info') continue; // Only surface warnings and critical

    const typeLabel = signalType.replace(/_/g, ' ');

    if (zScore < 0) {
      // Activity drop
      anomalies.push({
        id: makeId('activity_drop', signalType),
        kind: 'activity_drop',
        severity,
        title: `${typeLabel} activity dropped`,
        description: `${typeLabel} signals averaged ${currentAvg.toFixed(1)}/day over the last ${currentWindowDays} days vs ${baselineAvg.toFixed(1)}/day baseline (${Math.abs(zScore).toFixed(1)}σ below normal).`,
        signalType,
        currentValue: currentAvg,
        baselineAvg,
        zScore,
        detectedAt: nowIso,
      });
    } else {
      // Activity spike
      anomalies.push({
        id: makeId('activity_spike', signalType),
        kind: 'activity_spike',
        severity,
        title: `${typeLabel} activity spiked`,
        description: `${typeLabel} signals averaged ${currentAvg.toFixed(1)}/day over the last ${currentWindowDays} days vs ${baselineAvg.toFixed(1)}/day baseline (${zScore.toFixed(1)}σ above normal).`,
        signalType,
        currentValue: currentAvg,
        baselineAvg,
        zScore,
        detectedAt: nowIso,
      });
    }
  }

  // Check for implementation failure spikes
  const implSignals = behavioralSignalRepository.getByProject(projectId, {
    signalType: 'implementation',
    since: new Date(Date.now() - baselineDays * 24 * 60 * 60 * 1000).toISOString(),
    limit: 10000,
  });

  if (implSignals.length >= 5) {
    const recentWindow = new Date(Date.now() - currentWindowDays * 24 * 60 * 60 * 1000).toISOString();
    const recentImpls = implSignals.filter((s) => s.timestamp >= recentWindow);
    const olderImpls = implSignals.filter((s) => s.timestamp < recentWindow);

    const recentFailures = recentImpls.filter((s) => {
      try { return JSON.parse(s.data)?.success === false; } catch { return false; }
    });
    const olderFailures = olderImpls.filter((s) => {
      try { return JSON.parse(s.data)?.success === false; } catch { return false; }
    });

    const recentFailRate = recentImpls.length > 0 ? recentFailures.length / recentImpls.length : 0;
    const olderFailRate = olderImpls.length > 0 ? olderFailures.length / olderImpls.length : 0;

    if (recentFailRate > olderFailRate + 0.2 && recentFailures.length >= 2) {
      anomalies.push({
        id: makeId('failure_spike', 'implementation'),
        kind: 'failure_spike',
        severity: recentFailRate > 0.5 ? 'critical' : 'warning',
        title: 'Implementation failure rate increased',
        description: `${(recentFailRate * 100).toFixed(0)}% of recent implementations failed vs ${(olderFailRate * 100).toFixed(0)}% baseline.`,
        signalType: 'implementation',
        currentValue: recentFailRate,
        baselineAvg: olderFailRate,
        zScore: 0, // Not z-score based
        detectedAt: nowIso,
      });
    }
  }

  // Check for neglected contexts (previously active, now silent)
  const contextActivity = behavioralSignalRepository.getContextActivity(projectId, baselineDays);
  const recentContextActivity = behavioralSignalRepository.getContextActivity(projectId, currentWindowDays);
  const recentContextIds = new Set(recentContextActivity.map((c) => c.context_id));

  for (const ctx of contextActivity) {
    if (ctx.signal_count >= 5 && !recentContextIds.has(ctx.context_id)) {
      anomalies.push({
        id: makeId('context_neglected', 'context_focus', ctx.context_id),
        kind: 'context_neglected',
        severity: ctx.signal_count >= 15 ? 'warning' : 'info',
        title: `Context "${ctx.context_name}" went silent`,
        description: `${ctx.context_name} had ${ctx.signal_count} signals over ${baselineDays} days but zero activity in the last ${currentWindowDays} days.`,
        signalType: 'context_focus',
        currentValue: 0,
        baselineAvg: ctx.signal_count / baselineDays,
        zScore: -2,
        detectedAt: nowIso,
        contextId: ctx.context_id,
        contextName: ctx.context_name,
      });
    }
  }

  // Filter out info-level to keep only actionable alerts
  const actionable = anomalies.filter((a) => a.severity !== 'info');

  // Sort: critical first, then warning
  actionable.sort((a, b) => {
    const order: Record<AnomalySeverity, number> = { critical: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });

  return {
    projectId,
    anomalies: actionable,
    baselineDays,
    currentWindowDays,
    generatedAt: nowIso,
  };
}
