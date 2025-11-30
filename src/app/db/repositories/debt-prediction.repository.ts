/**
 * Debt Prediction Repository
 * CRUD operations for debt prediction and prevention system
 */

import { getDatabase } from '../connection';
import { generateId, getCurrentTimestamp, selectAll, selectOne } from './repository.utils';
import type {
  DbDebtPattern,
  DbDebtPrediction,
  DbComplexityHistory,
  DbOpportunityCard,
  DbPreventionAction,
  DbCodeChangeEvent,
} from '../models/debt-prediction.types';

// ============================================================================
// DEBT PATTERNS
// ============================================================================

export const debtPatternRepository = {
  /**
   * Create a new debt pattern
   */
  create(data: Omit<DbDebtPattern, 'id' | 'created_at' | 'updated_at'>): DbDebtPattern {
    const db = getDatabase();
    const id = generateId('dpat');
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO debt_patterns (
        id, project_id, name, description, pattern_type, severity, category,
        detection_rules, file_patterns, code_signatures, occurrence_count,
        false_positive_rate, avg_time_to_debt, prevention_success_rate,
        source, learned_from_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.project_id,
      data.name,
      data.description,
      data.pattern_type,
      data.severity,
      data.category,
      data.detection_rules,
      data.file_patterns,
      data.code_signatures,
      data.occurrence_count || 0,
      data.false_positive_rate || 0,
      data.avg_time_to_debt || 30,
      data.prevention_success_rate || 0,
      data.source || 'learned',
      data.learned_from_count || 0,
      now,
      now
    );

    return this.getById(id)!;
  },

  /**
   * Get pattern by ID
   */
  getById(id: string): DbDebtPattern | null {
    const db = getDatabase();
    return selectOne<DbDebtPattern>(db, 'SELECT * FROM debt_patterns WHERE id = ?', id);
  },

  /**
   * Get all patterns for a project
   */
  getByProject(projectId: string): DbDebtPattern[] {
    const db = getDatabase();
    return selectAll<DbDebtPattern>(
      db,
      'SELECT * FROM debt_patterns WHERE project_id = ? ORDER BY severity DESC, occurrence_count DESC',
      projectId
    );
  },

  /**
   * Get patterns by type
   */
  getByType(projectId: string, patternType: DbDebtPattern['pattern_type']): DbDebtPattern[] {
    const db = getDatabase();
    return selectAll<DbDebtPattern>(
      db,
      'SELECT * FROM debt_patterns WHERE project_id = ? AND pattern_type = ? ORDER BY severity DESC',
      projectId,
      patternType
    );
  },

  /**
   * Get patterns by category
   */
  getByCategory(projectId: string, category: string): DbDebtPattern[] {
    const db = getDatabase();
    return selectAll<DbDebtPattern>(
      db,
      'SELECT * FROM debt_patterns WHERE project_id = ? AND category = ?',
      projectId,
      category
    );
  },

  /**
   * Update pattern
   */
  update(id: string, updates: Partial<DbDebtPattern>): DbDebtPattern | null {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const fields: string[] = [];
    const values: unknown[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'created_at' && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return this.getById(id);

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = db.prepare(`
      UPDATE debt_patterns SET ${fields.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);

    return this.getById(id);
  },

  /**
   * Increment occurrence count
   */
  incrementOccurrence(id: string): void {
    const db = getDatabase();
    db.prepare(`
      UPDATE debt_patterns
      SET occurrence_count = occurrence_count + 1, updated_at = ?
      WHERE id = ?
    `).run(getCurrentTimestamp(), id);
  },

  /**
   * Delete pattern
   */
  delete(id: string): boolean {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM debt_patterns WHERE id = ?').run(id);
    return result.changes > 0;
  },

  /**
   * Get high-occurrence patterns (for learning)
   */
  getHighOccurrence(projectId: string, minCount: number = 5): DbDebtPattern[] {
    const db = getDatabase();
    return selectAll<DbDebtPattern>(
      db,
      'SELECT * FROM debt_patterns WHERE project_id = ? AND occurrence_count >= ? ORDER BY occurrence_count DESC',
      projectId,
      minCount
    );
  },
};

// ============================================================================
// DEBT PREDICTIONS
// ============================================================================

export const debtPredictionRepository = {
  /**
   * Create a new prediction
   */
  create(data: Omit<DbDebtPrediction, 'id' | 'created_at' | 'updated_at'>): DbDebtPrediction {
    const db = getDatabase();
    const id = generateId('dpred');
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO debt_predictions (
        id, project_id, context_id, pattern_id, file_path, line_start, line_end,
        code_snippet, title, description, prediction_type, confidence_score,
        urgency_score, complexity_trend, complexity_delta, velocity,
        suggested_action, micro_refactoring, estimated_prevention_effort,
        estimated_cleanup_effort, status, dismissed_reason, addressed_at,
        first_detected_at, last_seen_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.project_id,
      data.context_id || null,
      data.pattern_id || null,
      data.file_path,
      data.line_start,
      data.line_end,
      data.code_snippet,
      data.title,
      data.description,
      data.prediction_type,
      data.confidence_score,
      data.urgency_score,
      data.complexity_trend || 'stable',
      data.complexity_delta || 0,
      data.velocity || 0,
      data.suggested_action,
      data.micro_refactoring || null,
      data.estimated_prevention_effort,
      data.estimated_cleanup_effort,
      data.status || 'active',
      data.dismissed_reason || null,
      data.addressed_at || null,
      data.first_detected_at || now,
      data.last_seen_at || now,
      now,
      now
    );

    return this.getById(id)!;
  },

  /**
   * Get prediction by ID
   */
  getById(id: string): DbDebtPrediction | null {
    const db = getDatabase();
    return selectOne<DbDebtPrediction>(db, 'SELECT * FROM debt_predictions WHERE id = ?', id);
  },

  /**
   * Get active predictions for a project
   */
  getActiveByProject(projectId: string): DbDebtPrediction[] {
    const db = getDatabase();
    return selectAll<DbDebtPrediction>(
      db,
      `SELECT * FROM debt_predictions
       WHERE project_id = ? AND status = 'active'
       ORDER BY urgency_score DESC, confidence_score DESC`,
      projectId
    );
  },

  /**
   * Get predictions by file
   */
  getByFile(projectId: string, filePath: string): DbDebtPrediction[] {
    const db = getDatabase();
    return selectAll<DbDebtPrediction>(
      db,
      `SELECT * FROM debt_predictions
       WHERE project_id = ? AND file_path = ? AND status = 'active'
       ORDER BY line_start`,
      projectId,
      filePath
    );
  },

  /**
   * Get predictions by type
   */
  getByType(projectId: string, predictionType: DbDebtPrediction['prediction_type']): DbDebtPrediction[] {
    const db = getDatabase();
    return selectAll<DbDebtPrediction>(
      db,
      `SELECT * FROM debt_predictions
       WHERE project_id = ? AND prediction_type = ? AND status = 'active'
       ORDER BY urgency_score DESC`,
      projectId,
      predictionType
    );
  },

  /**
   * Get urgent predictions (high urgency score)
   */
  getUrgent(projectId: string, minUrgency: number = 70): DbDebtPrediction[] {
    const db = getDatabase();
    return selectAll<DbDebtPrediction>(
      db,
      `SELECT * FROM debt_predictions
       WHERE project_id = ? AND status = 'active' AND urgency_score >= ?
       ORDER BY urgency_score DESC`,
      projectId,
      minUrgency
    );
  },

  /**
   * Update prediction
   */
  update(id: string, updates: Partial<DbDebtPrediction>): DbDebtPrediction | null {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const fields: string[] = [];
    const values: unknown[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'created_at' && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return this.getById(id);

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = db.prepare(`
      UPDATE debt_predictions SET ${fields.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);

    return this.getById(id);
  },

  /**
   * Mark prediction as addressed
   */
  markAddressed(id: string): DbDebtPrediction | null {
    return this.update(id, {
      status: 'addressed',
      addressed_at: getCurrentTimestamp(),
    });
  },

  /**
   * Dismiss prediction
   */
  dismiss(id: string, reason: string): DbDebtPrediction | null {
    return this.update(id, {
      status: 'dismissed',
      dismissed_reason: reason,
    });
  },

  /**
   * Escalate prediction
   */
  escalate(id: string): DbDebtPrediction | null {
    return this.update(id, { status: 'escalated' });
  },

  /**
   * Update last seen timestamp
   */
  updateLastSeen(id: string): void {
    const db = getDatabase();
    db.prepare(`
      UPDATE debt_predictions SET last_seen_at = ?, updated_at = ? WHERE id = ?
    `).run(getCurrentTimestamp(), getCurrentTimestamp(), id);
  },

  /**
   * Delete prediction
   */
  delete(id: string): boolean {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM debt_predictions WHERE id = ?').run(id);
    return result.changes > 0;
  },

  /**
   * Get predictions with accelerating trend
   */
  getAccelerating(projectId: string): DbDebtPrediction[] {
    const db = getDatabase();
    return selectAll<DbDebtPrediction>(
      db,
      `SELECT * FROM debt_predictions
       WHERE project_id = ? AND status = 'active'
         AND (prediction_type = 'accelerating' OR complexity_trend = 'increasing')
       ORDER BY velocity DESC`,
      projectId
    );
  },

  /**
   * Get count by status
   */
  getCountByStatus(projectId: string): Record<string, number> {
    const db = getDatabase();
    const results = selectAll<{ status: string; count: number }>(
      db,
      `SELECT status, COUNT(*) as count FROM debt_predictions
       WHERE project_id = ?
       GROUP BY status`,
      projectId
    );
    return results.reduce((acc, row) => {
      acc[row.status] = row.count;
      return acc;
    }, {} as Record<string, number>);
  },
};

// ============================================================================
// COMPLEXITY HISTORY
// ============================================================================

export const complexityHistoryRepository = {
  /**
   * Record complexity snapshot
   */
  record(data: Omit<DbComplexityHistory, 'id' | 'created_at'>): DbComplexityHistory {
    const db = getDatabase();
    const id = generateId('chist');
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO complexity_history (
        id, project_id, file_path, cyclomatic_complexity, lines_of_code,
        dependency_count, coupling_score, cohesion_score, commit_hash,
        change_type, measured_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.project_id,
      data.file_path,
      data.cyclomatic_complexity,
      data.lines_of_code,
      data.dependency_count,
      data.coupling_score,
      data.cohesion_score,
      data.commit_hash || null,
      data.change_type,
      data.measured_at || now,
      now
    );

    return this.getById(id)!;
  },

  /**
   * Get history by ID
   */
  getById(id: string): DbComplexityHistory | null {
    const db = getDatabase();
    return selectOne<DbComplexityHistory>(db, 'SELECT * FROM complexity_history WHERE id = ?', id);
  },

  /**
   * Get history for file
   */
  getByFile(projectId: string, filePath: string, limit: number = 50): DbComplexityHistory[] {
    const db = getDatabase();
    return selectAll<DbComplexityHistory>(
      db,
      `SELECT * FROM complexity_history
       WHERE project_id = ? AND file_path = ?
       ORDER BY measured_at DESC
       LIMIT ?`,
      projectId,
      filePath,
      limit
    );
  },

  /**
   * Get latest snapshot for file
   */
  getLatestForFile(projectId: string, filePath: string): DbComplexityHistory | null {
    const db = getDatabase();
    return selectOne<DbComplexityHistory>(
      db,
      `SELECT * FROM complexity_history
       WHERE project_id = ? AND file_path = ?
       ORDER BY measured_at DESC
       LIMIT 1`,
      projectId,
      filePath
    );
  },

  /**
   * Get complexity trend for file
   */
  getTrend(projectId: string, filePath: string, days: number = 30): {
    trend: 'stable' | 'increasing' | 'decreasing';
    delta: number;
  } {
    const db = getDatabase();
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const history = selectAll<DbComplexityHistory>(
      db,
      `SELECT * FROM complexity_history
       WHERE project_id = ? AND file_path = ? AND measured_at >= ?
       ORDER BY measured_at ASC`,
      projectId,
      filePath,
      cutoffDate
    );

    if (history.length < 2) {
      return { trend: 'stable', delta: 0 };
    }

    const first = history[0].cyclomatic_complexity;
    const last = history[history.length - 1].cyclomatic_complexity;
    const delta = last - first;

    let trend: 'stable' | 'increasing' | 'decreasing' = 'stable';
    if (delta > 2) trend = 'increasing';
    else if (delta < -2) trend = 'decreasing';

    return { trend, delta };
  },

  /**
   * Delete old history (cleanup)
   */
  deleteOlderThan(projectId: string, days: number = 90): number {
    const db = getDatabase();
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const result = db.prepare(`
      DELETE FROM complexity_history WHERE project_id = ? AND measured_at < ?
    `).run(projectId, cutoffDate);
    return result.changes;
  },
};

// ============================================================================
// OPPORTUNITY CARDS
// ============================================================================

export const opportunityCardRepository = {
  /**
   * Create opportunity card
   */
  create(data: Omit<DbOpportunityCard, 'id' | 'created_at' | 'updated_at'>): DbOpportunityCard {
    const db = getDatabase();
    const id = generateId('ocard');
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO opportunity_cards (
        id, project_id, prediction_id, card_type, priority, title, summary,
        action_type, action_description, estimated_time_minutes, affected_files,
        related_patterns, shown_count, clicked, acted_upon, feedback, expires_at,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.project_id,
      data.prediction_id,
      data.card_type,
      data.priority,
      data.title,
      data.summary,
      data.action_type,
      data.action_description,
      data.estimated_time_minutes || 5,
      data.affected_files || '[]',
      data.related_patterns || '[]',
      0,
      0,
      0,
      null,
      data.expires_at || null,
      now,
      now
    );

    return this.getById(id)!;
  },

  /**
   * Get card by ID
   */
  getById(id: string): DbOpportunityCard | null {
    const db = getDatabase();
    return selectOne<DbOpportunityCard>(db, 'SELECT * FROM opportunity_cards WHERE id = ?', id);
  },

  /**
   * Get active cards for project
   */
  getActiveByProject(projectId: string): DbOpportunityCard[] {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    return selectAll<DbOpportunityCard>(
      db,
      `SELECT * FROM opportunity_cards
       WHERE project_id = ?
         AND (expires_at IS NULL OR expires_at > ?)
         AND feedback IS NULL
       ORDER BY priority DESC`,
      projectId,
      now
    );
  },

  /**
   * Get cards by type
   */
  getByType(projectId: string, cardType: DbOpportunityCard['card_type']): DbOpportunityCard[] {
    const db = getDatabase();
    return selectAll<DbOpportunityCard>(
      db,
      `SELECT * FROM opportunity_cards
       WHERE project_id = ? AND card_type = ?
       ORDER BY priority DESC`,
      projectId,
      cardType
    );
  },

  /**
   * Get top priority cards (for dashboard)
   */
  getTopPriority(projectId: string, limit: number = 5): DbOpportunityCard[] {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    return selectAll<DbOpportunityCard>(
      db,
      `SELECT * FROM opportunity_cards
       WHERE project_id = ?
         AND (expires_at IS NULL OR expires_at > ?)
         AND feedback IS NULL
       ORDER BY priority DESC
       LIMIT ?`,
      projectId,
      now,
      limit
    );
  },

  /**
   * Record card shown
   */
  recordShown(id: string): void {
    const db = getDatabase();
    db.prepare(`
      UPDATE opportunity_cards
      SET shown_count = shown_count + 1, updated_at = ?
      WHERE id = ?
    `).run(getCurrentTimestamp(), id);
  },

  /**
   * Record card clicked
   */
  recordClicked(id: string): void {
    const db = getDatabase();
    db.prepare(`
      UPDATE opportunity_cards
      SET clicked = 1, updated_at = ?
      WHERE id = ?
    `).run(getCurrentTimestamp(), id);
  },

  /**
   * Record action taken
   */
  recordActedUpon(id: string, feedback: DbOpportunityCard['feedback']): void {
    const db = getDatabase();
    db.prepare(`
      UPDATE opportunity_cards
      SET acted_upon = 1, feedback = ?, updated_at = ?
      WHERE id = ?
    `).run(feedback, getCurrentTimestamp(), id);
  },

  /**
   * Dismiss card
   */
  dismiss(id: string): void {
    const db = getDatabase();
    db.prepare(`
      UPDATE opportunity_cards
      SET feedback = 'dismissed', updated_at = ?
      WHERE id = ?
    `).run(getCurrentTimestamp(), id);
  },

  /**
   * Delete card
   */
  delete(id: string): boolean {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM opportunity_cards WHERE id = ?').run(id);
    return result.changes > 0;
  },

  /**
   * Get feedback statistics
   */
  getFeedbackStats(projectId: string): { helpful: number; notHelpful: number; dismissed: number } {
    const db = getDatabase();
    const stats = selectAll<{ feedback: string; count: number }>(
      db,
      `SELECT feedback, COUNT(*) as count FROM opportunity_cards
       WHERE project_id = ? AND feedback IS NOT NULL
       GROUP BY feedback`,
      projectId
    );

    return {
      helpful: stats.find(s => s.feedback === 'helpful')?.count || 0,
      notHelpful: stats.find(s => s.feedback === 'not-helpful')?.count || 0,
      dismissed: stats.find(s => s.feedback === 'dismissed')?.count || 0,
    };
  },
};

// ============================================================================
// PREVENTION ACTIONS
// ============================================================================

export const preventionActionRepository = {
  /**
   * Record prevention action
   */
  create(data: Omit<DbPreventionAction, 'id' | 'created_at'>): DbPreventionAction {
    const db = getDatabase();
    const id = generateId('pact');
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO prevention_actions (
        id, project_id, prediction_id, opportunity_card_id, action_type,
        action_description, files_modified, lines_changed, time_spent_minutes,
        success, prevented_debt_score, user_satisfaction, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.project_id,
      data.prediction_id,
      data.opportunity_card_id || null,
      data.action_type,
      data.action_description,
      data.files_modified || 0,
      data.lines_changed || 0,
      data.time_spent_minutes || null,
      data.success ? 1 : 0,
      data.prevented_debt_score || null,
      data.user_satisfaction || null,
      now
    );

    return this.getById(id)!;
  },

  /**
   * Get action by ID
   */
  getById(id: string): DbPreventionAction | null {
    const db = getDatabase();
    return selectOne<DbPreventionAction>(db, 'SELECT * FROM prevention_actions WHERE id = ?', id);
  },

  /**
   * Get actions for project
   */
  getByProject(projectId: string, limit: number = 100): DbPreventionAction[] {
    const db = getDatabase();
    return selectAll<DbPreventionAction>(
      db,
      `SELECT * FROM prevention_actions
       WHERE project_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      projectId,
      limit
    );
  },

  /**
   * Get success rate
   */
  getSuccessRate(projectId: string): number {
    const db = getDatabase();
    const result = selectOne<{ total: number; successful: number }>(
      db,
      `SELECT COUNT(*) as total, SUM(success) as successful
       FROM prevention_actions WHERE project_id = ?`,
      projectId
    );

    if (!result || result.total === 0) return 0;
    return (result.successful / result.total) * 100;
  },

  /**
   * Get total debt prevented (sum of prevented_debt_score)
   */
  getTotalDebtPrevented(projectId: string): number {
    const db = getDatabase();
    const result = selectOne<{ total: number }>(
      db,
      `SELECT COALESCE(SUM(prevented_debt_score), 0) as total
       FROM prevention_actions WHERE project_id = ? AND success = 1`,
      projectId
    );
    return result?.total || 0;
  },
};

// ============================================================================
// CODE CHANGE EVENTS
// ============================================================================

export const codeChangeEventRepository = {
  /**
   * Record code change event
   */
  create(data: Omit<DbCodeChangeEvent, 'id' | 'created_at'>): DbCodeChangeEvent {
    const db = getDatabase();
    const id = generateId('cevt');
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO code_change_events (
        id, project_id, file_path, change_type, lines_added, lines_removed,
        complexity_before, complexity_after, patterns_triggered, predictions_created,
        commit_hash, author, detected_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.project_id,
      data.file_path,
      data.change_type,
      data.lines_added || 0,
      data.lines_removed || 0,
      data.complexity_before || null,
      data.complexity_after || null,
      data.patterns_triggered || '[]',
      data.predictions_created || '[]',
      data.commit_hash || null,
      data.author || null,
      data.detected_at || now,
      now
    );

    return this.getById(id)!;
  },

  /**
   * Get event by ID
   */
  getById(id: string): DbCodeChangeEvent | null {
    const db = getDatabase();
    return selectOne<DbCodeChangeEvent>(db, 'SELECT * FROM code_change_events WHERE id = ?', id);
  },

  /**
   * Get recent events for project
   */
  getRecent(projectId: string, limit: number = 100): DbCodeChangeEvent[] {
    const db = getDatabase();
    return selectAll<DbCodeChangeEvent>(
      db,
      `SELECT * FROM code_change_events
       WHERE project_id = ?
       ORDER BY detected_at DESC
       LIMIT ?`,
      projectId,
      limit
    );
  },

  /**
   * Get events for file
   */
  getByFile(projectId: string, filePath: string): DbCodeChangeEvent[] {
    const db = getDatabase();
    return selectAll<DbCodeChangeEvent>(
      db,
      `SELECT * FROM code_change_events
       WHERE project_id = ? AND file_path = ?
       ORDER BY detected_at DESC`,
      projectId,
      filePath
    );
  },

  /**
   * Get events that triggered patterns
   */
  getWithPatternsTriggers(projectId: string): DbCodeChangeEvent[] {
    const db = getDatabase();
    return selectAll<DbCodeChangeEvent>(
      db,
      `SELECT * FROM code_change_events
       WHERE project_id = ? AND patterns_triggered != '[]'
       ORDER BY detected_at DESC`,
      projectId
    );
  },

  /**
   * Delete old events (cleanup)
   */
  deleteOlderThan(projectId: string, days: number = 30): number {
    const db = getDatabase();
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const result = db.prepare(`
      DELETE FROM code_change_events WHERE project_id = ? AND detected_at < ?
    `).run(projectId, cutoffDate);
    return result.changes;
  },
};
