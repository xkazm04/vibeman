/**
 * Observatory Repository
 * Data access layer for Code Health Observatory tables
 */

import { getDatabase } from '../connection';
import { generateId, getCurrentTimestamp } from './repository.utils';
import {
  DbAnalysisSnapshot,
  DbPredictionOutcome,
  DbExecutionOutcome,
  DbLearnedPattern,
  DbHealthMetric,
  DbAutoFixItem,
  CreateAnalysisSnapshot,
  UpdateAnalysisSnapshot,
  CreatePredictionOutcome,
  CreateExecutionOutcome,
  UpdateExecutionOutcome,
  CreateLearnedPattern,
  UpdateLearnedPattern,
  CreateHealthMetric,
  CreateAutoFixItem,
  UpdateAutoFixItem,
} from '../models/observatory.types';

// ===== Analysis Snapshots =====

export function createAnalysisSnapshot(data: CreateAnalysisSnapshot): DbAnalysisSnapshot {
  const db = getDatabase();
  const id = generateId('snap');
  const now = getCurrentTimestamp();

  db.prepare(`
    INSERT INTO analysis_snapshots (
      id, project_id, snapshot_type, trigger_source, created_at
    ) VALUES (?, ?, ?, ?, ?)
  `).run(id, data.project_id, data.snapshot_type, data.trigger_source || null, now);

  return getAnalysisSnapshotById(id)!;
}

export function getAnalysisSnapshotById(id: string): DbAnalysisSnapshot | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM analysis_snapshots WHERE id = ?').get(id);
  return row as DbAnalysisSnapshot | null;
}

export function updateAnalysisSnapshot(id: string, data: UpdateAnalysisSnapshot): DbAnalysisSnapshot | null {
  const db = getDatabase();
  const updates: string[] = [];
  const values: unknown[] = [];

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      updates.push(`${key} = ?`);
      values.push(key === 'metadata' ? JSON.stringify(value) : value);
    }
  });

  if (updates.length === 0) return getAnalysisSnapshotById(id);

  values.push(id);
  db.prepare(`UPDATE analysis_snapshots SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  return getAnalysisSnapshotById(id);
}

export function getRecentSnapshots(projectId: string, limit = 50): DbAnalysisSnapshot[] {
  const db = getDatabase();
  const rows = db
    .prepare('SELECT * FROM analysis_snapshots WHERE project_id = ? ORDER BY created_at DESC LIMIT ?')
    .all(projectId, limit);
  return rows as DbAnalysisSnapshot[];
}

export function getSnapshotsByTimeRange(
  projectId: string,
  startDate: string,
  endDate: string
): DbAnalysisSnapshot[] {
  const db = getDatabase();
  const rows = db
    .prepare(
      `SELECT * FROM analysis_snapshots
       WHERE project_id = ? AND created_at >= ? AND created_at <= ?
       ORDER BY created_at ASC`
    )
    .all(projectId, startDate, endDate);
  return rows as DbAnalysisSnapshot[];
}

// ===== Prediction Outcomes =====

export function createPredictionOutcome(data: CreatePredictionOutcome): DbPredictionOutcome {
  const db = getDatabase();
  const id = generateId('pout');
  const now = getCurrentTimestamp();

  db.prepare(`
    INSERT INTO prediction_outcomes (
      id, project_id, prediction_id, snapshot_id,
      original_confidence, original_urgency, prediction_type, predicted_severity,
      outcome_type, pattern_id, contributing_signals, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.project_id,
    data.prediction_id,
    data.snapshot_id || null,
    data.original_confidence,
    data.original_urgency,
    data.prediction_type,
    data.predicted_severity,
    data.outcome_type,
    data.pattern_id || null,
    data.contributing_signals ? JSON.stringify(data.contributing_signals) : null,
    now
  );

  return getPredictionOutcomeById(id)!;
}

export function getPredictionOutcomeById(id: string): DbPredictionOutcome | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM prediction_outcomes WHERE id = ?').get(id);
  return row as DbPredictionOutcome | null;
}

export function getPredictionOutcomesByPrediction(predictionId: string): DbPredictionOutcome[] {
  const db = getDatabase();
  const rows = db
    .prepare('SELECT * FROM prediction_outcomes WHERE prediction_id = ? ORDER BY created_at DESC')
    .all(predictionId);
  return rows as DbPredictionOutcome[];
}

export function updatePredictionOutcome(
  id: string,
  data: Partial<DbPredictionOutcome>
): DbPredictionOutcome | null {
  const db = getDatabase();
  const updates: string[] = [];
  const values: unknown[] = [];

  const jsonFields = ['contributing_signals'];

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && key !== 'id') {
      updates.push(`${key} = ?`);
      values.push(jsonFields.includes(key) && Array.isArray(value) ? JSON.stringify(value) : value);
    }
  });

  if (updates.length === 0) return getPredictionOutcomeById(id);

  values.push(id);
  db.prepare(`UPDATE prediction_outcomes SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  return getPredictionOutcomeById(id);
}

export function getOutcomeStatsByPattern(projectId: string, patternId: string): {
  total: number;
  confirmed: number;
  false_positive: number;
  prevented: number;
  precision: number;
} {
  const db = getDatabase();
  const row = db
    .prepare(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN outcome_type = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN outcome_type = 'false_positive' THEN 1 ELSE 0 END) as false_positive,
        SUM(CASE WHEN outcome_type = 'prevented' THEN 1 ELSE 0 END) as prevented
       FROM prediction_outcomes
       WHERE project_id = ? AND pattern_id = ?`
    )
    .get(projectId, patternId) as { total: number; confirmed: number; false_positive: number; prevented: number };

  const precision =
    row.total > 0 ? (row.confirmed + row.prevented) / (row.confirmed + row.prevented + row.false_positive) : 0;

  return { ...row, precision };
}

// ===== Execution Outcomes =====

export function createExecutionOutcome(data: CreateExecutionOutcome): DbExecutionOutcome {
  const db = getDatabase();
  const id = generateId('eout');
  const now = getCurrentTimestamp();

  db.prepare(`
    INSERT INTO execution_outcomes (
      id, project_id, execution_id, prediction_id,
      execution_type, requirement_content, target_files, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.project_id,
    data.execution_id,
    data.prediction_id || null,
    data.execution_type,
    data.requirement_content || null,
    data.target_files ? JSON.stringify(data.target_files) : null,
    now
  );

  return getExecutionOutcomeById(id)!;
}

export function getExecutionOutcomeById(id: string): DbExecutionOutcome | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM execution_outcomes WHERE id = ?').get(id);
  return row as DbExecutionOutcome | null;
}

export function getExecutionOutcomeByExecutionId(executionId: string): DbExecutionOutcome | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM execution_outcomes WHERE execution_id = ?').get(executionId);
  return row as DbExecutionOutcome | null;
}

export function updateExecutionOutcome(id: string, data: UpdateExecutionOutcome): DbExecutionOutcome | null {
  const db = getDatabase();
  const updates: string[] = [];
  const values: unknown[] = [];

  const jsonFields = [
    'target_files',
    'files_changed',
    'pre_complexity_scores',
    'post_complexity_scores',
    'successful_patterns',
    'failed_patterns',
  ];
  const boolFields = ['success', 'regression_detected', 'user_accepted'];

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      updates.push(`${key} = ?`);
      if (jsonFields.includes(key)) {
        values.push(JSON.stringify(value));
      } else if (boolFields.includes(key)) {
        values.push(value ? 1 : 0);
      } else {
        values.push(value);
      }
    }
  });

  if (updates.length === 0) return getExecutionOutcomeById(id);

  values.push(id);
  db.prepare(`UPDATE execution_outcomes SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  return getExecutionOutcomeById(id);
}

export function getRecentExecutionOutcomes(projectId: string, limit = 50): DbExecutionOutcome[] {
  const db = getDatabase();
  const rows = db
    .prepare('SELECT * FROM execution_outcomes WHERE project_id = ? ORDER BY created_at DESC LIMIT ?')
    .all(projectId, limit);
  return rows as DbExecutionOutcome[];
}

export function getExecutionSuccessRate(projectId: string, days = 30): {
  total: number;
  successful: number;
  rate: number;
} {
  const db = getDatabase();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const row = db
    .prepare(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful
       FROM execution_outcomes
       WHERE project_id = ? AND created_at >= ? AND completed_at IS NOT NULL`
    )
    .get(projectId, cutoff) as { total: number; successful: number };

  return {
    ...row,
    rate: row.total > 0 ? row.successful / row.total : 0,
  };
}

// ===== Learned Patterns =====

export function createLearnedPattern(data: CreateLearnedPattern): DbLearnedPattern {
  const db = getDatabase();
  const id = generateId('lpat');
  const now = getCurrentTimestamp();

  db.prepare(`
    INSERT INTO learned_patterns (
      id, project_id, base_pattern_id, name, description,
      pattern_type, category, detection_rules, file_patterns, code_signatures,
      source, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.project_id || null,
    data.base_pattern_id || null,
    data.name,
    data.description || null,
    data.pattern_type,
    data.category,
    JSON.stringify(data.detection_rules),
    data.file_patterns ? JSON.stringify(data.file_patterns) : null,
    data.code_signatures ? JSON.stringify(data.code_signatures) : null,
    data.source,
    now,
    now
  );

  return getLearnedPatternById(id)!;
}

export function getLearnedPatternById(id: string): DbLearnedPattern | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM learned_patterns WHERE id = ?').get(id);
  return row as DbLearnedPattern | null;
}

export function getLearnedPatterns(projectId: string | null, options?: {
  status?: DbLearnedPattern['status'];
  hasAutoFix?: boolean;
  type?: DbLearnedPattern['pattern_type'];
}): DbLearnedPattern[] {
  const db = getDatabase();
  let sql = 'SELECT * FROM learned_patterns WHERE (project_id = ? OR project_id IS NULL)';
  const params: unknown[] = [projectId];

  if (options?.status) {
    sql += ' AND status = ?';
    params.push(options.status);
  }
  if (options?.hasAutoFix !== undefined) {
    sql += ' AND has_auto_fix = ?';
    params.push(options.hasAutoFix ? 1 : 0);
  }
  if (options?.type) {
    sql += ' AND pattern_type = ?';
    params.push(options.type);
  }

  sql += ' ORDER BY confidence_score DESC NULLS LAST, total_detections DESC';

  const rows = db.prepare(sql).all(...params);
  return rows as DbLearnedPattern[];
}

export function updateLearnedPattern(id: string, data: UpdateLearnedPattern): DbLearnedPattern | null {
  const db = getDatabase();
  const updates: string[] = ['updated_at = ?'];
  const values: unknown[] = [getCurrentTimestamp()];

  const jsonFields = ['detection_rules', 'file_patterns', 'code_signatures'];
  const boolFields = ['has_auto_fix', 'requires_review'];

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      updates.push(`${key} = ?`);
      if (jsonFields.includes(key)) {
        values.push(JSON.stringify(value));
      } else if (boolFields.includes(key)) {
        values.push(value ? 1 : 0);
      } else {
        values.push(value);
      }
    }
  });

  values.push(id);
  db.prepare(`UPDATE learned_patterns SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  return getLearnedPatternById(id);
}

export function incrementPatternMetric(
  id: string,
  metric: 'total_detections' | 'true_positives' | 'false_positives' | 'auto_fixes_attempted' | 'auto_fixes_successful' | 'user_overrides'
): void {
  const db = getDatabase();
  db.prepare(`UPDATE learned_patterns SET ${metric} = ${metric} + 1, updated_at = ? WHERE id = ?`).run(
    getCurrentTimestamp(),
    id
  );
}

export function recalculatePatternScores(id: string): void {
  const db = getDatabase();
  const pattern = getLearnedPatternById(id);
  if (!pattern) return;

  const precision =
    pattern.true_positives + pattern.false_positives > 0
      ? pattern.true_positives / (pattern.true_positives + pattern.false_positives)
      : null;

  const autoFixRate =
    pattern.auto_fixes_attempted > 0
      ? pattern.auto_fixes_successful / pattern.auto_fixes_attempted
      : null;

  const confidence = precision !== null ? precision * 0.7 + (autoFixRate || 0) * 0.3 : null;

  db.prepare(`
    UPDATE learned_patterns
    SET precision_score = ?, auto_fix_success_rate = ?, confidence_score = ?, updated_at = ?
    WHERE id = ?
  `).run(precision, autoFixRate, confidence, getCurrentTimestamp(), id);
}

// ===== Health Metrics =====

export function createHealthMetric(data: CreateHealthMetric): DbHealthMetric {
  const db = getDatabase();
  const id = generateId('hmet');
  const now = getCurrentTimestamp();

  // Calculate derived fields
  let delta: number | null = null;
  let trend: 'improving' | 'stable' | 'degrading' | null = null;
  let status: 'healthy' | 'warning' | 'critical' | null = null;

  if (data.previous_value !== undefined) {
    delta = data.metric_value - data.previous_value;
    if (Math.abs(delta) < 0.01) {
      trend = 'stable';
    } else if (['overall_health', 'test_coverage'].includes(data.metric_type)) {
      trend = delta > 0 ? 'improving' : 'degrading';
    } else {
      trend = delta < 0 ? 'improving' : 'degrading';
    }
  }

  if (data.threshold_critical !== undefined && data.metric_value >= data.threshold_critical) {
    status = 'critical';
  } else if (data.threshold_warning !== undefined && data.metric_value >= data.threshold_warning) {
    status = 'warning';
  } else if (data.threshold_warning !== undefined) {
    status = 'healthy';
  }

  db.prepare(`
    INSERT INTO health_metrics_history (
      id, project_id, snapshot_id, metric_type, metric_value,
      scope, scope_id, previous_value, delta, trend,
      threshold_warning, threshold_critical, status, measured_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.project_id,
    data.snapshot_id || null,
    data.metric_type,
    data.metric_value,
    data.scope || 'project',
    data.scope_id || null,
    data.previous_value ?? null,
    delta,
    trend,
    data.threshold_warning ?? null,
    data.threshold_critical ?? null,
    status,
    now,
    now
  );

  return getHealthMetricById(id)!;
}

export function getHealthMetricById(id: string): DbHealthMetric | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM health_metrics_history WHERE id = ?').get(id);
  return row as DbHealthMetric | null;
}

export function getHealthMetricHistory(
  projectId: string,
  metricType: DbHealthMetric['metric_type'],
  days = 30
): DbHealthMetric[] {
  const db = getDatabase();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const rows = db
    .prepare(
      `SELECT * FROM health_metrics_history
       WHERE project_id = ? AND metric_type = ? AND scope = 'project' AND measured_at >= ?
       ORDER BY measured_at ASC`
    )
    .all(projectId, metricType, cutoff);

  return rows as DbHealthMetric[];
}

export function getLatestHealthMetrics(projectId: string): DbHealthMetric[] {
  const db = getDatabase();
  const rows = db
    .prepare(
      `SELECT * FROM health_metrics_history h1
       WHERE project_id = ? AND scope = 'project'
       AND measured_at = (
         SELECT MAX(measured_at) FROM health_metrics_history h2
         WHERE h2.project_id = h1.project_id AND h2.metric_type = h1.metric_type
       )`
    )
    .all(projectId);

  return rows as DbHealthMetric[];
}

// ===== Auto-fix Queue =====

export function createAutoFixItem(data: CreateAutoFixItem): DbAutoFixItem {
  const db = getDatabase();
  const id = generateId('afix');
  const now = getCurrentTimestamp();

  db.prepare(`
    INSERT INTO auto_fix_queue (
      id, project_id, prediction_id, pattern_id,
      title, description, target_files, generated_requirement,
      priority, urgency_score, confidence_score, estimated_impact,
      risk_level, expires_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.project_id,
    data.prediction_id,
    data.pattern_id,
    data.title,
    data.description || null,
    JSON.stringify(data.target_files),
    data.generated_requirement,
    data.priority ?? 5,
    data.urgency_score ?? null,
    data.confidence_score ?? null,
    data.estimated_impact ?? null,
    data.risk_level,
    data.expires_at || null,
    now,
    now
  );

  return getAutoFixItemById(id)!;
}

export function getAutoFixItemById(id: string): DbAutoFixItem | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM auto_fix_queue WHERE id = ?').get(id);
  return row as DbAutoFixItem | null;
}

export function getPendingAutoFixes(projectId: string): DbAutoFixItem[] {
  const db = getDatabase();
  const now = getCurrentTimestamp();

  const rows = db
    .prepare(
      `SELECT * FROM auto_fix_queue
       WHERE project_id = ? AND status = 'pending'
       AND (expires_at IS NULL OR expires_at > ?)
       ORDER BY priority DESC, urgency_score DESC`
    )
    .all(projectId, now);

  return rows as DbAutoFixItem[];
}

export function updateAutoFixItem(id: string, data: UpdateAutoFixItem): DbAutoFixItem | null {
  const db = getDatabase();
  const updates: string[] = ['updated_at = ?'];
  const values: unknown[] = [getCurrentTimestamp()];

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      updates.push(`${key} = ?`);
      values.push(value);
    }
  });

  values.push(id);
  db.prepare(`UPDATE auto_fix_queue SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  return getAutoFixItemById(id);
}

export function approveAutoFix(id: string, approvedBy: string): DbAutoFixItem | null {
  return updateAutoFixItem(id, {
    status: 'approved',
    approved_by: approvedBy,
    approved_at: getCurrentTimestamp(),
  });
}

export function expireOldAutoFixes(projectId: string): number {
  const db = getDatabase();
  const now = getCurrentTimestamp();

  const result = db
    .prepare(
      `UPDATE auto_fix_queue
       SET status = 'expired', updated_at = ?
       WHERE project_id = ? AND status = 'pending' AND expires_at IS NOT NULL AND expires_at <= ?`
    )
    .run(now, projectId, now);

  return result.changes;
}

// ===== Aggregate Queries =====

export function getProjectHealthSummary(projectId: string): {
  latestSnapshot: DbAnalysisSnapshot | null;
  healthScore: number | null;
  trend: 'improving' | 'stable' | 'degrading' | null;
  pendingFixes: number;
  recentSuccessRate: number;
} {
  const db = getDatabase();

  const latestSnapshot = db
    .prepare('SELECT * FROM analysis_snapshots WHERE project_id = ? ORDER BY created_at DESC LIMIT 1')
    .get(projectId) as DbAnalysisSnapshot | null;

  const healthMetric = db
    .prepare(
      `SELECT * FROM health_metrics_history
       WHERE project_id = ? AND metric_type = 'overall_health' AND scope = 'project'
       ORDER BY measured_at DESC LIMIT 1`
    )
    .get(projectId) as DbHealthMetric | null;

  const pendingFixes = db
    .prepare(`SELECT COUNT(*) as count FROM auto_fix_queue WHERE project_id = ? AND status = 'pending'`)
    .get(projectId) as { count: number };

  const successRate = getExecutionSuccessRate(projectId, 30);

  return {
    latestSnapshot,
    healthScore: healthMetric?.metric_value ?? null,
    trend: healthMetric?.trend ?? null,
    pendingFixes: pendingFixes.count,
    recentSuccessRate: successRate.rate,
  };
}

export function getLearningProgress(projectId: string): {
  totalPatterns: number;
  activePatterns: number;
  patternsWithAutoFix: number;
  avgPrecision: number;
  avgAutoFixSuccess: number;
} {
  const db = getDatabase();

  const stats = db
    .prepare(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN has_auto_fix = 1 THEN 1 ELSE 0 END) as with_autofix,
        AVG(precision_score) as avg_precision,
        AVG(CASE WHEN has_auto_fix = 1 THEN auto_fix_success_rate ELSE NULL END) as avg_autofix_rate
       FROM learned_patterns
       WHERE project_id = ? OR project_id IS NULL`
    )
    .get(projectId) as {
    total: number;
    active: number;
    with_autofix: number;
    avg_precision: number | null;
    avg_autofix_rate: number | null;
  };

  return {
    totalPatterns: stats.total,
    activePatterns: stats.active,
    patternsWithAutoFix: stats.with_autofix,
    avgPrecision: stats.avg_precision ?? 0,
    avgAutoFixSuccess: stats.avg_autofix_rate ?? 0,
  };
}
