/**
 * Migration: Strategic Roadmap Engine Tables
 * Creates tables for predictive 6-month development roadmap with game-theoretic modeling
 */

import { getConnection } from '../drivers';

export function migrate029StrategicRoadmap() {
  const db = getConnection();

  // Strategic Initiatives - Major development themes
  db.exec(`
    CREATE TABLE IF NOT EXISTS strategic_initiatives (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      initiative_type TEXT NOT NULL CHECK (initiative_type IN ('feature', 'refactoring', 'debt_reduction', 'security', 'performance', 'infrastructure')),
      priority INTEGER NOT NULL DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
      business_impact_score INTEGER NOT NULL DEFAULT 50 CHECK (business_impact_score >= 0 AND business_impact_score <= 100),
      technical_impact_score INTEGER NOT NULL DEFAULT 50 CHECK (technical_impact_score >= 0 AND technical_impact_score <= 100),
      risk_reduction_score INTEGER NOT NULL DEFAULT 0 CHECK (risk_reduction_score >= 0 AND risk_reduction_score <= 100),
      velocity_impact_score INTEGER NOT NULL DEFAULT 0 CHECK (velocity_impact_score >= -100 AND velocity_impact_score <= 100),
      estimated_effort_hours INTEGER NOT NULL DEFAULT 0,
      estimated_complexity TEXT NOT NULL CHECK (estimated_complexity IN ('trivial', 'low', 'medium', 'high', 'extreme')) DEFAULT 'medium',
      target_quarter TEXT NOT NULL,
      target_month INTEGER NOT NULL DEFAULT 1 CHECK (target_month >= 1 AND target_month <= 6),
      depends_on TEXT NOT NULL DEFAULT '[]',
      blocks TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL CHECK (status IN ('proposed', 'approved', 'in_progress', 'completed', 'deferred', 'cancelled')) DEFAULT 'proposed',
      confidence_score INTEGER NOT NULL DEFAULT 50 CHECK (confidence_score >= 0 AND confidence_score <= 100),
      simulated_outcomes TEXT NOT NULL DEFAULT '{}',
      related_tech_debt_ids TEXT NOT NULL DEFAULT '[]',
      related_goal_ids TEXT NOT NULL DEFAULT '[]',
      related_idea_ids TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    );
  `);

  // Roadmap Milestones - Quarterly checkpoints
  db.exec(`
    CREATE TABLE IF NOT EXISTS roadmap_milestones (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      initiative_id TEXT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      target_date TEXT NOT NULL,
      quarter_index INTEGER NOT NULL CHECK (quarter_index >= 1 AND quarter_index <= 6),
      month_index INTEGER NOT NULL CHECK (month_index >= 1 AND month_index <= 6),
      target_health_score INTEGER NOT NULL DEFAULT 70 CHECK (target_health_score >= 0 AND target_health_score <= 100),
      target_debt_reduction INTEGER NOT NULL DEFAULT 0,
      target_velocity_improvement INTEGER NOT NULL DEFAULT 0,
      actual_health_score INTEGER,
      actual_debt_reduction INTEGER,
      actual_velocity_change INTEGER,
      status TEXT NOT NULL CHECK (status IN ('upcoming', 'current', 'achieved', 'missed', 'skipped')) DEFAULT 'upcoming',
      key_results TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      achieved_at TEXT,
      FOREIGN KEY (initiative_id) REFERENCES strategic_initiatives(id) ON DELETE SET NULL
    );
  `);

  // Impact Predictions - AI-predicted outcomes
  db.exec(`
    CREATE TABLE IF NOT EXISTS impact_predictions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      subject_type TEXT NOT NULL CHECK (subject_type IN ('initiative', 'tech_debt', 'feature', 'refactoring')),
      subject_id TEXT NOT NULL,
      prediction_horizon TEXT NOT NULL CHECK (prediction_horizon IN ('1_month', '3_months', '6_months')),
      predicted_at TEXT NOT NULL DEFAULT (datetime('now')),
      debt_impact INTEGER NOT NULL DEFAULT 0 CHECK (debt_impact >= -100 AND debt_impact <= 100),
      velocity_impact INTEGER NOT NULL DEFAULT 0 CHECK (velocity_impact >= -100 AND velocity_impact <= 100),
      risk_impact INTEGER NOT NULL DEFAULT 0 CHECK (risk_impact >= -100 AND risk_impact <= 100),
      complexity_impact INTEGER NOT NULL DEFAULT 0 CHECK (complexity_impact >= -100 AND complexity_impact <= 100),
      confidence_score INTEGER NOT NULL DEFAULT 50 CHECK (confidence_score >= 0 AND confidence_score <= 100),
      methodology TEXT NOT NULL DEFAULT '',
      interactions TEXT NOT NULL DEFAULT '[]',
      nash_equilibrium TEXT,
      pareto_optimal INTEGER NOT NULL DEFAULT 0,
      simulation_runs INTEGER NOT NULL DEFAULT 0,
      best_case_outcome TEXT NOT NULL DEFAULT '{}',
      worst_case_outcome TEXT NOT NULL DEFAULT '{}',
      most_likely_outcome TEXT NOT NULL DEFAULT '{}',
      actual_outcome TEXT,
      prediction_accuracy INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      validated_at TEXT
    );
  `);

  // Feature Interactions - How features affect each other
  db.exec(`
    CREATE TABLE IF NOT EXISTS feature_interactions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      feature_a_id TEXT NOT NULL,
      feature_a_type TEXT NOT NULL CHECK (feature_a_type IN ('initiative', 'idea', 'tech_debt', 'goal')),
      feature_b_id TEXT NOT NULL,
      feature_b_type TEXT NOT NULL CHECK (feature_b_type IN ('initiative', 'idea', 'tech_debt', 'goal')),
      interaction_type TEXT NOT NULL CHECK (interaction_type IN ('synergy', 'conflict', 'dependency', 'neutral')),
      interaction_strength INTEGER NOT NULL DEFAULT 50 CHECK (interaction_strength >= 0 AND interaction_strength <= 100),
      is_bidirectional INTEGER NOT NULL DEFAULT 1,
      impact_a_on_b INTEGER NOT NULL DEFAULT 0 CHECK (impact_a_on_b >= -100 AND impact_a_on_b <= 100),
      impact_b_on_a INTEGER NOT NULL DEFAULT 0 CHECK (impact_b_on_a >= -100 AND impact_b_on_a <= 100),
      shared_files TEXT NOT NULL DEFAULT '[]',
      shared_contexts TEXT NOT NULL DEFAULT '[]',
      analysis TEXT NOT NULL DEFAULT '',
      recommendations TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Debt Prevention Rules - Proactive debt prevention
  db.exec(`
    CREATE TABLE IF NOT EXISTS debt_prevention_rules (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      debt_pattern_id TEXT,
      target_category TEXT NOT NULL,
      trigger_type TEXT NOT NULL CHECK (trigger_type IN ('file_change', 'complexity_threshold', 'dependency_added', 'pattern_detected')),
      trigger_conditions TEXT NOT NULL DEFAULT '{}',
      action_type TEXT NOT NULL CHECK (action_type IN ('warning', 'suggestion', 'auto_refactor', 'block')),
      action_template TEXT NOT NULL DEFAULT '',
      apply_at TEXT NOT NULL CHECK (apply_at IN ('pre_commit', 'on_save', 'on_scan', 'scheduled')) DEFAULT 'on_scan',
      times_triggered INTEGER NOT NULL DEFAULT 0,
      times_prevented INTEGER NOT NULL DEFAULT 0,
      estimated_debt_prevented INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (debt_pattern_id) REFERENCES debt_patterns(id) ON DELETE SET NULL
    );
  `);

  // Velocity Tracking - Historical velocity data
  db.exec(`
    CREATE TABLE IF NOT EXISTS velocity_tracking (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
      ideas_implemented INTEGER NOT NULL DEFAULT 0,
      tech_debt_resolved INTEGER NOT NULL DEFAULT 0,
      features_completed INTEGER NOT NULL DEFAULT 0,
      refactorings_completed INTEGER NOT NULL DEFAULT 0,
      bugs_introduced INTEGER NOT NULL DEFAULT 0,
      bugs_fixed INTEGER NOT NULL DEFAULT 0,
      test_coverage_change INTEGER NOT NULL DEFAULT 0,
      total_effort_hours INTEGER NOT NULL DEFAULT 0,
      effective_effort_hours INTEGER NOT NULL DEFAULT 0,
      health_score INTEGER NOT NULL DEFAULT 0,
      debt_score INTEGER NOT NULL DEFAULT 0,
      complexity_score INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Roadmap Simulations - Scenario comparison
  db.exec(`
    CREATE TABLE IF NOT EXISTS roadmap_simulations (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      simulation_type TEXT NOT NULL CHECK (simulation_type IN ('baseline', 'optimistic', 'pessimistic', 'custom')) DEFAULT 'baseline',
      input_parameters TEXT NOT NULL DEFAULT '{}',
      assumptions TEXT NOT NULL DEFAULT '[]',
      projected_initiatives TEXT NOT NULL DEFAULT '[]',
      projected_milestones TEXT NOT NULL DEFAULT '[]',
      projected_health_scores TEXT NOT NULL DEFAULT '[]',
      projected_velocity TEXT NOT NULL DEFAULT '[]',
      total_debt_reduction INTEGER NOT NULL DEFAULT 0,
      velocity_improvement INTEGER NOT NULL DEFAULT 0,
      risk_reduction INTEGER NOT NULL DEFAULT 0,
      is_selected INTEGER NOT NULL DEFAULT 0,
      comparison_notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create indexes for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_strategic_initiatives_project ON strategic_initiatives(project_id);
    CREATE INDEX IF NOT EXISTS idx_strategic_initiatives_status ON strategic_initiatives(status);
    CREATE INDEX IF NOT EXISTS idx_strategic_initiatives_type ON strategic_initiatives(initiative_type);
    CREATE INDEX IF NOT EXISTS idx_strategic_initiatives_quarter ON strategic_initiatives(target_quarter);
    CREATE INDEX IF NOT EXISTS idx_roadmap_milestones_project ON roadmap_milestones(project_id);
    CREATE INDEX IF NOT EXISTS idx_roadmap_milestones_initiative ON roadmap_milestones(initiative_id);
    CREATE INDEX IF NOT EXISTS idx_roadmap_milestones_status ON roadmap_milestones(status);
    CREATE INDEX IF NOT EXISTS idx_impact_predictions_project ON impact_predictions(project_id);
    CREATE INDEX IF NOT EXISTS idx_impact_predictions_subject ON impact_predictions(subject_type, subject_id);
    CREATE INDEX IF NOT EXISTS idx_feature_interactions_project ON feature_interactions(project_id);
    CREATE INDEX IF NOT EXISTS idx_feature_interactions_a ON feature_interactions(feature_a_type, feature_a_id);
    CREATE INDEX IF NOT EXISTS idx_feature_interactions_b ON feature_interactions(feature_b_type, feature_b_id);
    CREATE INDEX IF NOT EXISTS idx_debt_prevention_rules_project ON debt_prevention_rules(project_id);
    CREATE INDEX IF NOT EXISTS idx_debt_prevention_rules_active ON debt_prevention_rules(is_active);
    CREATE INDEX IF NOT EXISTS idx_velocity_tracking_project ON velocity_tracking(project_id);
    CREATE INDEX IF NOT EXISTS idx_velocity_tracking_period ON velocity_tracking(period_start, period_end);
    CREATE INDEX IF NOT EXISTS idx_roadmap_simulations_project ON roadmap_simulations(project_id);
    CREATE INDEX IF NOT EXISTS idx_roadmap_simulations_selected ON roadmap_simulations(is_selected);
  `);
}
