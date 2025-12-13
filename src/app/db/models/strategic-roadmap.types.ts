/**
 * Database model types for Strategic Roadmap Engine
 * Predictive 6-month development roadmap with game-theoretic modeling
 */

/**
 * Strategic Initiative - A major development theme spanning multiple quarters
 */
export interface DbStrategicInitiative {
  id: string;
  project_id: string;

  // Basic info
  title: string;
  description: string;

  // Classification
  initiative_type: 'feature' | 'refactoring' | 'debt_reduction' | 'security' | 'performance' | 'infrastructure';
  priority: number; // 1-10

  // Impact scoring
  business_impact_score: number; // 0-100
  technical_impact_score: number; // 0-100
  risk_reduction_score: number; // 0-100
  velocity_impact_score: number; // -100 to +100 (negative = slows down, positive = speeds up)

  // Effort estimation
  estimated_effort_hours: number;
  estimated_complexity: 'trivial' | 'low' | 'medium' | 'high' | 'extreme';

  // Timeline
  target_quarter: string; // e.g., "Q1 2025"
  target_month: number; // 1-6 (which month in the 6-month window)

  // Dependencies
  depends_on: string; // JSON array of initiative IDs
  blocks: string; // JSON array of initiative IDs that depend on this

  // Status
  status: 'proposed' | 'approved' | 'in_progress' | 'completed' | 'deferred' | 'cancelled';
  confidence_score: number; // 0-100

  // Simulation results
  simulated_outcomes: string; // JSON with simulation results

  // Related entities
  related_tech_debt_ids: string; // JSON array of tech debt IDs
  related_goal_ids: string; // JSON array of goal IDs
  related_idea_ids: string; // JSON array of idea IDs

  // Timestamps
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

/**
 * Roadmap Milestone - A quarterly checkpoint with specific targets
 */
export interface DbRoadmapMilestone {
  id: string;
  project_id: string;
  initiative_id: string | null;

  // Basic info
  title: string;
  description: string;

  // Timeline
  target_date: string;
  quarter_index: number; // 1-6 (which quarter in the 6-month window)
  month_index: number; // 1-6

  // Targets
  target_health_score: number; // Target codebase health score
  target_debt_reduction: number; // Target tech debt items to resolve
  target_velocity_improvement: number; // Expected velocity change (%)

  // Metrics (actual vs target)
  actual_health_score: number | null;
  actual_debt_reduction: number | null;
  actual_velocity_change: number | null;

  // Status
  status: 'upcoming' | 'current' | 'achieved' | 'missed' | 'skipped';

  // Key results
  key_results: string; // JSON array of key results

  // Timestamps
  created_at: string;
  updated_at: string;
  achieved_at: string | null;
}

/**
 * Impact Prediction - AI-predicted impact of a potential decision
 */
export interface DbImpactPrediction {
  id: string;
  project_id: string;

  // What we're predicting about
  subject_type: 'initiative' | 'tech_debt' | 'feature' | 'refactoring';
  subject_id: string;

  // Prediction window
  prediction_horizon: '1_month' | '3_months' | '6_months';
  predicted_at: string;

  // Impact scores
  debt_impact: number; // -100 to +100 (positive = reduces debt)
  velocity_impact: number; // -100 to +100 (positive = increases velocity)
  risk_impact: number; // -100 to +100 (positive = reduces risk)
  complexity_impact: number; // -100 to +100 (positive = reduces complexity)

  // Confidence and methodology
  confidence_score: number; // 0-100
  methodology: string; // Description of how prediction was made

  // Game-theoretic analysis
  interactions: string; // JSON array of feature interaction predictions
  nash_equilibrium: string | null; // JSON with equilibrium state if applicable
  pareto_optimal: number; // 0 or 1

  // Simulation data
  simulation_runs: number;
  best_case_outcome: string; // JSON
  worst_case_outcome: string; // JSON
  most_likely_outcome: string; // JSON

  // Outcome tracking (for learning)
  actual_outcome: string | null; // JSON with actual results
  prediction_accuracy: number | null; // 0-100 after outcome measured

  // Timestamps
  created_at: string;
  updated_at: string;
  validated_at: string | null;
}

/**
 * Feature Interaction - Tracks how features interact with each other
 */
export interface DbFeatureInteraction {
  id: string;
  project_id: string;

  // The two features
  feature_a_id: string;
  feature_a_type: 'initiative' | 'idea' | 'tech_debt' | 'goal';
  feature_b_id: string;
  feature_b_type: 'initiative' | 'idea' | 'tech_debt' | 'goal';

  // Interaction type
  interaction_type: 'synergy' | 'conflict' | 'dependency' | 'neutral';
  interaction_strength: number; // 0-100

  // Direction
  is_bidirectional: number; // 0 or 1

  // Impact on each other
  impact_a_on_b: number; // -100 to +100
  impact_b_on_a: number; // -100 to +100

  // Shared resources/files
  shared_files: string; // JSON array of file paths
  shared_contexts: string; // JSON array of context IDs

  // Analysis
  analysis: string;
  recommendations: string; // JSON array of recommendations

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Debt Prevention Rule - Rules to prevent debt before it forms
 */
export interface DbDebtPreventionRule {
  id: string;
  project_id: string;

  // Rule definition
  name: string;
  description: string;

  // What to prevent
  debt_pattern_id: string | null; // Link to existing debt pattern
  target_category: string; // Category of debt to prevent

  // Trigger conditions
  trigger_type: 'file_change' | 'complexity_threshold' | 'dependency_added' | 'pattern_detected';
  trigger_conditions: string; // JSON with specific conditions

  // Prevention action
  action_type: 'warning' | 'suggestion' | 'auto_refactor' | 'block';
  action_template: string; // Template for prevention action

  // Timing
  apply_at: 'pre_commit' | 'on_save' | 'on_scan' | 'scheduled';

  // Effectiveness tracking
  times_triggered: number;
  times_prevented: number;
  estimated_debt_prevented: number;

  // Status
  is_active: number; // 0 or 1

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Velocity Tracking - Historical velocity data for predictions
 */
export interface DbVelocityTracking {
  id: string;
  project_id: string;

  // Time period
  period_start: string;
  period_end: string;
  period_type: 'daily' | 'weekly' | 'monthly';

  // Velocity metrics
  ideas_implemented: number;
  tech_debt_resolved: number;
  features_completed: number;
  refactorings_completed: number;

  // Quality metrics
  bugs_introduced: number;
  bugs_fixed: number;
  test_coverage_change: number;

  // Effort metrics
  total_effort_hours: number;
  effective_effort_hours: number; // Adjusted for rework

  // Health metrics snapshot
  health_score: number;
  debt_score: number;
  complexity_score: number;

  // Timestamps
  created_at: string;
}

/**
 * Roadmap Simulation - Stores simulation runs for comparison
 */
export interface DbRoadmapSimulation {
  id: string;
  project_id: string;

  // Simulation metadata
  name: string;
  description: string;
  simulation_type: 'baseline' | 'optimistic' | 'pessimistic' | 'custom';

  // Input parameters
  input_parameters: string; // JSON with all input parameters

  // Assumptions
  assumptions: string; // JSON array of assumptions made

  // Results
  projected_initiatives: string; // JSON array of initiative outcomes
  projected_milestones: string; // JSON array of milestone outcomes
  projected_health_scores: string; // JSON array of health scores over time
  projected_velocity: string; // JSON array of velocity over time

  // Summary metrics
  total_debt_reduction: number;
  velocity_improvement: number;
  risk_reduction: number;

  // Comparison
  is_selected: number; // 0 or 1 - is this the selected roadmap
  comparison_notes: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
}

// ============================================================================
// AGGREGATED TYPES
// ============================================================================

export interface RoadmapSummary {
  healthScore: number;
  sixMonthProjection: {
    startDate: string;
    endDate: string;
    quarters: {
      quarter: number;
      month: string;
      targetHealthScore: number;
      projectedHealthScore: number;
      initiatives: number;
      milestones: number;
    }[];
  };
  initiatives: {
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    topPriority: DbStrategicInitiative[];
  };
  predictions: {
    velocityTrend: 'increasing' | 'stable' | 'decreasing';
    debtTrend: 'improving' | 'stable' | 'worsening';
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    confidence: number;
  };
  interactions: {
    synergies: number;
    conflicts: number;
    dependencies: number;
  };
}

export interface InitiativeWithPredictions extends DbStrategicInitiative {
  predictions: DbImpactPrediction[];
  interactions: DbFeatureInteraction[];
  milestones: DbRoadmapMilestone[];
}

export type InitiativeType = DbStrategicInitiative['initiative_type'];
export type InitiativeStatus = DbStrategicInitiative['status'];
export type EstimatedComplexity = DbStrategicInitiative['estimated_complexity'];
export type PredictionHorizon = DbImpactPrediction['prediction_horizon'];
export type InteractionType = DbFeatureInteraction['interaction_type'];
export type TriggerType = DbDebtPreventionRule['trigger_type'];
export type ActionType = DbDebtPreventionRule['action_type'];
export type PeriodType = DbVelocityTracking['period_type'];
export type SimulationType = DbRoadmapSimulation['simulation_type'];
