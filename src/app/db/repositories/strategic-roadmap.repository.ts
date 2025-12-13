/**
 * Strategic Roadmap Repository
 * CRUD operations for the 6-month development roadmap engine
 */

import { getDatabase } from '../connection';
import { generateId, getCurrentTimestamp, selectAll, selectOne } from './repository.utils';
import type {
  DbStrategicInitiative,
  DbRoadmapMilestone,
  DbImpactPrediction,
  DbFeatureInteraction,
  DbDebtPreventionRule,
  DbVelocityTracking,
  DbRoadmapSimulation,
  RoadmapSummary,
} from '../models/strategic-roadmap.types';

// ============================================================================
// STRATEGIC INITIATIVES
// ============================================================================

export const strategicInitiativeRepository = {
  /**
   * Create a new strategic initiative
   */
  create(data: Omit<DbStrategicInitiative, 'id' | 'created_at' | 'updated_at'>): DbStrategicInitiative {
    const db = getDatabase();
    const id = generateId('sinit');
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO strategic_initiatives (
        id, project_id, title, description, initiative_type, priority,
        business_impact_score, technical_impact_score, risk_reduction_score,
        velocity_impact_score, estimated_effort_hours, estimated_complexity,
        target_quarter, target_month, depends_on, blocks, status, confidence_score,
        simulated_outcomes, related_tech_debt_ids, related_goal_ids, related_idea_ids,
        created_at, updated_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.project_id,
      data.title,
      data.description,
      data.initiative_type,
      data.priority || 5,
      data.business_impact_score || 50,
      data.technical_impact_score || 50,
      data.risk_reduction_score || 0,
      data.velocity_impact_score || 0,
      data.estimated_effort_hours || 0,
      data.estimated_complexity || 'medium',
      data.target_quarter,
      data.target_month || 1,
      data.depends_on || '[]',
      data.blocks || '[]',
      data.status || 'proposed',
      data.confidence_score || 50,
      data.simulated_outcomes || '{}',
      data.related_tech_debt_ids || '[]',
      data.related_goal_ids || '[]',
      data.related_idea_ids || '[]',
      now,
      now,
      data.completed_at || null
    );

    return this.getById(id)!;
  },

  /**
   * Get initiative by ID
   */
  getById(id: string): DbStrategicInitiative | null {
    const db = getDatabase();
    return selectOne<DbStrategicInitiative>(db, 'SELECT * FROM strategic_initiatives WHERE id = ?', id);
  },

  /**
   * Get all initiatives for a project
   */
  getByProject(projectId: string): DbStrategicInitiative[] {
    const db = getDatabase();
    return selectAll<DbStrategicInitiative>(
      db,
      'SELECT * FROM strategic_initiatives WHERE project_id = ? ORDER BY priority DESC, target_month ASC',
      projectId
    );
  },

  /**
   * Get initiatives by status
   */
  getByStatus(projectId: string, status: DbStrategicInitiative['status']): DbStrategicInitiative[] {
    const db = getDatabase();
    return selectAll<DbStrategicInitiative>(
      db,
      'SELECT * FROM strategic_initiatives WHERE project_id = ? AND status = ? ORDER BY priority DESC',
      projectId,
      status
    );
  },

  /**
   * Get initiatives by type
   */
  getByType(projectId: string, type: DbStrategicInitiative['initiative_type']): DbStrategicInitiative[] {
    const db = getDatabase();
    return selectAll<DbStrategicInitiative>(
      db,
      'SELECT * FROM strategic_initiatives WHERE project_id = ? AND initiative_type = ? ORDER BY priority DESC',
      projectId,
      type
    );
  },

  /**
   * Get initiatives for a specific month
   */
  getByMonth(projectId: string, monthIndex: number): DbStrategicInitiative[] {
    const db = getDatabase();
    return selectAll<DbStrategicInitiative>(
      db,
      'SELECT * FROM strategic_initiatives WHERE project_id = ? AND target_month = ? ORDER BY priority DESC',
      projectId,
      monthIndex
    );
  },

  /**
   * Get top priority initiatives
   */
  getTopPriority(projectId: string, limit: number = 10): DbStrategicInitiative[] {
    const db = getDatabase();
    return selectAll<DbStrategicInitiative>(
      db,
      `SELECT * FROM strategic_initiatives
       WHERE project_id = ? AND status NOT IN ('completed', 'cancelled')
       ORDER BY priority DESC, business_impact_score DESC
       LIMIT ?`,
      projectId,
      limit
    );
  },

  /**
   * Update initiative
   */
  update(id: string, updates: Partial<DbStrategicInitiative>): DbStrategicInitiative | null {
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
      UPDATE strategic_initiatives SET ${fields.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);

    return this.getById(id);
  },

  /**
   * Delete initiative
   */
  delete(id: string): boolean {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM strategic_initiatives WHERE id = ?').run(id);
    return result.changes > 0;
  },

  /**
   * Get count by status
   */
  getCountByStatus(projectId: string): Record<string, number> {
    const db = getDatabase();
    const results = selectAll<{ status: string; count: number }>(
      db,
      `SELECT status, COUNT(*) as count FROM strategic_initiatives
       WHERE project_id = ?
       GROUP BY status`,
      projectId
    );
    return results.reduce((acc, row) => {
      acc[row.status] = row.count;
      return acc;
    }, {} as Record<string, number>);
  },

  /**
   * Get count by type
   */
  getCountByType(projectId: string): Record<string, number> {
    const db = getDatabase();
    const results = selectAll<{ initiative_type: string; count: number }>(
      db,
      `SELECT initiative_type, COUNT(*) as count FROM strategic_initiatives
       WHERE project_id = ?
       GROUP BY initiative_type`,
      projectId
    );
    return results.reduce((acc, row) => {
      acc[row.initiative_type] = row.count;
      return acc;
    }, {} as Record<string, number>);
  },
};

// ============================================================================
// ROADMAP MILESTONES
// ============================================================================

export const roadmapMilestoneRepository = {
  /**
   * Create a new milestone
   */
  create(data: Omit<DbRoadmapMilestone, 'id' | 'created_at' | 'updated_at'>): DbRoadmapMilestone {
    const db = getDatabase();
    const id = generateId('rmile');
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO roadmap_milestones (
        id, project_id, initiative_id, title, description, target_date,
        quarter_index, month_index, target_health_score, target_debt_reduction,
        target_velocity_improvement, actual_health_score, actual_debt_reduction,
        actual_velocity_change, status, key_results, created_at, updated_at, achieved_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.project_id,
      data.initiative_id || null,
      data.title,
      data.description,
      data.target_date,
      data.quarter_index,
      data.month_index,
      data.target_health_score || 70,
      data.target_debt_reduction || 0,
      data.target_velocity_improvement || 0,
      data.actual_health_score || null,
      data.actual_debt_reduction || null,
      data.actual_velocity_change || null,
      data.status || 'upcoming',
      data.key_results || '[]',
      now,
      now,
      data.achieved_at || null
    );

    return this.getById(id)!;
  },

  /**
   * Get milestone by ID
   */
  getById(id: string): DbRoadmapMilestone | null {
    const db = getDatabase();
    return selectOne<DbRoadmapMilestone>(db, 'SELECT * FROM roadmap_milestones WHERE id = ?', id);
  },

  /**
   * Get all milestones for a project
   */
  getByProject(projectId: string): DbRoadmapMilestone[] {
    const db = getDatabase();
    return selectAll<DbRoadmapMilestone>(
      db,
      'SELECT * FROM roadmap_milestones WHERE project_id = ? ORDER BY month_index ASC',
      projectId
    );
  },

  /**
   * Get milestones by initiative
   */
  getByInitiative(initiativeId: string): DbRoadmapMilestone[] {
    const db = getDatabase();
    return selectAll<DbRoadmapMilestone>(
      db,
      'SELECT * FROM roadmap_milestones WHERE initiative_id = ? ORDER BY month_index ASC',
      initiativeId
    );
  },

  /**
   * Get milestones by status
   */
  getByStatus(projectId: string, status: DbRoadmapMilestone['status']): DbRoadmapMilestone[] {
    const db = getDatabase();
    return selectAll<DbRoadmapMilestone>(
      db,
      'SELECT * FROM roadmap_milestones WHERE project_id = ? AND status = ? ORDER BY month_index ASC',
      projectId,
      status
    );
  },

  /**
   * Update milestone
   */
  update(id: string, updates: Partial<DbRoadmapMilestone>): DbRoadmapMilestone | null {
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
      UPDATE roadmap_milestones SET ${fields.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);

    return this.getById(id);
  },

  /**
   * Delete milestone
   */
  delete(id: string): boolean {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM roadmap_milestones WHERE id = ?').run(id);
    return result.changes > 0;
  },
};

// ============================================================================
// IMPACT PREDICTIONS
// ============================================================================

export const impactPredictionRepository = {
  /**
   * Create a new impact prediction
   */
  create(data: Omit<DbImpactPrediction, 'id' | 'created_at' | 'updated_at'>): DbImpactPrediction {
    const db = getDatabase();
    const id = generateId('ipred');
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO impact_predictions (
        id, project_id, subject_type, subject_id, prediction_horizon, predicted_at,
        debt_impact, velocity_impact, risk_impact, complexity_impact, confidence_score,
        methodology, interactions, nash_equilibrium, pareto_optimal, simulation_runs,
        best_case_outcome, worst_case_outcome, most_likely_outcome, actual_outcome,
        prediction_accuracy, created_at, updated_at, validated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.project_id,
      data.subject_type,
      data.subject_id,
      data.prediction_horizon,
      data.predicted_at || now,
      data.debt_impact || 0,
      data.velocity_impact || 0,
      data.risk_impact || 0,
      data.complexity_impact || 0,
      data.confidence_score || 50,
      data.methodology || '',
      data.interactions || '[]',
      data.nash_equilibrium || null,
      data.pareto_optimal || 0,
      data.simulation_runs || 0,
      data.best_case_outcome || '{}',
      data.worst_case_outcome || '{}',
      data.most_likely_outcome || '{}',
      data.actual_outcome || null,
      data.prediction_accuracy || null,
      now,
      now,
      data.validated_at || null
    );

    return this.getById(id)!;
  },

  /**
   * Get prediction by ID
   */
  getById(id: string): DbImpactPrediction | null {
    const db = getDatabase();
    return selectOne<DbImpactPrediction>(db, 'SELECT * FROM impact_predictions WHERE id = ?', id);
  },

  /**
   * Get predictions for a subject
   */
  getBySubject(subjectType: string, subjectId: string): DbImpactPrediction[] {
    const db = getDatabase();
    return selectAll<DbImpactPrediction>(
      db,
      'SELECT * FROM impact_predictions WHERE subject_type = ? AND subject_id = ? ORDER BY predicted_at DESC',
      subjectType,
      subjectId
    );
  },

  /**
   * Get predictions by project
   */
  getByProject(projectId: string): DbImpactPrediction[] {
    const db = getDatabase();
    return selectAll<DbImpactPrediction>(
      db,
      'SELECT * FROM impact_predictions WHERE project_id = ? ORDER BY predicted_at DESC',
      projectId
    );
  },

  /**
   * Get predictions by horizon
   */
  getByHorizon(projectId: string, horizon: DbImpactPrediction['prediction_horizon']): DbImpactPrediction[] {
    const db = getDatabase();
    return selectAll<DbImpactPrediction>(
      db,
      'SELECT * FROM impact_predictions WHERE project_id = ? AND prediction_horizon = ? ORDER BY confidence_score DESC',
      projectId,
      horizon
    );
  },

  /**
   * Update prediction with actual outcome
   */
  recordOutcome(id: string, actualOutcome: string, accuracy: number): DbImpactPrediction | null {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    db.prepare(`
      UPDATE impact_predictions
      SET actual_outcome = ?, prediction_accuracy = ?, validated_at = ?, updated_at = ?
      WHERE id = ?
    `).run(actualOutcome, accuracy, now, now, id);

    return this.getById(id);
  },

  /**
   * Delete prediction
   */
  delete(id: string): boolean {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM impact_predictions WHERE id = ?').run(id);
    return result.changes > 0;
  },
};

// ============================================================================
// FEATURE INTERACTIONS
// ============================================================================

export const featureInteractionRepository = {
  /**
   * Create a new feature interaction
   */
  create(data: Omit<DbFeatureInteraction, 'id' | 'created_at' | 'updated_at'>): DbFeatureInteraction {
    const db = getDatabase();
    const id = generateId('fint');
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO feature_interactions (
        id, project_id, feature_a_id, feature_a_type, feature_b_id, feature_b_type,
        interaction_type, interaction_strength, is_bidirectional, impact_a_on_b,
        impact_b_on_a, shared_files, shared_contexts, analysis, recommendations,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.project_id,
      data.feature_a_id,
      data.feature_a_type,
      data.feature_b_id,
      data.feature_b_type,
      data.interaction_type,
      data.interaction_strength || 50,
      data.is_bidirectional ?? 1,
      data.impact_a_on_b || 0,
      data.impact_b_on_a || 0,
      data.shared_files || '[]',
      data.shared_contexts || '[]',
      data.analysis || '',
      data.recommendations || '[]',
      now,
      now
    );

    return this.getById(id)!;
  },

  /**
   * Get interaction by ID
   */
  getById(id: string): DbFeatureInteraction | null {
    const db = getDatabase();
    return selectOne<DbFeatureInteraction>(db, 'SELECT * FROM feature_interactions WHERE id = ?', id);
  },

  /**
   * Get interactions for a project
   */
  getByProject(projectId: string): DbFeatureInteraction[] {
    const db = getDatabase();
    return selectAll<DbFeatureInteraction>(
      db,
      'SELECT * FROM feature_interactions WHERE project_id = ? ORDER BY interaction_strength DESC',
      projectId
    );
  },

  /**
   * Get interactions for a specific feature
   */
  getByFeature(featureType: string, featureId: string): DbFeatureInteraction[] {
    const db = getDatabase();
    return selectAll<DbFeatureInteraction>(
      db,
      `SELECT * FROM feature_interactions
       WHERE (feature_a_type = ? AND feature_a_id = ?)
          OR (feature_b_type = ? AND feature_b_id = ?)
       ORDER BY interaction_strength DESC`,
      featureType,
      featureId,
      featureType,
      featureId
    );
  },

  /**
   * Get interactions by type
   */
  getByType(projectId: string, interactionType: DbFeatureInteraction['interaction_type']): DbFeatureInteraction[] {
    const db = getDatabase();
    return selectAll<DbFeatureInteraction>(
      db,
      'SELECT * FROM feature_interactions WHERE project_id = ? AND interaction_type = ? ORDER BY interaction_strength DESC',
      projectId,
      interactionType
    );
  },

  /**
   * Get synergies
   */
  getSynergies(projectId: string): DbFeatureInteraction[] {
    return this.getByType(projectId, 'synergy');
  },

  /**
   * Get conflicts
   */
  getConflicts(projectId: string): DbFeatureInteraction[] {
    return this.getByType(projectId, 'conflict');
  },

  /**
   * Delete interaction
   */
  delete(id: string): boolean {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM feature_interactions WHERE id = ?').run(id);
    return result.changes > 0;
  },

  /**
   * Get interaction counts by type
   */
  getCountByType(projectId: string): Record<string, number> {
    const db = getDatabase();
    const results = selectAll<{ interaction_type: string; count: number }>(
      db,
      `SELECT interaction_type, COUNT(*) as count FROM feature_interactions
       WHERE project_id = ?
       GROUP BY interaction_type`,
      projectId
    );
    return results.reduce((acc, row) => {
      acc[row.interaction_type] = row.count;
      return acc;
    }, {} as Record<string, number>);
  },
};

// ============================================================================
// DEBT PREVENTION RULES
// ============================================================================

export const debtPreventionRuleRepository = {
  /**
   * Create a new prevention rule
   */
  create(data: Omit<DbDebtPreventionRule, 'id' | 'created_at' | 'updated_at'>): DbDebtPreventionRule {
    const db = getDatabase();
    const id = generateId('dprule');
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO debt_prevention_rules (
        id, project_id, name, description, debt_pattern_id, target_category,
        trigger_type, trigger_conditions, action_type, action_template, apply_at,
        times_triggered, times_prevented, estimated_debt_prevented, is_active,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.project_id,
      data.name,
      data.description,
      data.debt_pattern_id || null,
      data.target_category,
      data.trigger_type,
      data.trigger_conditions || '{}',
      data.action_type,
      data.action_template || '',
      data.apply_at || 'on_scan',
      data.times_triggered || 0,
      data.times_prevented || 0,
      data.estimated_debt_prevented || 0,
      data.is_active ?? 1,
      now,
      now
    );

    return this.getById(id)!;
  },

  /**
   * Get rule by ID
   */
  getById(id: string): DbDebtPreventionRule | null {
    const db = getDatabase();
    return selectOne<DbDebtPreventionRule>(db, 'SELECT * FROM debt_prevention_rules WHERE id = ?', id);
  },

  /**
   * Get rules for a project
   */
  getByProject(projectId: string): DbDebtPreventionRule[] {
    const db = getDatabase();
    return selectAll<DbDebtPreventionRule>(
      db,
      'SELECT * FROM debt_prevention_rules WHERE project_id = ? ORDER BY times_prevented DESC',
      projectId
    );
  },

  /**
   * Get active rules
   */
  getActive(projectId: string): DbDebtPreventionRule[] {
    const db = getDatabase();
    return selectAll<DbDebtPreventionRule>(
      db,
      'SELECT * FROM debt_prevention_rules WHERE project_id = ? AND is_active = 1 ORDER BY times_prevented DESC',
      projectId
    );
  },

  /**
   * Increment triggered count
   */
  incrementTriggered(id: string, prevented: boolean): void {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    if (prevented) {
      db.prepare(`
        UPDATE debt_prevention_rules
        SET times_triggered = times_triggered + 1, times_prevented = times_prevented + 1, updated_at = ?
        WHERE id = ?
      `).run(now, id);
    } else {
      db.prepare(`
        UPDATE debt_prevention_rules
        SET times_triggered = times_triggered + 1, updated_at = ?
        WHERE id = ?
      `).run(now, id);
    }
  },

  /**
   * Toggle rule active state
   */
  setActive(id: string, active: boolean): DbDebtPreventionRule | null {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    db.prepare(`
      UPDATE debt_prevention_rules SET is_active = ?, updated_at = ? WHERE id = ?
    `).run(active ? 1 : 0, now, id);

    return this.getById(id);
  },

  /**
   * Delete rule
   */
  delete(id: string): boolean {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM debt_prevention_rules WHERE id = ?').run(id);
    return result.changes > 0;
  },
};

// ============================================================================
// VELOCITY TRACKING
// ============================================================================

export const velocityTrackingRepository = {
  /**
   * Record velocity metrics
   */
  record(data: Omit<DbVelocityTracking, 'id' | 'created_at'>): DbVelocityTracking {
    const db = getDatabase();
    const id = generateId('vtrack');
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO velocity_tracking (
        id, project_id, period_start, period_end, period_type,
        ideas_implemented, tech_debt_resolved, features_completed, refactorings_completed,
        bugs_introduced, bugs_fixed, test_coverage_change, total_effort_hours,
        effective_effort_hours, health_score, debt_score, complexity_score, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.project_id,
      data.period_start,
      data.period_end,
      data.period_type,
      data.ideas_implemented || 0,
      data.tech_debt_resolved || 0,
      data.features_completed || 0,
      data.refactorings_completed || 0,
      data.bugs_introduced || 0,
      data.bugs_fixed || 0,
      data.test_coverage_change || 0,
      data.total_effort_hours || 0,
      data.effective_effort_hours || 0,
      data.health_score || 0,
      data.debt_score || 0,
      data.complexity_score || 0,
      now
    );

    return this.getById(id)!;
  },

  /**
   * Get record by ID
   */
  getById(id: string): DbVelocityTracking | null {
    const db = getDatabase();
    return selectOne<DbVelocityTracking>(db, 'SELECT * FROM velocity_tracking WHERE id = ?', id);
  },

  /**
   * Get velocity history for a project
   */
  getByProject(projectId: string, limit: number = 100): DbVelocityTracking[] {
    const db = getDatabase();
    return selectAll<DbVelocityTracking>(
      db,
      'SELECT * FROM velocity_tracking WHERE project_id = ? ORDER BY period_end DESC LIMIT ?',
      projectId,
      limit
    );
  },

  /**
   * Get velocity by period type
   */
  getByPeriodType(projectId: string, periodType: DbVelocityTracking['period_type']): DbVelocityTracking[] {
    const db = getDatabase();
    return selectAll<DbVelocityTracking>(
      db,
      'SELECT * FROM velocity_tracking WHERE project_id = ? AND period_type = ? ORDER BY period_end DESC',
      projectId,
      periodType
    );
  },

  /**
   * Get recent velocity (last N periods)
   */
  getRecent(projectId: string, periodType: DbVelocityTracking['period_type'], count: number): DbVelocityTracking[] {
    const db = getDatabase();
    return selectAll<DbVelocityTracking>(
      db,
      'SELECT * FROM velocity_tracking WHERE project_id = ? AND period_type = ? ORDER BY period_end DESC LIMIT ?',
      projectId,
      periodType,
      count
    );
  },

  /**
   * Calculate velocity trend
   */
  getTrend(projectId: string, periodType: DbVelocityTracking['period_type']): {
    trend: 'increasing' | 'stable' | 'decreasing';
    averageVelocity: number;
    recentVelocity: number;
  } {
    const records = this.getRecent(projectId, periodType, 10);

    if (records.length < 2) {
      return { trend: 'stable', averageVelocity: 0, recentVelocity: 0 };
    }

    // Calculate velocity as ideas + features + refactorings + debt resolved
    const velocities = records.map(r =>
      r.ideas_implemented + r.features_completed + r.refactorings_completed + r.tech_debt_resolved
    );

    const averageVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
    const recentVelocity = velocities.slice(0, 3).reduce((a, b) => a + b, 0) / Math.min(3, velocities.length);

    let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    const change = recentVelocity - averageVelocity;
    if (change > averageVelocity * 0.1) trend = 'increasing';
    else if (change < -averageVelocity * 0.1) trend = 'decreasing';

    return { trend, averageVelocity, recentVelocity };
  },
};

// ============================================================================
// ROADMAP SIMULATIONS
// ============================================================================

export const roadmapSimulationRepository = {
  /**
   * Create a new simulation
   */
  create(data: Omit<DbRoadmapSimulation, 'id' | 'created_at' | 'updated_at'>): DbRoadmapSimulation {
    const db = getDatabase();
    const id = generateId('rsim');
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO roadmap_simulations (
        id, project_id, name, description, simulation_type, input_parameters,
        assumptions, projected_initiatives, projected_milestones, projected_health_scores,
        projected_velocity, total_debt_reduction, velocity_improvement, risk_reduction,
        is_selected, comparison_notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.project_id,
      data.name,
      data.description || '',
      data.simulation_type || 'baseline',
      data.input_parameters || '{}',
      data.assumptions || '[]',
      data.projected_initiatives || '[]',
      data.projected_milestones || '[]',
      data.projected_health_scores || '[]',
      data.projected_velocity || '[]',
      data.total_debt_reduction || 0,
      data.velocity_improvement || 0,
      data.risk_reduction || 0,
      data.is_selected || 0,
      data.comparison_notes || null,
      now,
      now
    );

    return this.getById(id)!;
  },

  /**
   * Get simulation by ID
   */
  getById(id: string): DbRoadmapSimulation | null {
    const db = getDatabase();
    return selectOne<DbRoadmapSimulation>(db, 'SELECT * FROM roadmap_simulations WHERE id = ?', id);
  },

  /**
   * Get simulations for a project
   */
  getByProject(projectId: string): DbRoadmapSimulation[] {
    const db = getDatabase();
    return selectAll<DbRoadmapSimulation>(
      db,
      'SELECT * FROM roadmap_simulations WHERE project_id = ? ORDER BY created_at DESC',
      projectId
    );
  },

  /**
   * Get selected simulation
   */
  getSelected(projectId: string): DbRoadmapSimulation | null {
    const db = getDatabase();
    return selectOne<DbRoadmapSimulation>(
      db,
      'SELECT * FROM roadmap_simulations WHERE project_id = ? AND is_selected = 1',
      projectId
    );
  },

  /**
   * Select a simulation (deselect others)
   */
  select(id: string): DbRoadmapSimulation | null {
    const db = getDatabase();
    const simulation = this.getById(id);
    if (!simulation) return null;

    const now = getCurrentTimestamp();

    // Deselect all others
    db.prepare(`
      UPDATE roadmap_simulations SET is_selected = 0, updated_at = ? WHERE project_id = ?
    `).run(now, simulation.project_id);

    // Select this one
    db.prepare(`
      UPDATE roadmap_simulations SET is_selected = 1, updated_at = ? WHERE id = ?
    `).run(now, id);

    return this.getById(id);
  },

  /**
   * Update simulation
   */
  update(id: string, updates: Partial<DbRoadmapSimulation>): DbRoadmapSimulation | null {
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
      UPDATE roadmap_simulations SET ${fields.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);

    return this.getById(id);
  },

  /**
   * Delete simulation
   */
  delete(id: string): boolean {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM roadmap_simulations WHERE id = ?').run(id);
    return result.changes > 0;
  },
};

// ============================================================================
// SUMMARY HELPERS
// ============================================================================

export const roadmapSummaryRepository = {
  /**
   * Get roadmap summary for a project
   */
  getSummary(projectId: string): RoadmapSummary {
    const initiatives = strategicInitiativeRepository.getByProject(projectId);
    const milestones = roadmapMilestoneRepository.getByProject(projectId);
    const interactions = featureInteractionRepository.getByProject(projectId);
    const velocityTrend = velocityTrackingRepository.getTrend(projectId, 'weekly');

    // Get status and type counts
    const statusCounts = strategicInitiativeRepository.getCountByStatus(projectId);
    const typeCounts = strategicInitiativeRepository.getCountByType(projectId);
    const interactionCounts = featureInteractionRepository.getCountByType(projectId);

    // Calculate health score based on various factors
    let healthScore = 70; // Base score

    // Adjust based on debt reduction initiatives
    const debtInitiatives = initiatives.filter(i => i.initiative_type === 'debt_reduction');
    if (debtInitiatives.length > 0) {
      healthScore += Math.min(10, debtInitiatives.length * 2);
    }

    // Adjust based on completed initiatives
    const completedCount = statusCounts['completed'] || 0;
    healthScore += Math.min(10, completedCount * 2);

    // Adjust based on conflicts
    const conflictCount = interactionCounts['conflict'] || 0;
    healthScore -= Math.min(15, conflictCount * 3);

    healthScore = Math.max(0, Math.min(100, healthScore));

    // Build quarter projections
    const now = new Date();
    const quarters = [];
    for (let i = 1; i <= 6; i++) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthInitiatives = initiatives.filter(init => init.target_month === i);
      const monthMilestones = milestones.filter(m => m.month_index === i);

      quarters.push({
        quarter: Math.ceil(i / 3),
        month: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        targetHealthScore: healthScore + (i * 2), // Projected improvement
        projectedHealthScore: healthScore + (i * 1.5), // More conservative projection
        initiatives: monthInitiatives.length,
        milestones: monthMilestones.length,
      });
    }

    // Determine trends and risk
    const debtTrend = debtInitiatives.length > 2 ? 'improving' : (conflictCount > 3 ? 'worsening' : 'stable');
    const riskLevel = conflictCount > 5 ? 'high' : (conflictCount > 2 ? 'medium' : 'low');

    return {
      healthScore,
      sixMonthProjection: {
        startDate: now.toISOString(),
        endDate: new Date(now.getFullYear(), now.getMonth() + 6, 1).toISOString(),
        quarters,
      },
      initiatives: {
        total: initiatives.length,
        byStatus: statusCounts,
        byType: typeCounts,
        topPriority: initiatives.slice(0, 5),
      },
      predictions: {
        velocityTrend: velocityTrend.trend,
        debtTrend: debtTrend as 'improving' | 'stable' | 'worsening',
        riskLevel: riskLevel as 'low' | 'medium' | 'high' | 'critical',
        confidence: 70, // Base confidence
      },
      interactions: {
        synergies: interactionCounts['synergy'] || 0,
        conflicts: interactionCounts['conflict'] || 0,
        dependencies: interactionCounts['dependency'] || 0,
      },
    };
  },
};
