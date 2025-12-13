/**
 * ROI Simulator Repository
 * CRUD operations for development economics ROI simulation engine
 */

import { getDatabase } from '../connection';
import { generateId, getCurrentTimestamp, selectAll, selectOne } from './repository.utils';
import type {
  DbRefactoringEconomics,
  DbROISimulation,
  DbPortfolioOptimization,
  DbVelocityPrediction,
  DbDebtPaydownStrategy,
  DbEconomicEvent,
  DbROIConfig,
  ROISimulatorSummary,
  RefactoringCategory,
  RefactoringWithROI,
} from '../models/roi-simulator.types';

// ============================================================================
// REFACTORING ECONOMICS
// ============================================================================

export const refactoringEconomicsRepository = {
  /**
   * Create a new refactoring with economic modeling
   */
  create(data: Omit<DbRefactoringEconomics, 'id' | 'created_at' | 'updated_at' | 'calculated_cost' | 'calculated_benefit' | 'roi_percentage' | 'payback_months' | 'net_present_value' | 'priority_score'>): DbRefactoringEconomics {
    const db = getDatabase();
    const id = generateId('recon');
    const now = getCurrentTimestamp();

    // Calculate economic metrics
    const metrics = calculateEconomicMetrics(data);

    const stmt = db.prepare(`
      INSERT INTO refactoring_economics (
        id, project_id, source_type, source_id, title, description, category,
        estimated_hours, hourly_rate, opportunity_cost_factor, risk_premium,
        learning_overhead, testing_overhead, velocity_improvement,
        maintainability_score_before, maintainability_score_after,
        security_risk_before, security_risk_after, bug_probability_before,
        bug_probability_after, code_complexity_before, code_complexity_after,
        calculated_cost, calculated_benefit, roi_percentage, payback_months,
        net_present_value, priority_score, status, confidence_level,
        created_at, updated_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.project_id,
      data.source_type || 'manual',
      data.source_id || null,
      data.title,
      data.description || null,
      data.category || 'code_quality',
      data.estimated_hours || 0,
      data.hourly_rate || 100,
      data.opportunity_cost_factor ?? 0.5,
      data.risk_premium ?? 0.1,
      data.learning_overhead ?? 0.2,
      data.testing_overhead ?? 0.3,
      data.velocity_improvement || 0,
      data.maintainability_score_before || 50,
      data.maintainability_score_after || 50,
      data.security_risk_before || 50,
      data.security_risk_after || 50,
      data.bug_probability_before ?? 0.1,
      data.bug_probability_after ?? 0.1,
      data.code_complexity_before || 50,
      data.code_complexity_after || 50,
      metrics.calculated_cost,
      metrics.calculated_benefit,
      metrics.roi_percentage,
      metrics.payback_months,
      metrics.net_present_value,
      metrics.priority_score,
      data.status || 'proposed',
      data.confidence_level || 50,
      now,
      now,
      data.completed_at || null
    );

    return this.getById(id)!;
  },

  /**
   * Get refactoring by ID
   */
  getById(id: string): DbRefactoringEconomics | null {
    const db = getDatabase();
    return selectOne<DbRefactoringEconomics>(db, 'SELECT * FROM refactoring_economics WHERE id = ?', id);
  },

  /**
   * Get all refactorings for a project
   */
  getByProject(projectId: string): DbRefactoringEconomics[] {
    const db = getDatabase();
    return selectAll<DbRefactoringEconomics>(
      db,
      'SELECT * FROM refactoring_economics WHERE project_id = ? ORDER BY priority_score DESC',
      projectId
    );
  },

  /**
   * Get refactorings by status
   */
  getByStatus(projectId: string, status: DbRefactoringEconomics['status']): DbRefactoringEconomics[] {
    const db = getDatabase();
    return selectAll<DbRefactoringEconomics>(
      db,
      'SELECT * FROM refactoring_economics WHERE project_id = ? AND status = ? ORDER BY priority_score DESC',
      projectId,
      status
    );
  },

  /**
   * Get refactorings by category
   */
  getByCategory(projectId: string, category: RefactoringCategory): DbRefactoringEconomics[] {
    const db = getDatabase();
    return selectAll<DbRefactoringEconomics>(
      db,
      'SELECT * FROM refactoring_economics WHERE project_id = ? AND category = ? ORDER BY roi_percentage DESC',
      projectId,
      category
    );
  },

  /**
   * Get top ROI refactorings
   */
  getTopROI(projectId: string, limit: number = 10): DbRefactoringEconomics[] {
    const db = getDatabase();
    return selectAll<DbRefactoringEconomics>(
      db,
      `SELECT * FROM refactoring_economics
       WHERE project_id = ? AND status NOT IN ('completed', 'rejected')
       ORDER BY roi_percentage DESC
       LIMIT ?`,
      projectId,
      limit
    );
  },

  /**
   * Get refactorings by source
   */
  getBySource(sourceType: string, sourceId: string): DbRefactoringEconomics[] {
    const db = getDatabase();
    return selectAll<DbRefactoringEconomics>(
      db,
      'SELECT * FROM refactoring_economics WHERE source_type = ? AND source_id = ?',
      sourceType,
      sourceId
    );
  },

  /**
   * Update refactoring (recalculates economic metrics)
   */
  update(id: string, updates: Partial<DbRefactoringEconomics>): DbRefactoringEconomics | null {
    const db = getDatabase();
    const existing = this.getById(id);
    if (!existing) return null;

    const now = getCurrentTimestamp();

    // Merge updates with existing data to recalculate metrics
    const merged = { ...existing, ...updates };
    const metrics = calculateEconomicMetrics(merged);

    const fields: string[] = [];
    const values: unknown[] = [];

    // Add explicit fields that don't need recalculation
    const directFields = [
      'source_type', 'source_id', 'title', 'description', 'category',
      'estimated_hours', 'hourly_rate', 'opportunity_cost_factor', 'risk_premium',
      'learning_overhead', 'testing_overhead', 'velocity_improvement',
      'maintainability_score_before', 'maintainability_score_after',
      'security_risk_before', 'security_risk_after', 'bug_probability_before',
      'bug_probability_after', 'code_complexity_before', 'code_complexity_after',
      'status', 'confidence_level', 'completed_at'
    ];

    Object.entries(updates).forEach(([key, value]) => {
      if (directFields.includes(key) && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    // Always update calculated metrics
    fields.push('calculated_cost = ?');
    values.push(metrics.calculated_cost);
    fields.push('calculated_benefit = ?');
    values.push(metrics.calculated_benefit);
    fields.push('roi_percentage = ?');
    values.push(metrics.roi_percentage);
    fields.push('payback_months = ?');
    values.push(metrics.payback_months);
    fields.push('net_present_value = ?');
    values.push(metrics.net_present_value);
    fields.push('priority_score = ?');
    values.push(metrics.priority_score);

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = db.prepare(`
      UPDATE refactoring_economics SET ${fields.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);

    return this.getById(id);
  },

  /**
   * Delete refactoring
   */
  delete(id: string): boolean {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM refactoring_economics WHERE id = ?').run(id);
    return result.changes > 0;
  },

  /**
   * Get aggregate stats by category
   */
  getStatsByCategory(projectId: string): Record<RefactoringCategory, { count: number; investment: number; roi: number }> {
    const db = getDatabase();
    const results = selectAll<{ category: string; count: number; total_cost: number; total_benefit: number }>(
      db,
      `SELECT category, COUNT(*) as count, SUM(calculated_cost) as total_cost, SUM(calculated_benefit) as total_benefit
       FROM refactoring_economics WHERE project_id = ?
       GROUP BY category`,
      projectId
    );

    const stats: Record<string, { count: number; investment: number; roi: number }> = {};
    results.forEach(row => {
      const roi = row.total_cost > 0 ? ((row.total_benefit - row.total_cost) / row.total_cost) * 100 : 0;
      stats[row.category] = {
        count: row.count,
        investment: row.total_cost,
        roi: Math.round(roi * 10) / 10
      };
    });

    return stats as Record<RefactoringCategory, { count: number; investment: number; roi: number }>;
  },

  /**
   * Get with computed ROI details
   */
  getWithROIDetails(projectId: string): RefactoringWithROI[] {
    const items = this.getByProject(projectId);
    return items.map(item => computeROIDetails(item));
  },
};

// ============================================================================
// ROI SIMULATIONS
// ============================================================================

export const roiSimulationRepository = {
  /**
   * Create a new simulation
   */
  create(data: Omit<DbROISimulation, 'id' | 'created_at' | 'updated_at'>): DbROISimulation {
    const db = getDatabase();
    const id = generateId('roisim');
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO roi_simulations (
        id, project_id, name, description, simulation_type, time_horizon_months,
        discount_rate, team_size, average_hourly_rate, feature_velocity_baseline,
        current_health_score, current_debt_score, selected_refactoring_ids,
        total_investment, projected_velocity, projected_health_scores,
        projected_debt_scores, cumulative_roi, total_cost, total_benefit,
        overall_roi, break_even_month, final_velocity_improvement,
        final_health_improvement, is_selected, comparison_notes,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.project_id,
      data.name,
      data.description || null,
      data.simulation_type || 'baseline',
      data.time_horizon_months || 12,
      data.discount_rate ?? 0.1,
      data.team_size || 5,
      data.average_hourly_rate || 100,
      data.feature_velocity_baseline || 5,
      data.current_health_score || 50,
      data.current_debt_score || 50,
      data.selected_refactoring_ids || '[]',
      data.total_investment || 0,
      data.projected_velocity || '[]',
      data.projected_health_scores || '[]',
      data.projected_debt_scores || '[]',
      data.cumulative_roi || '[]',
      data.total_cost || 0,
      data.total_benefit || 0,
      data.overall_roi || 0,
      data.break_even_month || null,
      data.final_velocity_improvement || 0,
      data.final_health_improvement || 0,
      data.is_selected ? 1 : 0,
      data.comparison_notes || null,
      now,
      now
    );

    return this.getById(id)!;
  },

  /**
   * Get simulation by ID
   */
  getById(id: string): DbROISimulation | null {
    const db = getDatabase();
    return selectOne<DbROISimulation>(db, 'SELECT * FROM roi_simulations WHERE id = ?', id);
  },

  /**
   * Get simulations for a project
   */
  getByProject(projectId: string): DbROISimulation[] {
    const db = getDatabase();
    return selectAll<DbROISimulation>(
      db,
      'SELECT * FROM roi_simulations WHERE project_id = ? ORDER BY created_at DESC',
      projectId
    );
  },

  /**
   * Get selected simulation
   */
  getSelected(projectId: string): DbROISimulation | null {
    const db = getDatabase();
    return selectOne<DbROISimulation>(
      db,
      'SELECT * FROM roi_simulations WHERE project_id = ? AND is_selected = 1',
      projectId
    );
  },

  /**
   * Select a simulation (deselect others)
   */
  select(id: string): DbROISimulation | null {
    const db = getDatabase();
    const simulation = this.getById(id);
    if (!simulation) return null;

    const now = getCurrentTimestamp();

    // Deselect all others
    db.prepare(`
      UPDATE roi_simulations SET is_selected = 0, updated_at = ? WHERE project_id = ?
    `).run(now, simulation.project_id);

    // Select this one
    db.prepare(`
      UPDATE roi_simulations SET is_selected = 1, updated_at = ? WHERE id = ?
    `).run(now, id);

    return this.getById(id);
  },

  /**
   * Update simulation
   */
  update(id: string, updates: Partial<DbROISimulation>): DbROISimulation | null {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const fields: string[] = [];
    const values: unknown[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'created_at' && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(key === 'is_selected' ? (value ? 1 : 0) : value);
      }
    });

    if (fields.length === 0) return this.getById(id);

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = db.prepare(`
      UPDATE roi_simulations SET ${fields.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);

    return this.getById(id);
  },

  /**
   * Delete simulation
   */
  delete(id: string): boolean {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM roi_simulations WHERE id = ?').run(id);
    return result.changes > 0;
  },
};

// ============================================================================
// PORTFOLIO OPTIMIZATIONS
// ============================================================================

export const portfolioOptimizationRepository = {
  /**
   * Create a new portfolio optimization
   */
  create(data: Omit<DbPortfolioOptimization, 'id' | 'created_at' | 'updated_at'>): DbPortfolioOptimization {
    const db = getDatabase();
    const id = generateId('popt');
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO portfolio_optimizations (
        id, project_id, name, optimization_type, budget_constraint, time_constraint_months,
        selected_items, total_allocated_hours, expected_roi, expected_velocity_gain,
        expected_risk_reduction, pareto_frontier, trade_off_analysis, constraints_used,
        optimization_algorithm, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.project_id,
      data.name,
      data.optimization_type || 'balanced',
      data.budget_constraint || 0,
      data.time_constraint_months || 12,
      data.selected_items || '[]',
      data.total_allocated_hours || 0,
      data.expected_roi || 0,
      data.expected_velocity_gain || 0,
      data.expected_risk_reduction || 0,
      data.pareto_frontier || '[]',
      data.trade_off_analysis || '{}',
      data.constraints_used || '{}',
      data.optimization_algorithm || 'greedy',
      data.status || 'computing',
      now,
      now
    );

    return this.getById(id)!;
  },

  /**
   * Get by ID
   */
  getById(id: string): DbPortfolioOptimization | null {
    const db = getDatabase();
    return selectOne<DbPortfolioOptimization>(db, 'SELECT * FROM portfolio_optimizations WHERE id = ?', id);
  },

  /**
   * Get by project
   */
  getByProject(projectId: string): DbPortfolioOptimization[] {
    const db = getDatabase();
    return selectAll<DbPortfolioOptimization>(
      db,
      'SELECT * FROM portfolio_optimizations WHERE project_id = ? ORDER BY created_at DESC',
      projectId
    );
  },

  /**
   * Get ready optimizations
   */
  getReady(projectId: string): DbPortfolioOptimization[] {
    const db = getDatabase();
    return selectAll<DbPortfolioOptimization>(
      db,
      'SELECT * FROM portfolio_optimizations WHERE project_id = ? AND status = ? ORDER BY expected_roi DESC',
      projectId,
      'ready'
    );
  },

  /**
   * Update
   */
  update(id: string, updates: Partial<DbPortfolioOptimization>): DbPortfolioOptimization | null {
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

    db.prepare(`UPDATE portfolio_optimizations SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.getById(id);
  },

  /**
   * Delete
   */
  delete(id: string): boolean {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM portfolio_optimizations WHERE id = ?').run(id);
    return result.changes > 0;
  },
};

// ============================================================================
// VELOCITY PREDICTIONS
// ============================================================================

export const velocityPredictionRepository = {
  /**
   * Create a new velocity prediction
   */
  create(data: Omit<DbVelocityPrediction, 'id' | 'created_at'>): DbVelocityPrediction {
    const db = getDatabase();
    const id = generateId('vpred');
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO velocity_predictions (
        id, project_id, prediction_date, horizon_months, current_velocity,
        current_debt_level, planned_refactorings, planned_features, team_capacity_hours,
        scenario_type, nash_equilibrium_score, optimal_allocation,
        predicted_velocity_trend, predicted_debt_trend, confidence_interval_low,
        confidence_interval_high, velocity_at_risk, worst_case_velocity, best_case_velocity,
        actual_velocity, actual_debt, prediction_accuracy, created_at, validated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.project_id,
      data.prediction_date || now,
      data.horizon_months || 6,
      data.current_velocity || 0,
      data.current_debt_level || 0,
      data.planned_refactorings || '[]',
      data.planned_features || '[]',
      data.team_capacity_hours || 0,
      data.scenario_type || 'balanced',
      data.nash_equilibrium_score || 50,
      data.optimal_allocation || '{}',
      data.predicted_velocity_trend || '[]',
      data.predicted_debt_trend || '[]',
      data.confidence_interval_low || '[]',
      data.confidence_interval_high || '[]',
      data.velocity_at_risk || 0,
      data.worst_case_velocity || 0,
      data.best_case_velocity || 0,
      data.actual_velocity || null,
      data.actual_debt || null,
      data.prediction_accuracy || null,
      now,
      data.validated_at || null
    );

    return this.getById(id)!;
  },

  /**
   * Get by ID
   */
  getById(id: string): DbVelocityPrediction | null {
    const db = getDatabase();
    return selectOne<DbVelocityPrediction>(db, 'SELECT * FROM velocity_predictions WHERE id = ?', id);
  },

  /**
   * Get by project
   */
  getByProject(projectId: string, limit: number = 50): DbVelocityPrediction[] {
    const db = getDatabase();
    return selectAll<DbVelocityPrediction>(
      db,
      'SELECT * FROM velocity_predictions WHERE project_id = ? ORDER BY prediction_date DESC LIMIT ?',
      projectId,
      limit
    );
  },

  /**
   * Get latest prediction
   */
  getLatest(projectId: string): DbVelocityPrediction | null {
    const db = getDatabase();
    return selectOne<DbVelocityPrediction>(
      db,
      'SELECT * FROM velocity_predictions WHERE project_id = ? ORDER BY prediction_date DESC LIMIT 1',
      projectId
    );
  },

  /**
   * Record actual outcomes
   */
  recordActual(id: string, actualVelocity: string, actualDebt: string, accuracy: number): DbVelocityPrediction | null {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    db.prepare(`
      UPDATE velocity_predictions
      SET actual_velocity = ?, actual_debt = ?, prediction_accuracy = ?, validated_at = ?
      WHERE id = ?
    `).run(actualVelocity, actualDebt, accuracy, now, id);

    return this.getById(id);
  },

  /**
   * Delete
   */
  delete(id: string): boolean {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM velocity_predictions WHERE id = ?').run(id);
    return result.changes > 0;
  },
};

// ============================================================================
// DEBT PAYDOWN STRATEGIES
// ============================================================================

export const debtPaydownStrategyRepository = {
  /**
   * Create a new strategy
   */
  create(data: Omit<DbDebtPaydownStrategy, 'id' | 'created_at' | 'updated_at'>): DbDebtPaydownStrategy {
    const db = getDatabase();
    const id = generateId('dpstrat');
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO debt_paydown_strategies (
        id, project_id, name, description, strategy_type, debt_items,
        total_debt_hours, total_debt_cost, monthly_capacity_hours,
        paydown_aggressiveness, feature_pressure, paydown_schedule,
        projected_completion_date, projected_roi_curve, equilibrium_debt_level,
        debt_accumulation_rate, net_paydown_rate, status, is_active,
        created_at, updated_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.project_id,
      data.name,
      data.description || null,
      data.strategy_type || 'balanced',
      data.debt_items || '[]',
      data.total_debt_hours || 0,
      data.total_debt_cost || 0,
      data.monthly_capacity_hours || 0,
      data.paydown_aggressiveness ?? 0.3,
      data.feature_pressure ?? 0.5,
      data.paydown_schedule || '[]',
      data.projected_completion_date || null,
      data.projected_roi_curve || '[]',
      data.equilibrium_debt_level || 0,
      data.debt_accumulation_rate || 0,
      data.net_paydown_rate || 0,
      data.status || 'draft',
      data.is_active ? 1 : 0,
      now,
      now,
      data.completed_at || null
    );

    return this.getById(id)!;
  },

  /**
   * Get by ID
   */
  getById(id: string): DbDebtPaydownStrategy | null {
    const db = getDatabase();
    return selectOne<DbDebtPaydownStrategy>(db, 'SELECT * FROM debt_paydown_strategies WHERE id = ?', id);
  },

  /**
   * Get by project
   */
  getByProject(projectId: string): DbDebtPaydownStrategy[] {
    const db = getDatabase();
    return selectAll<DbDebtPaydownStrategy>(
      db,
      'SELECT * FROM debt_paydown_strategies WHERE project_id = ? ORDER BY created_at DESC',
      projectId
    );
  },

  /**
   * Get active strategy
   */
  getActive(projectId: string): DbDebtPaydownStrategy | null {
    const db = getDatabase();
    return selectOne<DbDebtPaydownStrategy>(
      db,
      'SELECT * FROM debt_paydown_strategies WHERE project_id = ? AND is_active = 1',
      projectId
    );
  },

  /**
   * Set active strategy (deactivate others)
   */
  setActive(id: string): DbDebtPaydownStrategy | null {
    const db = getDatabase();
    const strategy = this.getById(id);
    if (!strategy) return null;

    const now = getCurrentTimestamp();

    // Deactivate others
    db.prepare(`
      UPDATE debt_paydown_strategies SET is_active = 0, updated_at = ? WHERE project_id = ?
    `).run(now, strategy.project_id);

    // Activate this one
    db.prepare(`
      UPDATE debt_paydown_strategies SET is_active = 1, status = 'active', updated_at = ? WHERE id = ?
    `).run(now, id);

    return this.getById(id);
  },

  /**
   * Update
   */
  update(id: string, updates: Partial<DbDebtPaydownStrategy>): DbDebtPaydownStrategy | null {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const fields: string[] = [];
    const values: unknown[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'created_at' && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(key === 'is_active' ? (value ? 1 : 0) : value);
      }
    });

    if (fields.length === 0) return this.getById(id);

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    db.prepare(`UPDATE debt_paydown_strategies SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.getById(id);
  },

  /**
   * Delete
   */
  delete(id: string): boolean {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM debt_paydown_strategies WHERE id = ?').run(id);
    return result.changes > 0;
  },
};

// ============================================================================
// ECONOMIC EVENTS
// ============================================================================

export const economicEventRepository = {
  /**
   * Record an economic event
   */
  create(data: Omit<DbEconomicEvent, 'id' | 'created_at'>): DbEconomicEvent {
    const db = getDatabase();
    const id = generateId('econ');
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO economic_events (
        id, project_id, event_type, source_type, source_id, amount,
        hours_spent, hourly_rate_used, title, description,
        attributed_to_refactoring_id, event_date, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.project_id,
      data.event_type,
      data.source_type || 'refactoring',
      data.source_id || null,
      data.amount || 0,
      data.hours_spent || null,
      data.hourly_rate_used || null,
      data.title,
      data.description || null,
      data.attributed_to_refactoring_id || null,
      data.event_date || now,
      now
    );

    return this.getById(id)!;
  },

  /**
   * Get by ID
   */
  getById(id: string): DbEconomicEvent | null {
    const db = getDatabase();
    return selectOne<DbEconomicEvent>(db, 'SELECT * FROM economic_events WHERE id = ?', id);
  },

  /**
   * Get by project
   */
  getByProject(projectId: string, limit: number = 100): DbEconomicEvent[] {
    const db = getDatabase();
    return selectAll<DbEconomicEvent>(
      db,
      'SELECT * FROM economic_events WHERE project_id = ? ORDER BY event_date DESC LIMIT ?',
      projectId,
      limit
    );
  },

  /**
   * Get events attributed to a refactoring
   */
  getByRefactoring(refactoringId: string): DbEconomicEvent[] {
    const db = getDatabase();
    return selectAll<DbEconomicEvent>(
      db,
      'SELECT * FROM economic_events WHERE attributed_to_refactoring_id = ? ORDER BY event_date DESC',
      refactoringId
    );
  },

  /**
   * Get total by type for project
   */
  getTotalsByType(projectId: string): Record<string, number> {
    const db = getDatabase();
    const results = selectAll<{ event_type: string; total: number }>(
      db,
      `SELECT event_type, SUM(amount) as total FROM economic_events
       WHERE project_id = ?
       GROUP BY event_type`,
      projectId
    );
    return results.reduce((acc, row) => {
      acc[row.event_type] = row.total;
      return acc;
    }, {} as Record<string, number>);
  },

  /**
   * Delete
   */
  delete(id: string): boolean {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM economic_events WHERE id = ?').run(id);
    return result.changes > 0;
  },
};

// ============================================================================
// ROI CONFIG
// ============================================================================

export const roiConfigRepository = {
  /**
   * Get or create config for project
   */
  getOrCreate(projectId: string): DbROIConfig {
    const existing = this.getByProject(projectId);
    if (existing) return existing;

    const db = getDatabase();
    const id = generateId('roicfg');
    const now = getCurrentTimestamp();

    db.prepare(`
      INSERT INTO roi_config (
        id, project_id, default_hourly_rate, overhead_multiplier, risk_free_rate,
        bug_fix_cost_average, incident_cost_average, security_incident_cost,
        developer_onboarding_cost, feature_delay_cost_per_day, baseline_velocity,
        velocity_measurement, roi_weight, velocity_weight, risk_weight,
        maintainability_weight, created_at, updated_at
      ) VALUES (?, ?, 100, 1.3, 0.05, 2000, 10000, 50000, 15000, 500, 5, 'features', 0.4, 0.25, 0.2, 0.15, ?, ?)
    `).run(id, projectId, now, now);

    return this.getById(id)!;
  },

  /**
   * Get by ID
   */
  getById(id: string): DbROIConfig | null {
    const db = getDatabase();
    return selectOne<DbROIConfig>(db, 'SELECT * FROM roi_config WHERE id = ?', id);
  },

  /**
   * Get by project
   */
  getByProject(projectId: string): DbROIConfig | null {
    const db = getDatabase();
    return selectOne<DbROIConfig>(db, 'SELECT * FROM roi_config WHERE project_id = ?', projectId);
  },

  /**
   * Update config
   */
  update(id: string, updates: Partial<DbROIConfig>): DbROIConfig | null {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const fields: string[] = [];
    const values: unknown[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'project_id' && key !== 'created_at' && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return this.getById(id);

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    db.prepare(`UPDATE roi_config SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.getById(id);
  },
};

// ============================================================================
// SUMMARY REPOSITORY
// ============================================================================

export const roiSummaryRepository = {
  /**
   * Get comprehensive ROI dashboard summary
   */
  getSummary(projectId: string): ROISimulatorSummary {
    const refactorings = refactoringEconomicsRepository.getByProject(projectId);
    const categoryStats = refactoringEconomicsRepository.getStatsByCategory(projectId);
    const events = economicEventRepository.getByProject(projectId, 50);
    const eventTotals = economicEventRepository.getTotalsByType(projectId);
    const activeSimulation = roiSimulationRepository.getSelected(projectId);
    const simulations = roiSimulationRepository.getByProject(projectId);
    const activeStrategy = debtPaydownStrategyRepository.getActive(projectId);

    // Calculate portfolio metrics
    const totalInvestment = refactorings.reduce((sum, r) => sum + r.calculated_cost, 0);
    const totalBenefit = refactorings.reduce((sum, r) => sum + r.calculated_benefit, 0);
    const avgROI = refactorings.length > 0
      ? refactorings.reduce((sum, r) => sum + r.roi_percentage, 0) / refactorings.length
      : 0;

    // Count by status
    const byStatus: Record<string, number> = {};
    refactorings.forEach(r => {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    });

    // Calculate debt metrics
    const costEvents = events.filter(e => e.event_type === 'cost');
    const benefitEvents = events.filter(e => e.event_type === 'benefit');
    const monthlyDebtAccumulation = costEvents.length > 0
      ? costEvents.reduce((sum, e) => sum + Math.abs(e.amount), 0) / Math.max(1, costEvents.length)
      : 0;
    const monthlyDebtPaydown = benefitEvents.length > 0
      ? benefitEvents.reduce((sum, e) => sum + e.amount, 0) / Math.max(1, benefitEvents.length)
      : 0;

    // Determine trends
    const netDebtTrend: 'increasing' | 'stable' | 'decreasing' =
      monthlyDebtPaydown > monthlyDebtAccumulation * 1.1 ? 'decreasing' :
        monthlyDebtAccumulation > monthlyDebtPaydown * 1.1 ? 'increasing' : 'stable';

    // Top ROI items
    const topROI = refactorings
      .filter(r => r.status !== 'completed' && r.status !== 'rejected')
      .sort((a, b) => b.roi_percentage - a.roi_percentage)
      .slice(0, 5)
      .map(r => ({
        id: r.id,
        title: r.title,
        roi: Math.round(r.roi_percentage * 10) / 10,
        paybackMonths: Math.round(r.payback_months * 10) / 10
      }));

    // Urgent items (high security risk or critical category)
    const urgentItems = refactorings
      .filter(r => r.status !== 'completed' && r.status !== 'rejected')
      .filter(r => r.category === 'security' || r.security_risk_before > 70)
      .slice(0, 3)
      .map(r => ({
        id: r.id,
        title: r.title,
        reason: r.category === 'security' ? 'Security risk' : 'High complexity'
      }));

    // Calculate optimal allocation
    const totalComplexityBefore = refactorings.reduce((sum, r) => sum + r.code_complexity_before, 0);
    const avgComplexity = totalComplexityBefore / Math.max(1, refactorings.length);
    const refactoringPercent = avgComplexity > 60 ? 40 : avgComplexity > 40 ? 30 : 20;

    return {
      projectId,
      portfolio: {
        totalRefactorings: refactorings.length,
        totalInvestment: Math.round(totalInvestment),
        totalExpectedBenefit: Math.round(totalBenefit),
        averageROI: Math.round(avgROI * 10) / 10,
        byCategory: categoryStats,
        byStatus
      },
      economics: {
        currentDebtCost: eventTotals['cost'] || 0,
        monthlyDebtAccumulation: Math.round(monthlyDebtAccumulation),
        monthlyDebtPaydown: Math.round(monthlyDebtPaydown),
        netDebtTrend,
        velocityTrend: avgROI > 20 ? 'improving' : avgROI < -10 ? 'declining' : 'stable',
        breakEvenForecast: activeStrategy?.projected_completion_date || null
      },
      recommendations: {
        topROIRefactorings: topROI,
        urgentItems,
        optimalAllocation: {
          refactoringPercent,
          featurePercent: 100 - refactoringPercent,
          explanation: avgComplexity > 60
            ? 'High technical debt requires significant refactoring investment'
            : avgComplexity > 40
              ? 'Moderate debt - balanced approach recommended'
              : 'Healthy codebase - focus on feature delivery'
        }
      },
      simulations: {
        active: activeSimulation,
        alternatives: simulations
          .filter(s => s.id !== activeSimulation?.id)
          .slice(0, 3)
          .map(s => ({
            id: s.id,
            name: s.name,
            roi: s.overall_roi,
            timelineMonths: s.time_horizon_months
          }))
      }
    };
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate economic metrics for a refactoring
 */
function calculateEconomicMetrics(data: Partial<DbRefactoringEconomics>): {
  calculated_cost: number;
  calculated_benefit: number;
  roi_percentage: number;
  payback_months: number;
  net_present_value: number;
  priority_score: number;
} {
  const hours = data.estimated_hours || 0;
  const rate = data.hourly_rate || 100;
  const opportunityCost = data.opportunity_cost_factor ?? 0.5;
  const riskPremium = data.risk_premium ?? 0.1;
  const learningOverhead = data.learning_overhead ?? 0.2;
  const testingOverhead = data.testing_overhead ?? 0.3;

  // Calculate total cost
  const directLabor = hours * rate;
  const overheadTotal = 1 + learningOverhead + testingOverhead;
  const riskAdjusted = 1 + riskPremium;
  const opportunityAdjusted = 1 + opportunityCost;
  const calculated_cost = directLabor * overheadTotal * riskAdjusted * opportunityAdjusted;

  // Calculate benefits (annualized)
  const velocityGain = (data.velocity_improvement || 0) / 100;
  const maintainabilityImprovement = (data.maintainability_score_after || 50) - (data.maintainability_score_before || 50);
  const securityImprovement = (data.security_risk_before || 50) - (data.security_risk_after || 50);
  const bugReduction = (data.bug_probability_before || 0.1) - (data.bug_probability_after || 0.1);
  const complexityReduction = (data.code_complexity_before || 50) - (data.code_complexity_after || 50);

  // Monetize benefits (rough estimates)
  const velocityBenefit = velocityGain * rate * 2000 * 0.1; // 10% of annual developer capacity
  const maintainabilityBenefit = maintainabilityImprovement * 50; // $50 per point improvement
  const securityBenefit = securityImprovement * 200; // $200 per risk point reduction
  const bugBenefit = bugReduction * 2000; // $2000 per expected bug avoided
  const complexityBenefit = complexityReduction * 30; // $30 per complexity point

  const calculated_benefit = velocityBenefit + maintainabilityBenefit + securityBenefit + bugBenefit + complexityBenefit;

  // ROI percentage
  const roi_percentage = calculated_cost > 0 ? ((calculated_benefit - calculated_cost) / calculated_cost) * 100 : 0;

  // Payback months (assuming benefit accrues monthly)
  const monthlyBenefit = calculated_benefit / 12;
  const payback_months = monthlyBenefit > 0 ? calculated_cost / monthlyBenefit : 999;

  // NPV (12 month horizon, 10% discount rate)
  const discountRate = 0.1;
  let npv = -calculated_cost;
  for (let month = 1; month <= 12; month++) {
    npv += monthlyBenefit / Math.pow(1 + discountRate / 12, month);
  }
  const net_present_value = npv;

  // Priority score (0-100 composite)
  let priority_score = 50; // Base
  priority_score += Math.min(25, roi_percentage / 10); // Up to 25 points for ROI
  priority_score += Math.min(15, securityImprovement / 4); // Up to 15 points for security
  priority_score += Math.min(10, complexityReduction / 5); // Up to 10 points for complexity
  priority_score = Math.max(0, Math.min(100, Math.round(priority_score)));

  return {
    calculated_cost: Math.round(calculated_cost * 100) / 100,
    calculated_benefit: Math.round(calculated_benefit * 100) / 100,
    roi_percentage: Math.round(roi_percentage * 10) / 10,
    payback_months: Math.round(payback_months * 10) / 10,
    net_present_value: Math.round(net_present_value * 100) / 100,
    priority_score
  };
}

/**
 * Compute detailed ROI breakdown for display
 */
function computeROIDetails(item: DbRefactoringEconomics): RefactoringWithROI {
  const hours = item.estimated_hours || 0;
  const rate = item.hourly_rate || 100;

  const directLabor = hours * rate;
  const learningCost = directLabor * (item.learning_overhead || 0.2);
  const testingCost = directLabor * (item.testing_overhead || 0.3);
  const riskCost = directLabor * (item.risk_premium || 0.1);
  const opportunityCost = directLabor * (item.opportunity_cost_factor || 0.5);

  const velocityGains = (item.velocity_improvement || 0) / 100 * rate * 2000 * 0.1;
  const bugReduction = ((item.bug_probability_before || 0.1) - (item.bug_probability_after || 0.1)) * 2000;
  const securityImprovement = ((item.security_risk_before || 50) - (item.security_risk_after || 50)) * 200;
  const maintainabilityGains = ((item.maintainability_score_after || 50) - (item.maintainability_score_before || 50)) * 50;

  // Determine ROI category
  let roiCategory: 'excellent' | 'good' | 'marginal' | 'poor' | 'negative' = 'marginal';
  if (item.roi_percentage >= 100) roiCategory = 'excellent';
  else if (item.roi_percentage >= 50) roiCategory = 'good';
  else if (item.roi_percentage >= 0) roiCategory = 'marginal';
  else if (item.roi_percentage >= -50) roiCategory = 'poor';
  else roiCategory = 'negative';

  // Determine urgency
  let urgencyLevel: 'critical' | 'high' | 'medium' | 'low' = 'medium';
  if (item.category === 'security' && item.security_risk_before > 70) urgencyLevel = 'critical';
  else if (item.security_risk_before > 60 || item.code_complexity_before > 80) urgencyLevel = 'high';
  else if (item.code_complexity_before > 60) urgencyLevel = 'medium';
  else urgencyLevel = 'low';

  return {
    ...item,
    costBreakdown: {
      directLabor,
      opportunityCost,
      riskPremium: riskCost,
      learningOverhead: learningCost,
      testingOverhead: testingCost
    },
    benefitBreakdown: {
      velocityGains,
      bugReduction,
      securityImprovement,
      maintainabilityGains
    },
    roiCategory,
    urgencyLevel
  };
}
