/**
 * Project Health Score Repository
 * Handles all database operations for project health scores
 */

import { getDatabase } from '../connection';
import {
  DbProjectHealth,
  DbProjectHealthHistory,
  DbHealthScoreConfig,
  HealthScoreStats,
  CategoryScores,
  HealthHistoryPoint,
  HealthScoreStatus,
  DEFAULT_CATEGORY_WEIGHTS,
  DEFAULT_STATUS_THRESHOLDS,
} from '../models/project-health.types';
import { selectOne, selectAll, getCurrentTimestamp, generateId } from './repository.utils';

/**
 * Project Health Repository
 */
export const projectHealthRepository = {
  /**
   * Get the latest health score for a project
   */
  getLatestHealth: (projectId: string): DbProjectHealth | null => {
    const db = getDatabase();
    return selectOne<DbProjectHealth>(
      db,
      `SELECT * FROM project_health
       WHERE project_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      projectId
    );
  },

  /**
   * Get health score by ID
   */
  getHealthById: (id: string): DbProjectHealth | null => {
    const db = getDatabase();
    return selectOne<DbProjectHealth>(db, 'SELECT * FROM project_health WHERE id = ?', id);
  },

  /**
   * Get health history for a project
   */
  getHealthHistory: (projectId: string, limit: number = 30): DbProjectHealth[] => {
    const db = getDatabase();
    return selectAll<DbProjectHealth>(
      db,
      `SELECT * FROM project_health
       WHERE project_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      projectId,
      limit
    );
  },

  /**
   * Create a new health score record
   */
  createHealth: (health: {
    project_id: string;
    overall_score: number;
    status: HealthScoreStatus;
    category_scores: CategoryScores;
    trend?: number;
    trend_direction?: 'up' | 'down' | 'stable';
    ai_explanation?: string | null;
    ai_recommendation?: string | null;
  }): DbProjectHealth => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const id = generateId('ph');

    const stmt = db.prepare(`
      INSERT INTO project_health (
        id, project_id, overall_score, status, category_scores,
        trend, trend_direction, ai_explanation, ai_recommendation, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      health.project_id,
      health.overall_score,
      health.status,
      JSON.stringify(health.category_scores),
      health.trend || 0,
      health.trend_direction || 'stable',
      health.ai_explanation || null,
      health.ai_recommendation || null,
      now
    );

    return selectOne<DbProjectHealth>(db, 'SELECT * FROM project_health WHERE id = ?', id)!;
  },

  /**
   * Update health score with AI insights
   */
  updateHealthWithAI: (
    id: string,
    aiExplanation: string,
    aiRecommendation: string
  ): DbProjectHealth | null => {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE project_health
      SET ai_explanation = ?, ai_recommendation = ?
      WHERE id = ?
    `);

    stmt.run(aiExplanation, aiRecommendation, id);
    return selectOne<DbProjectHealth>(db, 'SELECT * FROM project_health WHERE id = ?', id);
  },

  /**
   * Delete health scores for a project
   */
  deleteHealthByProject: (projectId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM project_health WHERE project_id = ?');
    const result = stmt.run(projectId);
    return result.changes;
  },

  /**
   * Get health score configuration for a project
   */
  getConfig: (projectId: string): DbHealthScoreConfig | null => {
    const db = getDatabase();
    return selectOne<DbHealthScoreConfig>(
      db,
      'SELECT * FROM health_score_config WHERE project_id = ?',
      projectId
    );
  },

  /**
   * Create or update health score configuration
   */
  upsertConfig: (config: {
    project_id: string;
    enabled?: boolean;
    auto_calculate?: boolean;
    calculation_frequency?: 'on_change' | 'hourly' | 'daily';
    category_weights?: Record<string, number>;
    thresholds?: Record<string, number>;
  }): DbHealthScoreConfig => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const existing = projectHealthRepository.getConfig(config.project_id);

    if (existing) {
      // Update existing
      const stmt = db.prepare(`
        UPDATE health_score_config
        SET enabled = ?,
            auto_calculate = ?,
            calculation_frequency = ?,
            category_weights = ?,
            thresholds = ?,
            updated_at = ?
        WHERE project_id = ?
      `);

      stmt.run(
        config.enabled !== undefined ? (config.enabled ? 1 : 0) : existing.enabled,
        config.auto_calculate !== undefined ? (config.auto_calculate ? 1 : 0) : existing.auto_calculate,
        config.calculation_frequency || existing.calculation_frequency,
        config.category_weights ? JSON.stringify(config.category_weights) : existing.category_weights,
        config.thresholds ? JSON.stringify(config.thresholds) : existing.thresholds,
        now,
        config.project_id
      );

      return selectOne<DbHealthScoreConfig>(
        db,
        'SELECT * FROM health_score_config WHERE project_id = ?',
        config.project_id
      )!;
    } else {
      // Create new
      const id = generateId('hsc');
      const stmt = db.prepare(`
        INSERT INTO health_score_config (
          id, project_id, enabled, auto_calculate, calculation_frequency,
          category_weights, thresholds, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        config.project_id,
        config.enabled !== undefined ? (config.enabled ? 1 : 0) : 1,
        config.auto_calculate !== undefined ? (config.auto_calculate ? 1 : 0) : 1,
        config.calculation_frequency || 'on_change',
        config.category_weights ? JSON.stringify(config.category_weights) : JSON.stringify(DEFAULT_CATEGORY_WEIGHTS),
        config.thresholds ? JSON.stringify(config.thresholds) : JSON.stringify(DEFAULT_STATUS_THRESHOLDS),
        now,
        now
      );

      return selectOne<DbHealthScoreConfig>(db, 'SELECT * FROM health_score_config WHERE id = ?', id)!;
    }
  },

  /**
   * Get statistics summary for dashboard
   */
  getStats: (projectId: string): HealthScoreStats | null => {
    const history = projectHealthRepository.getHealthHistory(projectId, 30);

    if (history.length === 0) {
      return null;
    }

    const current = history[0];
    const previous = history.length > 1 ? history[1] : null;
    const categoryScores = JSON.parse(current.category_scores) as CategoryScores;

    // Find top issue (lowest scoring category)
    let topIssue: HealthScoreStats['topIssue'] = null;
    let lowestScore = 100;

    const categories = Object.entries(categoryScores) as [keyof CategoryScores, CategoryScores[keyof CategoryScores]][];
    for (const [category, data] of categories) {
      if (data.score < lowestScore) {
        lowestScore = data.score;
        topIssue = {
          category: category as any,
          score: data.score,
          recommendation: getRecommendation(category, data.score),
        };
      }
    }

    // Build history points
    const historyData: HealthHistoryPoint[] = history.slice(0, 14).reverse().map((h) => ({
      date: h.created_at,
      score: h.overall_score,
      status: h.status,
    }));

    return {
      currentScore: current.overall_score,
      previousScore: previous?.overall_score || null,
      trend: current.trend,
      trendDirection: current.trend_direction,
      status: current.status,
      categoryBreakdown: categoryScores,
      historyData,
      lastCalculated: current.created_at,
      topIssue,
    };
  },

  /**
   * Get all projects with health scores
   */
  getAllProjectsWithHealth: (): Array<{ project_id: string; overall_score: number; status: HealthScoreStatus }> => {
    const db = getDatabase();
    return selectAll<{ project_id: string; overall_score: number; status: HealthScoreStatus }>(
      db,
      `SELECT DISTINCT project_id, overall_score, status
       FROM project_health ph1
       WHERE created_at = (
         SELECT MAX(created_at)
         FROM project_health ph2
         WHERE ph2.project_id = ph1.project_id
       )
       ORDER BY overall_score ASC`
    );
  },

  /**
   * Count projects by health status
   */
  countByStatus: (): Record<HealthScoreStatus, number> => {
    const db = getDatabase();
    const results = selectAll<{ status: HealthScoreStatus; count: number }>(
      db,
      `SELECT status, COUNT(DISTINCT project_id) as count
       FROM project_health ph1
       WHERE created_at = (
         SELECT MAX(created_at)
         FROM project_health ph2
         WHERE ph2.project_id = ph1.project_id
       )
       GROUP BY status`
    );

    const counts: Record<HealthScoreStatus, number> = {
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0,
      critical: 0,
    };

    for (const row of results) {
      counts[row.status] = row.count;
    }

    return counts;
  },
};

/**
 * Get recommendation based on category and score
 */
function getRecommendation(category: string, score: number): string {
  const recommendations: Record<string, string> = {
    idea_backlog: score < 50
      ? 'Review and prioritize your idea backlog. Consider implementing high-impact ideas.'
      : 'Keep managing your idea backlog regularly.',
    tech_debt: score < 50
      ? 'Focus on reducing technical debt. Prioritize critical debt items.'
      : 'Continue maintaining code quality and addressing tech debt proactively.',
    security: score < 50
      ? 'Urgent: Address security vulnerabilities immediately.'
      : 'Keep security scans up to date and patch vulnerabilities promptly.',
    test_coverage: score < 50
      ? 'Increase test coverage, especially for critical code paths.'
      : 'Maintain test coverage and add tests for new features.',
    goal_completion: score < 50
      ? 'Review project goals and create actionable plans to complete them.'
      : 'Good progress on goals. Keep the momentum.',
    code_quality: score < 50
      ? 'Improve code quality through refactoring and following best practices.'
      : 'Maintain code quality standards across the team.',
  };

  return recommendations[category] || 'Continue improving project health.';
}
