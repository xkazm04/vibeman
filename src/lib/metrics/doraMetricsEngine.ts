/**
 * DORA Metrics Computation Engine
 *
 * Computes the four DORA metrics from existing vibeman data:
 *   - Deployment Frequency: completed scan_queue items per time window
 *   - Lead Time for Changes: p50/p90 of created_at → completed_at
 *   - Change Failure Rate: failed / total in time window
 *   - Mean Time to Recovery: avg gap between failure and next success
 *
 * Data sources: scan_queue (primary), conductor_runs (supplementary)
 *
 * Performance bands follow the 2024 DORA State of DevOps benchmarks:
 *   Elite / High / Medium / Low
 */

import { getDatabase } from '@/app/db/connection';

// ============================================================================
// Types
// ============================================================================

export type DORARating = 'elite' | 'high' | 'medium' | 'low';

export interface DORAMetric {
  value: number;
  unit: string;
  rating: DORARating;
  label: string;
}

export interface DORASnapshot {
  deploymentFrequency: DORAMetric;
  leadTime: DORAMetric;
  changeFailureRate: DORAMetric;
  meanTimeToRecovery: DORAMetric;
  period: { start: string; end: string; days: number };
}

export interface DORATrendPoint {
  date: string;
  deploymentFrequency: number;
  leadTimeP50: number;
  changeFailureRate: number;
  mttr: number;
}

// ============================================================================
// Rating Functions (DORA benchmarks)
// ============================================================================

function rateDeploymentFrequency(perDay: number): DORARating {
  if (perDay >= 1) return 'elite';      // multiple deploys per day
  if (perDay >= 0.14) return 'high';    // ~1 per week
  if (perDay >= 0.033) return 'medium'; // ~1 per month
  return 'low';
}

function rateLeadTime(hoursP50: number): DORARating {
  if (hoursP50 <= 1) return 'elite';     // < 1 hour
  if (hoursP50 <= 24) return 'high';     // < 1 day
  if (hoursP50 <= 168) return 'medium';  // < 1 week
  return 'low';
}

function rateChangeFailureRate(pct: number): DORARating {
  if (pct <= 5) return 'elite';
  if (pct <= 10) return 'high';
  if (pct <= 15) return 'medium';
  return 'low';
}

function rateMTTR(hours: number): DORARating {
  if (hours <= 1) return 'elite';
  if (hours <= 24) return 'high';
  if (hours <= 168) return 'medium';
  return 'low';
}

// ============================================================================
// Metric Computation
// ============================================================================

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

/**
 * Compute all four DORA metrics for a project over a time window.
 */
export function computeDORAMetrics(projectId: string, days: number = 30): DORASnapshot {
  const db = getDatabase();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  // ── Deployment Frequency ──
  const dfRow = db.prepare(`
    SELECT COUNT(*) as total
    FROM scan_queue
    WHERE project_id = ? AND status = 'completed' AND completed_at > ?
  `).get(projectId, cutoff) as { total: number };

  const deploymentsTotal = dfRow.total;
  const deploymentsPerDay = days > 0 ? deploymentsTotal / days : 0;

  // ── Lead Time for Changes (p50) ──
  const ltRows = db.prepare(`
    SELECT
      (julianday(completed_at) - julianday(created_at)) * 24 as lead_time_hours
    FROM scan_queue
    WHERE project_id = ? AND status = 'completed'
      AND completed_at > ? AND completed_at IS NOT NULL AND created_at IS NOT NULL
    ORDER BY lead_time_hours ASC
  `).all(projectId, cutoff) as { lead_time_hours: number }[];

  const leadTimes = ltRows.map(r => r.lead_time_hours).filter(h => h >= 0);
  const leadTimeP50 = percentile(leadTimes, 50);

  // ── Change Failure Rate ──
  const cfrRow = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
    FROM scan_queue
    WHERE project_id = ? AND created_at > ?
      AND status IN ('completed', 'failed')
  `).get(projectId, cutoff) as { total: number; failed: number };

  const changeFailureRate = cfrRow.total > 0 ? (cfrRow.failed / cfrRow.total) * 100 : 0;

  // ── Mean Time to Recovery ──
  // Find pairs: failure → next success, compute gap
  const recoveryRows = db.prepare(`
    SELECT status, completed_at
    FROM scan_queue
    WHERE project_id = ? AND completed_at > ?
      AND status IN ('completed', 'failed')
    ORDER BY completed_at ASC
  `).all(projectId, cutoff) as { status: string; completed_at: string }[];

  const recoveryTimes: number[] = [];
  let lastFailureTime: string | null = null;

  for (const row of recoveryRows) {
    if (row.status === 'failed') {
      lastFailureTime = row.completed_at;
    } else if (row.status === 'completed' && lastFailureTime) {
      const gapHours = (new Date(row.completed_at).getTime() - new Date(lastFailureTime).getTime()) / (1000 * 60 * 60);
      if (gapHours >= 0) recoveryTimes.push(gapHours);
      lastFailureTime = null;
    }
  }

  const mttr = recoveryTimes.length > 0
    ? recoveryTimes.reduce((a, b) => a + b, 0) / recoveryTimes.length
    : 0;

  return {
    deploymentFrequency: {
      value: Math.round(deploymentsPerDay * 100) / 100,
      unit: 'per day',
      rating: rateDeploymentFrequency(deploymentsPerDay),
      label: deploymentsPerDay >= 1 ? 'On-demand' : deploymentsPerDay >= 0.14 ? 'Weekly' : deploymentsPerDay >= 0.033 ? 'Monthly' : 'Infrequent',
    },
    leadTime: {
      value: Math.round(leadTimeP50 * 10) / 10,
      unit: 'hours (p50)',
      rating: rateLeadTime(leadTimeP50),
      label: leadTimeP50 <= 1 ? '< 1 hour' : leadTimeP50 <= 24 ? '< 1 day' : leadTimeP50 <= 168 ? '< 1 week' : '> 1 week',
    },
    changeFailureRate: {
      value: Math.round(changeFailureRate * 10) / 10,
      unit: '%',
      rating: rateChangeFailureRate(changeFailureRate),
      label: changeFailureRate <= 5 ? 'Very low' : changeFailureRate <= 10 ? 'Low' : changeFailureRate <= 15 ? 'Moderate' : 'High',
    },
    meanTimeToRecovery: {
      value: Math.round(mttr * 10) / 10,
      unit: 'hours',
      rating: rateMTTR(mttr),
      label: mttr <= 1 ? '< 1 hour' : mttr <= 24 ? '< 1 day' : mttr <= 168 ? '< 1 week' : '> 1 week',
    },
    period: { start: cutoff, end: now, days },
  };
}

/**
 * Get DORA trend data — weekly snapshots over N days.
 */
export function getDORATrend(projectId: string, days: number = 90): DORATrendPoint[] {
  const db = getDatabase();
  const points: DORATrendPoint[] = [];
  const windowDays = 7; // each point covers a 7-day window

  for (let i = days; i >= 0; i -= windowDays) {
    const windowEnd = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const windowStart = new Date(windowEnd.getTime() - windowDays * 24 * 60 * 60 * 1000);
    const startStr = windowStart.toISOString();
    const endStr = windowEnd.toISOString();

    // Deployment frequency for this window
    const dfRow = db.prepare(`
      SELECT COUNT(*) as total
      FROM scan_queue
      WHERE project_id = ? AND status = 'completed' AND completed_at BETWEEN ? AND ?
    `).get(projectId, startStr, endStr) as { total: number };

    // Lead time p50 for this window
    const ltRows = db.prepare(`
      SELECT (julianday(completed_at) - julianday(created_at)) * 24 as hours
      FROM scan_queue
      WHERE project_id = ? AND status = 'completed'
        AND completed_at BETWEEN ? AND ? AND completed_at IS NOT NULL AND created_at IS NOT NULL
      ORDER BY hours ASC
    `).all(projectId, startStr, endStr) as { hours: number }[];

    const lts = ltRows.map(r => r.hours).filter(h => h >= 0);

    // Change failure rate for this window
    const cfrRow = db.prepare(`
      SELECT COUNT(*) as total, SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM scan_queue
      WHERE project_id = ? AND status IN ('completed', 'failed') AND completed_at BETWEEN ? AND ?
    `).get(projectId, startStr, endStr) as { total: number; failed: number };

    points.push({
      date: endStr.split('T')[0],
      deploymentFrequency: dfRow.total / windowDays,
      leadTimeP50: percentile(lts, 50),
      changeFailureRate: cfrRow.total > 0 ? (cfrRow.failed / cfrRow.total) * 100 : 0,
      mttr: 0, // MTTR trend requires per-window recovery pair analysis — omit for trend simplicity
    });
  }

  return points;
}
