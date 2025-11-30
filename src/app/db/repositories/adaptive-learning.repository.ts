/**
 * Adaptive Learning Repository
 * Handles database operations for the self-optimizing development cycle
 */

import { getDatabase } from '../connection';
import type { DbIdeaExecutionOutcome, DbScoringWeight, DbScoringThreshold } from '../models/types';
import { generateId, getCurrentTimestamp, selectOne, selectAll } from './repository.utils';

/**
 * Idea Execution Outcome Repository
 */
export const ideaExecutionOutcomeRepository = {
  /**
   * Create a new execution outcome record
   */
  create: (outcome: {
    idea_id: string;
    project_id: string;
    predicted_effort: number | null;
    predicted_impact: number | null;
    actual_effort?: number | null;
    actual_impact?: number | null;
    execution_time_ms?: number | null;
    files_changed?: number | null;
    lines_added?: number | null;
    lines_removed?: number | null;
    success: boolean;
    error_type?: string | null;
    user_feedback_score?: number | null;
    category: string;
    scan_type: string;
  }): DbIdeaExecutionOutcome => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const id = generateId('outcome');

    const stmt = db.prepare(`
      INSERT INTO idea_execution_outcomes (
        id, idea_id, project_id, predicted_effort, predicted_impact,
        actual_effort, actual_impact, execution_time_ms, files_changed,
        lines_added, lines_removed, success, error_type, user_feedback_score,
        category, scan_type, executed_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      outcome.idea_id,
      outcome.project_id,
      outcome.predicted_effort,
      outcome.predicted_impact,
      outcome.actual_effort ?? null,
      outcome.actual_impact ?? null,
      outcome.execution_time_ms ?? null,
      outcome.files_changed ?? null,
      outcome.lines_added ?? null,
      outcome.lines_removed ?? null,
      outcome.success ? 1 : 0,
      outcome.error_type ?? null,
      outcome.user_feedback_score ?? null,
      outcome.category,
      outcome.scan_type,
      now,
      now
    );

    return selectOne<DbIdeaExecutionOutcome>(db, 'SELECT * FROM idea_execution_outcomes WHERE id = ?', id)!;
  },

  /**
   * Get outcomes by project
   */
  getByProject: (projectId: string, limit?: number): DbIdeaExecutionOutcome[] => {
    const db = getDatabase();
    const query = limit
      ? 'SELECT * FROM idea_execution_outcomes WHERE project_id = ? ORDER BY executed_at DESC LIMIT ?'
      : 'SELECT * FROM idea_execution_outcomes WHERE project_id = ? ORDER BY executed_at DESC';

    const stmt = db.prepare(query);
    return (limit ? stmt.all(projectId, limit) : stmt.all(projectId)) as DbIdeaExecutionOutcome[];
  },

  /**
   * Get outcomes by category for pattern analysis
   */
  getByCategory: (projectId: string, category: string): DbIdeaExecutionOutcome[] => {
    const db = getDatabase();
    return selectAll<DbIdeaExecutionOutcome>(
      db,
      'SELECT * FROM idea_execution_outcomes WHERE project_id = ? AND category = ? ORDER BY executed_at DESC',
      projectId,
      category
    );
  },

  /**
   * Get outcomes by scan type for pattern analysis
   */
  getByScanType: (projectId: string, scanType: string): DbIdeaExecutionOutcome[] => {
    const db = getDatabase();
    return selectAll<DbIdeaExecutionOutcome>(
      db,
      'SELECT * FROM idea_execution_outcomes WHERE project_id = ? AND scan_type = ? ORDER BY executed_at DESC',
      projectId,
      scanType
    );
  },

  /**
   * Get outcome by idea ID
   */
  getByIdeaId: (ideaId: string): DbIdeaExecutionOutcome | null => {
    const db = getDatabase();
    return selectOne<DbIdeaExecutionOutcome>(db, 'SELECT * FROM idea_execution_outcomes WHERE idea_id = ?', ideaId);
  },

  /**
   * Update outcome with actual metrics
   */
  updateActualMetrics: (id: string, metrics: {
    actual_effort?: number | null;
    actual_impact?: number | null;
    user_feedback_score?: number | null;
  }): DbIdeaExecutionOutcome | null => {
    const db = getDatabase();

    const updates: string[] = [];
    const values: (number | null)[] = [];

    if (metrics.actual_effort !== undefined) {
      updates.push('actual_effort = ?');
      values.push(metrics.actual_effort);
    }
    if (metrics.actual_impact !== undefined) {
      updates.push('actual_impact = ?');
      values.push(metrics.actual_impact);
    }
    if (metrics.user_feedback_score !== undefined) {
      updates.push('user_feedback_score = ?');
      values.push(metrics.user_feedback_score);
    }

    if (updates.length === 0) return null;

    values.push(id as unknown as number);
    const stmt = db.prepare(`UPDATE idea_execution_outcomes SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return selectOne<DbIdeaExecutionOutcome>(db, 'SELECT * FROM idea_execution_outcomes WHERE id = ?', id);
  },

  /**
   * Get success rate by category
   */
  getSuccessRateByCategory: (projectId: string): Array<{ category: string; success_rate: number; count: number }> => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT
        category,
        ROUND(AVG(success) * 100, 2) as success_rate,
        COUNT(*) as count
      FROM idea_execution_outcomes
      WHERE project_id = ?
      GROUP BY category
      ORDER BY count DESC
    `);
    return stmt.all(projectId) as Array<{ category: string; success_rate: number; count: number }>;
  },

  /**
   * Get prediction accuracy metrics
   */
  getPredictionAccuracy: (projectId: string): {
    effort_accuracy: number;
    impact_accuracy: number;
    sample_count: number;
  } | null => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT
        ROUND(AVG(CASE WHEN predicted_effort = actual_effort THEN 100 ELSE
          100 - (ABS(predicted_effort - actual_effort) * 33.33) END), 2) as effort_accuracy,
        ROUND(AVG(CASE WHEN predicted_impact = actual_impact THEN 100 ELSE
          100 - (ABS(predicted_impact - actual_impact) * 33.33) END), 2) as impact_accuracy,
        COUNT(*) as sample_count
      FROM idea_execution_outcomes
      WHERE project_id = ?
        AND actual_effort IS NOT NULL
        AND actual_impact IS NOT NULL
    `);
    const result = stmt.get(projectId) as { effort_accuracy: number; impact_accuracy: number; sample_count: number } | undefined;
    return result && result.sample_count > 0 ? result : null;
  },

  /**
   * Get average execution time by category
   */
  getAvgExecutionTimeByCategory: (projectId: string): Array<{ category: string; avg_time_ms: number; count: number }> => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT
        category,
        ROUND(AVG(execution_time_ms)) as avg_time_ms,
        COUNT(*) as count
      FROM idea_execution_outcomes
      WHERE project_id = ? AND execution_time_ms IS NOT NULL
      GROUP BY category
      ORDER BY avg_time_ms DESC
    `);
    return stmt.all(projectId) as Array<{ category: string; avg_time_ms: number; count: number }>;
  },
};

/**
 * Scoring Weight Repository
 */
export const scoringWeightRepository = {
  /**
   * Get or create default weights for a project
   */
  getOrCreateDefaults: (projectId: string): DbScoringWeight => {
    const db = getDatabase();
    let weight = selectOne<DbScoringWeight>(
      db,
      'SELECT * FROM scoring_weights WHERE project_id = ? AND category = ? AND scan_type = ?',
      projectId,
      'default',
      'default'
    );

    if (!weight) {
      const now = getCurrentTimestamp();
      const id = generateId('weight');

      const stmt = db.prepare(`
        INSERT INTO scoring_weights (
          id, project_id, category, scan_type,
          effort_accuracy_weight, impact_accuracy_weight,
          success_rate_weight, execution_time_factor,
          sample_count, last_calibrated_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id, projectId, 'default', 'default',
        1.0, 1.5, 2.0, 0.5,
        0, now, now, now
      );

      weight = selectOne<DbScoringWeight>(db, 'SELECT * FROM scoring_weights WHERE id = ?', id)!;
    }

    return weight;
  },

  /**
   * Get weights by category and scan type
   */
  getWeights: (projectId: string, category?: string, scanType?: string): DbScoringWeight | null => {
    const db = getDatabase();

    // Try to find specific weights first
    if (category && scanType) {
      const specific = selectOne<DbScoringWeight>(
        db,
        'SELECT * FROM scoring_weights WHERE project_id = ? AND category = ? AND scan_type = ?',
        projectId, category, scanType
      );
      if (specific) return specific;
    }

    // Try category-specific
    if (category) {
      const catSpecific = selectOne<DbScoringWeight>(
        db,
        'SELECT * FROM scoring_weights WHERE project_id = ? AND category = ? AND scan_type = ?',
        projectId, category, 'default'
      );
      if (catSpecific) return catSpecific;
    }

    // Fall back to default
    return selectOne<DbScoringWeight>(
      db,
      'SELECT * FROM scoring_weights WHERE project_id = ? AND category = ? AND scan_type = ?',
      projectId, 'default', 'default'
    );
  },

  /**
   * Update weights based on learning
   */
  updateWeights: (
    projectId: string,
    category: string,
    scanType: string,
    updates: {
      effort_accuracy_weight?: number;
      impact_accuracy_weight?: number;
      success_rate_weight?: number;
      execution_time_factor?: number;
      sample_count?: number;
    }
  ): DbScoringWeight => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    // Check if exists
    let existing = selectOne<DbScoringWeight>(
      db,
      'SELECT * FROM scoring_weights WHERE project_id = ? AND category = ? AND scan_type = ?',
      projectId, category, scanType
    );

    if (!existing) {
      // Create new record
      const defaults = scoringWeightRepository.getOrCreateDefaults(projectId);
      const id = generateId('weight');

      const stmt = db.prepare(`
        INSERT INTO scoring_weights (
          id, project_id, category, scan_type,
          effort_accuracy_weight, impact_accuracy_weight,
          success_rate_weight, execution_time_factor,
          sample_count, last_calibrated_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id, projectId, category, scanType,
        updates.effort_accuracy_weight ?? defaults.effort_accuracy_weight,
        updates.impact_accuracy_weight ?? defaults.impact_accuracy_weight,
        updates.success_rate_weight ?? defaults.success_rate_weight,
        updates.execution_time_factor ?? defaults.execution_time_factor,
        updates.sample_count ?? 0,
        now, now, now
      );

      existing = selectOne<DbScoringWeight>(db, 'SELECT * FROM scoring_weights WHERE id = ?', id)!;
    } else {
      // Update existing
      const updateFields: string[] = ['updated_at = ?', 'last_calibrated_at = ?'];
      const values: (string | number)[] = [now, now];

      if (updates.effort_accuracy_weight !== undefined) {
        updateFields.push('effort_accuracy_weight = ?');
        values.push(updates.effort_accuracy_weight);
      }
      if (updates.impact_accuracy_weight !== undefined) {
        updateFields.push('impact_accuracy_weight = ?');
        values.push(updates.impact_accuracy_weight);
      }
      if (updates.success_rate_weight !== undefined) {
        updateFields.push('success_rate_weight = ?');
        values.push(updates.success_rate_weight);
      }
      if (updates.execution_time_factor !== undefined) {
        updateFields.push('execution_time_factor = ?');
        values.push(updates.execution_time_factor);
      }
      if (updates.sample_count !== undefined) {
        updateFields.push('sample_count = ?');
        values.push(updates.sample_count);
      }

      values.push(existing.id);
      const stmt = db.prepare(`UPDATE scoring_weights SET ${updateFields.join(', ')} WHERE id = ?`);
      stmt.run(...values);

      existing = selectOne<DbScoringWeight>(db, 'SELECT * FROM scoring_weights WHERE id = ?', existing.id)!;
    }

    return existing;
  },

  /**
   * Get all weights for a project
   */
  getAllByProject: (projectId: string): DbScoringWeight[] => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM scoring_weights WHERE project_id = ? ORDER BY category, scan_type');
    return stmt.all(projectId) as DbScoringWeight[];
  },
};

/**
 * Scoring Threshold Repository
 */
export const scoringThresholdRepository = {
  /**
   * Get or create default thresholds for a project
   */
  getOrCreateDefaults: (projectId: string): DbScoringThreshold[] => {
    const db = getDatabase();
    const existing = selectAll<DbScoringThreshold>(
      db,
      'SELECT * FROM scoring_thresholds WHERE project_id = ?',
      projectId
    );

    if (existing.length === 0) {
      const now = getCurrentTimestamp();
      const thresholds = [
        { type: 'auto_accept', min_score: 80, max_score: null, min_confidence: 70, enabled: 0 },
        { type: 'auto_reject', min_score: null, max_score: 20, min_confidence: 70, enabled: 0 },
        { type: 'priority_boost', min_score: 70, max_score: null, min_confidence: 60, enabled: 1 },
      ];

      for (const t of thresholds) {
        const id = generateId('threshold');
        const stmt = db.prepare(`
          INSERT INTO scoring_thresholds (
            id, project_id, threshold_type, min_score, max_score,
            min_confidence, enabled, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(id, projectId, t.type, t.min_score, t.max_score, t.min_confidence, t.enabled, now, now);
      }

      return selectAll<DbScoringThreshold>(db, 'SELECT * FROM scoring_thresholds WHERE project_id = ?', projectId);
    }

    return existing;
  },

  /**
   * Get threshold by type
   */
  getByType: (projectId: string, type: 'auto_accept' | 'auto_reject' | 'priority_boost'): DbScoringThreshold | null => {
    const db = getDatabase();
    return selectOne<DbScoringThreshold>(
      db,
      'SELECT * FROM scoring_thresholds WHERE project_id = ? AND threshold_type = ?',
      projectId,
      type
    );
  },

  /**
   * Update threshold
   */
  update: (id: string, updates: {
    min_score?: number | null;
    max_score?: number | null;
    min_confidence?: number | null;
    enabled?: boolean;
  }): DbScoringThreshold | null => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const updateFields: string[] = ['updated_at = ?'];
    const values: (string | number | null)[] = [now];

    if (updates.min_score !== undefined) {
      updateFields.push('min_score = ?');
      values.push(updates.min_score);
    }
    if (updates.max_score !== undefined) {
      updateFields.push('max_score = ?');
      values.push(updates.max_score);
    }
    if (updates.min_confidence !== undefined) {
      updateFields.push('min_confidence = ?');
      values.push(updates.min_confidence);
    }
    if (updates.enabled !== undefined) {
      updateFields.push('enabled = ?');
      values.push(updates.enabled ? 1 : 0);
    }

    values.push(id);
    const stmt = db.prepare(`UPDATE scoring_thresholds SET ${updateFields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return selectOne<DbScoringThreshold>(db, 'SELECT * FROM scoring_thresholds WHERE id = ?', id);
  },

  /**
   * Get all thresholds for a project
   */
  getAllByProject: (projectId: string): DbScoringThreshold[] => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM scoring_thresholds WHERE project_id = ? ORDER BY threshold_type');
    return stmt.all(projectId) as DbScoringThreshold[];
  },
};
