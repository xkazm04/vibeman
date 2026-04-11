/**
 * Project Health Computation Engine
 *
 * Aggregates four category sub-scores into an overall project health score,
 * stores snapshots in the existing project_health table, and computes trend
 * direction from historical data.
 *
 * Categories:
 *   - Code Quality: avg health_score from completed group_health_scans
 *   - Build Stability: scan_queue success rate (completed / total)
 *   - Pipeline Health: conductor_runs success rate
 *   - Task Velocity: completed scan_queue items per day (normalized 0-100)
 */

import { getDatabase } from '@/app/db/connection';

// ============================================================================
// Types
// ============================================================================

export type HealthStatus = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
export type TrendDirection = 'up' | 'down' | 'stable';

export interface CategoryScores {
  codeQuality: number;
  buildStability: number;
  pipelineHealth: number;
  taskVelocity: number;
}

export interface HealthSnapshot {
  id: string;
  projectId: string;
  overallScore: number;
  status: HealthStatus;
  categoryScores: CategoryScores;
  trend: number;
  trendDirection: TrendDirection;
  createdAt: string;
}

export interface HealthTrendPoint {
  date: string;
  overallScore: number;
  categoryScores: CategoryScores;
}

// ============================================================================
// Score Computation
// ============================================================================

function scoreToStatus(score: number): HealthStatus {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  if (score >= 20) return 'poor';
  return 'critical';
}

/**
 * Compute code quality score from group health scan averages.
 * Returns 50 (neutral) if no scans exist.
 */
function computeCodeQuality(db: ReturnType<typeof getDatabase>, projectId: string): number {
  const row = db.prepare(`
    SELECT AVG(health_score) as avg_score
    FROM group_health_scans
    WHERE project_id = ? AND status = 'completed' AND health_score IS NOT NULL
  `).get(projectId) as { avg_score: number | null } | undefined;

  return row?.avg_score != null ? Math.round(row.avg_score) : 50;
}

/**
 * Compute build stability from scan_queue success rate over the last 30 days.
 * Returns 50 (neutral) if no scan runs exist.
 */
function computeBuildStability(db: ReturnType<typeof getDatabase>, projectId: string): number {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const row = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
    FROM scan_queue
    WHERE project_id = ? AND created_at > ?
  `).get(projectId, cutoff) as { total: number; completed: number } | undefined;

  if (!row || row.total === 0) return 50;
  return Math.round((row.completed / row.total) * 100);
}

/**
 * Compute pipeline health from conductor_runs success rate over the last 30 days.
 * Returns 50 (neutral) if no conductor runs exist.
 */
function computePipelineHealth(db: ReturnType<typeof getDatabase>, projectId: string): number {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const row = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
    FROM conductor_runs
    WHERE project_id = ? AND created_at > ?
  `).get(projectId, cutoff) as { total: number; completed: number } | undefined;

  if (!row || row.total === 0) return 50;
  return Math.round((row.completed / row.total) * 100);
}

/**
 * Compute task velocity score normalized to 0-100.
 * Based on completed scan_queue items per day over the last 30 days.
 * 3+ items/day = 100, 0 items/day = 0, linear in between.
 */
function computeTaskVelocity(db: ReturnType<typeof getDatabase>, projectId: string): number {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const row = db.prepare(`
    SELECT COUNT(*) as completed
    FROM scan_queue
    WHERE project_id = ? AND status = 'completed' AND completed_at > ?
  `).get(projectId, cutoff) as { completed: number } | undefined;

  if (!row || row.completed === 0) return 0;

  const days = 30;
  const perDay = row.completed / days;
  // Normalize: 3+ per day = 100
  return Math.min(100, Math.round((perDay / 3) * 100));
}

/**
 * Compute all four category scores for a project.
 */
export function computeCategoryScores(projectId: string): CategoryScores {
  const db = getDatabase();
  return {
    codeQuality: computeCodeQuality(db, projectId),
    buildStability: computeBuildStability(db, projectId),
    pipelineHealth: computePipelineHealth(db, projectId),
    taskVelocity: computeTaskVelocity(db, projectId),
  };
}

/**
 * Compute overall score from category scores using equal weights.
 */
export function computeOverallScore(categories: CategoryScores): number {
  const weights = { codeQuality: 0.3, buildStability: 0.25, pipelineHealth: 0.25, taskVelocity: 0.2 };
  const score =
    categories.codeQuality * weights.codeQuality +
    categories.buildStability * weights.buildStability +
    categories.pipelineHealth * weights.pipelineHealth +
    categories.taskVelocity * weights.taskVelocity;
  return Math.round(score);
}

// ============================================================================
// Trend Computation
// ============================================================================

/**
 * Compute trend from the last N snapshots.
 * Returns the delta between the latest and the average of previous snapshots,
 * and a direction indicator.
 */
function computeTrend(db: ReturnType<typeof getDatabase>, projectId: string, currentScore: number): { trend: number; direction: TrendDirection } {
  const rows = db.prepare(`
    SELECT overall_score FROM project_health
    WHERE project_id = ?
    ORDER BY created_at DESC
    LIMIT 5
  `).all(projectId) as { overall_score: number }[];

  if (rows.length === 0) return { trend: 0, direction: 'stable' };

  const avg = rows.reduce((sum, r) => sum + r.overall_score, 0) / rows.length;
  const delta = currentScore - avg;

  const direction: TrendDirection = delta > 2 ? 'up' : delta < -2 ? 'down' : 'stable';
  return { trend: Math.round(delta * 10) / 10, direction };
}

// ============================================================================
// Snapshot Storage
// ============================================================================

/**
 * Calculate and store a new health snapshot for a project.
 * Returns the computed snapshot.
 */
export function calculateAndStore(projectId: string): HealthSnapshot {
  const db = getDatabase();
  const categories = computeCategoryScores(projectId);
  const overallScore = computeOverallScore(categories);
  const status = scoreToStatus(overallScore);
  const { trend, direction } = computeTrend(db, projectId, overallScore);
  const now = new Date().toISOString();
  const id = `ph-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  db.prepare(`
    INSERT INTO project_health (id, project_id, overall_score, status, category_scores, trend, trend_direction, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, projectId, overallScore, status, JSON.stringify(categories), trend, direction, now);

  return { id, projectId, overallScore, status, categoryScores: categories, trend, trendDirection: direction, createdAt: now };
}

/**
 * Get the latest health snapshot for a project.
 */
export function getLatestSnapshot(projectId: string): HealthSnapshot | null {
  const db = getDatabase();
  const row = db.prepare(`
    SELECT * FROM project_health
    WHERE project_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).get(projectId) as {
    id: string;
    project_id: string;
    overall_score: number;
    status: string;
    category_scores: string;
    trend: number;
    trend_direction: string;
    created_at: string;
  } | undefined;

  if (!row) return null;

  return {
    id: row.id,
    projectId: row.project_id,
    overallScore: row.overall_score,
    status: row.status as HealthStatus,
    categoryScores: JSON.parse(row.category_scores),
    trend: row.trend,
    trendDirection: row.trend_direction as TrendDirection,
    createdAt: row.created_at,
  };
}

/**
 * Get health trend data — daily snapshots over N days.
 */
export function getHealthTrend(projectId: string, days: number = 30): HealthTrendPoint[] {
  const db = getDatabase();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const rows = db.prepare(`
    SELECT created_at, overall_score, category_scores
    FROM project_health
    WHERE project_id = ? AND created_at > ?
    ORDER BY created_at ASC
  `).all(projectId, cutoff) as {
    created_at: string;
    overall_score: number;
    category_scores: string;
  }[];

  return rows.map((r) => ({
    date: r.created_at,
    overallScore: r.overall_score,
    categoryScores: JSON.parse(r.category_scores),
  }));
}
