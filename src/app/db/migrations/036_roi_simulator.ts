/**
 * Migration 036: Create ROI Simulator tables
 * Tables for development economics ROI simulation engine
 */

import { getConnection } from '../drivers';
import { createTableIfNotExists, safeMigration, type MigrationLogger } from './migration.utils';

export function migrateROISimulatorTables(migrationLogger: MigrationLogger) {
  const db = getConnection();

  // Create refactoring_economics table
  safeMigration('refactoringEconomicsTable', () => {
    const created = createTableIfNotExists(db, 'refactoring_economics', `
      CREATE TABLE refactoring_economics (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,

        -- Source linking
        source_type TEXT NOT NULL DEFAULT 'manual' CHECK (source_type IN (
          'tech_debt', 'idea', 'refactoring_package', 'manual', 'opportunity_card'
        )),
        source_id TEXT,

        -- Basic info
        title TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL DEFAULT 'code_quality' CHECK (category IN (
          'performance', 'security', 'maintainability', 'scalability',
          'code_quality', 'architecture', 'testing', 'documentation',
          'dependency', 'infrastructure'
        )),

        -- Cost modeling
        estimated_hours REAL NOT NULL DEFAULT 0,
        hourly_rate REAL NOT NULL DEFAULT 100,
        opportunity_cost_factor REAL NOT NULL DEFAULT 0.5,
        risk_premium REAL NOT NULL DEFAULT 0.1,
        learning_overhead REAL NOT NULL DEFAULT 0.2,
        testing_overhead REAL NOT NULL DEFAULT 0.3,

        -- Benefit modeling
        velocity_improvement REAL NOT NULL DEFAULT 0,
        maintainability_score_before INTEGER NOT NULL DEFAULT 50,
        maintainability_score_after INTEGER NOT NULL DEFAULT 50,
        security_risk_before INTEGER NOT NULL DEFAULT 50,
        security_risk_after INTEGER NOT NULL DEFAULT 50,
        bug_probability_before REAL NOT NULL DEFAULT 0.1,
        bug_probability_after REAL NOT NULL DEFAULT 0.1,
        code_complexity_before INTEGER NOT NULL DEFAULT 50,
        code_complexity_after INTEGER NOT NULL DEFAULT 50,

        -- Economic metrics (calculated)
        calculated_cost REAL NOT NULL DEFAULT 0,
        calculated_benefit REAL NOT NULL DEFAULT 0,
        roi_percentage REAL NOT NULL DEFAULT 0,
        payback_months REAL NOT NULL DEFAULT 0,
        net_present_value REAL NOT NULL DEFAULT 0,
        priority_score INTEGER NOT NULL DEFAULT 50,

        -- Status
        status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN (
          'proposed', 'approved', 'in_progress', 'completed', 'rejected', 'deferred'
        )),
        confidence_level INTEGER NOT NULL DEFAULT 50 CHECK (confidence_level >= 0 AND confidence_level <= 100),

        -- Timestamps
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        completed_at TEXT
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_refactoring_economics_project ON refactoring_economics(project_id);
        CREATE INDEX idx_refactoring_economics_source ON refactoring_economics(source_type, source_id);
        CREATE INDEX idx_refactoring_economics_status ON refactoring_economics(status);
        CREATE INDEX idx_refactoring_economics_category ON refactoring_economics(category);
        CREATE INDEX idx_refactoring_economics_roi ON refactoring_economics(roi_percentage DESC);
        CREATE INDEX idx_refactoring_economics_priority ON refactoring_economics(priority_score DESC);
      `);
      migrationLogger.info('refactoring_economics table created successfully');
    }
  }, migrationLogger);

  // Create roi_simulations table
  safeMigration('roiSimulationsTable', () => {
    const created = createTableIfNotExists(db, 'roi_simulations', `
      CREATE TABLE roi_simulations (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,

        -- Simulation info
        name TEXT NOT NULL,
        description TEXT,
        simulation_type TEXT NOT NULL DEFAULT 'baseline' CHECK (simulation_type IN (
          'baseline', 'aggressive', 'conservative', 'custom', 'optimal'
        )),

        -- Input parameters
        time_horizon_months INTEGER NOT NULL DEFAULT 12,
        discount_rate REAL NOT NULL DEFAULT 0.1,
        team_size INTEGER NOT NULL DEFAULT 5,
        average_hourly_rate REAL NOT NULL DEFAULT 100,
        feature_velocity_baseline REAL NOT NULL DEFAULT 5,
        current_health_score INTEGER NOT NULL DEFAULT 50,
        current_debt_score INTEGER NOT NULL DEFAULT 50,

        -- Selected refactorings
        selected_refactoring_ids TEXT NOT NULL DEFAULT '[]',
        total_investment REAL NOT NULL DEFAULT 0,

        -- Simulated outcomes
        projected_velocity TEXT NOT NULL DEFAULT '[]',
        projected_health_scores TEXT NOT NULL DEFAULT '[]',
        projected_debt_scores TEXT NOT NULL DEFAULT '[]',
        cumulative_roi TEXT NOT NULL DEFAULT '[]',

        -- Summary metrics
        total_cost REAL NOT NULL DEFAULT 0,
        total_benefit REAL NOT NULL DEFAULT 0,
        overall_roi REAL NOT NULL DEFAULT 0,
        break_even_month INTEGER,
        final_velocity_improvement REAL NOT NULL DEFAULT 0,
        final_health_improvement REAL NOT NULL DEFAULT 0,

        -- Comparison
        is_selected INTEGER NOT NULL DEFAULT 0,
        comparison_notes TEXT,

        -- Timestamps
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_roi_simulations_project ON roi_simulations(project_id);
        CREATE INDEX idx_roi_simulations_type ON roi_simulations(simulation_type);
        CREATE INDEX idx_roi_simulations_selected ON roi_simulations(project_id, is_selected);
        CREATE INDEX idx_roi_simulations_roi ON roi_simulations(overall_roi DESC);
      `);
      migrationLogger.info('roi_simulations table created successfully');
    }
  }, migrationLogger);

  // Create portfolio_optimizations table
  safeMigration('portfolioOptimizationsTable', () => {
    const created = createTableIfNotExists(db, 'portfolio_optimizations', `
      CREATE TABLE portfolio_optimizations (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,

        -- Optimization info
        name TEXT NOT NULL,
        optimization_type TEXT NOT NULL DEFAULT 'balanced' CHECK (optimization_type IN (
          'max_roi', 'max_velocity', 'min_risk', 'balanced', 'pareto'
        )),
        budget_constraint REAL NOT NULL DEFAULT 0,
        time_constraint_months INTEGER NOT NULL DEFAULT 12,

        -- Results
        selected_items TEXT NOT NULL DEFAULT '[]',
        total_allocated_hours REAL NOT NULL DEFAULT 0,
        expected_roi REAL NOT NULL DEFAULT 0,
        expected_velocity_gain REAL NOT NULL DEFAULT 0,
        expected_risk_reduction REAL NOT NULL DEFAULT 0,

        -- Pareto data
        pareto_frontier TEXT NOT NULL DEFAULT '[]',
        trade_off_analysis TEXT NOT NULL DEFAULT '{}',

        -- Constraints
        constraints_used TEXT NOT NULL DEFAULT '{}',
        optimization_algorithm TEXT NOT NULL DEFAULT 'greedy',

        -- Status
        status TEXT NOT NULL DEFAULT 'computing' CHECK (status IN (
          'computing', 'ready', 'applied', 'expired'
        )),

        -- Timestamps
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_portfolio_optimizations_project ON portfolio_optimizations(project_id);
        CREATE INDEX idx_portfolio_optimizations_type ON portfolio_optimizations(optimization_type);
        CREATE INDEX idx_portfolio_optimizations_status ON portfolio_optimizations(status);
      `);
      migrationLogger.info('portfolio_optimizations table created successfully');
    }
  }, migrationLogger);

  // Create velocity_predictions table
  safeMigration('velocityPredictionsTable', () => {
    const created = createTableIfNotExists(db, 'velocity_predictions', `
      CREATE TABLE velocity_predictions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,

        -- Prediction context
        prediction_date TEXT NOT NULL DEFAULT (datetime('now')),
        horizon_months INTEGER NOT NULL DEFAULT 6,

        -- Input factors
        current_velocity REAL NOT NULL DEFAULT 0,
        current_debt_level REAL NOT NULL DEFAULT 0,
        planned_refactorings TEXT NOT NULL DEFAULT '[]',
        planned_features TEXT NOT NULL DEFAULT '[]',
        team_capacity_hours REAL NOT NULL DEFAULT 0,

        -- Game theoretic analysis
        scenario_type TEXT NOT NULL DEFAULT 'balanced' CHECK (scenario_type IN (
          'all_refactor', 'all_feature', 'balanced', 'debt_first', 'feature_first'
        )),
        nash_equilibrium_score INTEGER NOT NULL DEFAULT 50,
        optimal_allocation TEXT NOT NULL DEFAULT '{}',

        -- Predictions
        predicted_velocity_trend TEXT NOT NULL DEFAULT '[]',
        predicted_debt_trend TEXT NOT NULL DEFAULT '[]',
        confidence_interval_low TEXT NOT NULL DEFAULT '[]',
        confidence_interval_high TEXT NOT NULL DEFAULT '[]',

        -- Risk metrics
        velocity_at_risk REAL NOT NULL DEFAULT 0,
        worst_case_velocity REAL NOT NULL DEFAULT 0,
        best_case_velocity REAL NOT NULL DEFAULT 0,

        -- Actual outcomes
        actual_velocity TEXT,
        actual_debt TEXT,
        prediction_accuracy INTEGER,

        -- Timestamps
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        validated_at TEXT
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_velocity_predictions_project ON velocity_predictions(project_id);
        CREATE INDEX idx_velocity_predictions_date ON velocity_predictions(prediction_date DESC);
        CREATE INDEX idx_velocity_predictions_scenario ON velocity_predictions(scenario_type);
      `);
      migrationLogger.info('velocity_predictions table created successfully');
    }
  }, migrationLogger);

  // Create debt_paydown_strategies table
  safeMigration('debtPaydownStrategiesTable', () => {
    const created = createTableIfNotExists(db, 'debt_paydown_strategies', `
      CREATE TABLE debt_paydown_strategies (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,

        -- Strategy info
        name TEXT NOT NULL,
        description TEXT,
        strategy_type TEXT NOT NULL DEFAULT 'balanced' CHECK (strategy_type IN (
          'snowball', 'avalanche', 'highest_roi', 'highest_risk', 'balanced', 'custom'
        )),

        -- Debt items
        debt_items TEXT NOT NULL DEFAULT '[]',
        total_debt_hours REAL NOT NULL DEFAULT 0,
        total_debt_cost REAL NOT NULL DEFAULT 0,

        -- Parameters
        monthly_capacity_hours REAL NOT NULL DEFAULT 0,
        paydown_aggressiveness REAL NOT NULL DEFAULT 0.3,
        feature_pressure REAL NOT NULL DEFAULT 0.5,

        -- Projected outcomes
        paydown_schedule TEXT NOT NULL DEFAULT '[]',
        projected_completion_date TEXT,
        projected_roi_curve TEXT NOT NULL DEFAULT '[]',

        -- Game theory metrics
        equilibrium_debt_level REAL NOT NULL DEFAULT 0,
        debt_accumulation_rate REAL NOT NULL DEFAULT 0,
        net_paydown_rate REAL NOT NULL DEFAULT 0,

        -- Status
        status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
          'draft', 'active', 'completed', 'abandoned'
        )),
        is_active INTEGER NOT NULL DEFAULT 0,

        -- Timestamps
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        completed_at TEXT
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_debt_paydown_strategies_project ON debt_paydown_strategies(project_id);
        CREATE INDEX idx_debt_paydown_strategies_type ON debt_paydown_strategies(strategy_type);
        CREATE INDEX idx_debt_paydown_strategies_status ON debt_paydown_strategies(status);
        CREATE INDEX idx_debt_paydown_strategies_active ON debt_paydown_strategies(project_id, is_active);
      `);
      migrationLogger.info('debt_paydown_strategies table created successfully');
    }
  }, migrationLogger);

  // Create economic_events table
  safeMigration('economicEventsTable', () => {
    const created = createTableIfNotExists(db, 'economic_events', `
      CREATE TABLE economic_events (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,

        -- Event info
        event_type TEXT NOT NULL CHECK (event_type IN (
          'cost', 'benefit', 'risk_realized', 'risk_avoided'
        )),
        source_type TEXT NOT NULL DEFAULT 'refactoring' CHECK (source_type IN (
          'refactoring', 'bug_fix', 'incident', 'feature', 'maintenance'
        )),
        source_id TEXT,

        -- Economic value
        amount REAL NOT NULL DEFAULT 0,
        hours_spent REAL,
        hourly_rate_used REAL,

        -- Description
        title TEXT NOT NULL,
        description TEXT,

        -- Attribution
        attributed_to_refactoring_id TEXT,

        -- Timestamps
        event_date TEXT NOT NULL DEFAULT (datetime('now')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),

        FOREIGN KEY (attributed_to_refactoring_id) REFERENCES refactoring_economics(id) ON DELETE SET NULL
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_economic_events_project ON economic_events(project_id);
        CREATE INDEX idx_economic_events_type ON economic_events(event_type);
        CREATE INDEX idx_economic_events_source ON economic_events(source_type, source_id);
        CREATE INDEX idx_economic_events_date ON economic_events(event_date DESC);
        CREATE INDEX idx_economic_events_refactoring ON economic_events(attributed_to_refactoring_id);
      `);
      migrationLogger.info('economic_events table created successfully');
    }
  }, migrationLogger);

  // Create roi_config table
  safeMigration('roiConfigTable', () => {
    const created = createTableIfNotExists(db, 'roi_config', `
      CREATE TABLE roi_config (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL UNIQUE,

        -- Rate settings
        default_hourly_rate REAL NOT NULL DEFAULT 100,
        overhead_multiplier REAL NOT NULL DEFAULT 1.3,
        risk_free_rate REAL NOT NULL DEFAULT 0.05,

        -- Value settings
        bug_fix_cost_average REAL NOT NULL DEFAULT 2000,
        incident_cost_average REAL NOT NULL DEFAULT 10000,
        security_incident_cost REAL NOT NULL DEFAULT 50000,
        developer_onboarding_cost REAL NOT NULL DEFAULT 15000,
        feature_delay_cost_per_day REAL NOT NULL DEFAULT 500,

        -- Velocity baselines
        baseline_velocity REAL NOT NULL DEFAULT 5,
        velocity_measurement TEXT NOT NULL DEFAULT 'features',

        -- Scoring weights
        roi_weight REAL NOT NULL DEFAULT 0.4,
        velocity_weight REAL NOT NULL DEFAULT 0.25,
        risk_weight REAL NOT NULL DEFAULT 0.2,
        maintainability_weight REAL NOT NULL DEFAULT 0.15,

        -- Timestamps
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `, migrationLogger);

    if (created) {
      db.exec(`
        CREATE INDEX idx_roi_config_project ON roi_config(project_id);
      `);
      migrationLogger.info('roi_config table created successfully');
    }
  }, migrationLogger);

  migrationLogger.success('ROI Simulator tables created successfully');
}
