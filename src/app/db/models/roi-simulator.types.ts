/**
 * ROI Simulator Database Types
 * Types for the development economics ROI simulation engine
 */

// ============================================================================
// REFACTORING ECONOMICS
// ============================================================================

/**
 * Represents a refactoring item with economic modeling
 */
export interface DbRefactoringEconomics {
  id: string;
  project_id: string;

  // Source linking (can be tech debt, idea, refactoring package, etc.)
  source_type: 'tech_debt' | 'idea' | 'refactoring_package' | 'manual' | 'opportunity_card';
  source_id: string | null;

  // Basic info
  title: string;
  description: string | null;
  category: RefactoringCategory;

  // Cost modeling (developer time)
  estimated_hours: number; // Developer hours
  hourly_rate: number; // Default hourly rate ($/hour)
  opportunity_cost_factor: number; // 0-2: time not spent on features
  risk_premium: number; // 0-1: risk of failure/rework
  learning_overhead: number; // 0-1: time for context understanding
  testing_overhead: number; // 0-1: additional testing time

  // Benefit modeling
  velocity_improvement: number; // % improvement in dev velocity
  maintainability_score_before: number; // 0-100
  maintainability_score_after: number; // 0-100 (projected)
  security_risk_before: number; // 0-100
  security_risk_after: number; // 0-100 (projected)
  bug_probability_before: number; // 0-1
  bug_probability_after: number; // 0-1 (projected)
  code_complexity_before: number; // 1-100
  code_complexity_after: number; // 1-100 (projected)

  // Economic metrics
  calculated_cost: number; // Total cost in $
  calculated_benefit: number; // Total benefit in $
  roi_percentage: number; // (benefit - cost) / cost * 100
  payback_months: number; // Time to recoup investment
  net_present_value: number; // NPV over 12 months
  priority_score: number; // 0-100 composite score

  // Status tracking
  status: 'proposed' | 'approved' | 'in_progress' | 'completed' | 'rejected' | 'deferred';
  confidence_level: number; // 0-100 confidence in estimates

  // Timestamps
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export type RefactoringCategory =
  | 'performance'
  | 'security'
  | 'maintainability'
  | 'scalability'
  | 'code_quality'
  | 'architecture'
  | 'testing'
  | 'documentation'
  | 'dependency'
  | 'infrastructure';

// ============================================================================
// ROI SIMULATIONS
// ============================================================================

/**
 * Represents a simulation scenario for ROI analysis
 */
export interface DbROISimulation {
  id: string;
  project_id: string;

  // Simulation info
  name: string;
  description: string | null;
  simulation_type: 'baseline' | 'aggressive' | 'conservative' | 'custom' | 'optimal';

  // Input parameters
  time_horizon_months: number; // Simulation duration
  discount_rate: number; // Annual discount rate for NPV
  team_size: number;
  average_hourly_rate: number;
  feature_velocity_baseline: number; // Features/month baseline
  current_health_score: number;
  current_debt_score: number;

  // Selected refactorings for this simulation
  selected_refactoring_ids: string; // JSON array of IDs
  total_investment: number;

  // Simulated outcomes
  projected_velocity: string; // JSON array of monthly velocity projections
  projected_health_scores: string; // JSON array of monthly health projections
  projected_debt_scores: string; // JSON array of monthly debt projections
  cumulative_roi: string; // JSON array of cumulative ROI by month

  // Summary metrics
  total_cost: number;
  total_benefit: number;
  overall_roi: number;
  break_even_month: number | null;
  final_velocity_improvement: number;
  final_health_improvement: number;

  // Comparison
  is_selected: number; // SQLite boolean (0 or 1)
  comparison_notes: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
}

// ============================================================================
// PORTFOLIO OPTIMIZATION
// ============================================================================

/**
 * Represents an optimized portfolio of refactorings
 */
export interface DbPortfolioOptimization {
  id: string;
  project_id: string;

  // Optimization info
  name: string;
  optimization_type: 'max_roi' | 'max_velocity' | 'min_risk' | 'balanced' | 'pareto';
  budget_constraint: number; // Max hours to spend
  time_constraint_months: number; // Max time to complete all

  // Optimization results
  selected_items: string; // JSON array of { id, order, allocation }
  total_allocated_hours: number;
  expected_roi: number;
  expected_velocity_gain: number;
  expected_risk_reduction: number;

  // Pareto frontier data (for multi-objective optimization)
  pareto_frontier: string; // JSON array of alternative optimal solutions
  trade_off_analysis: string; // JSON object describing trade-offs

  // Constraints used
  constraints_used: string; // JSON object of constraints
  optimization_algorithm: string;

  // Status
  status: 'computing' | 'ready' | 'applied' | 'expired';

  // Timestamps
  created_at: string;
  updated_at: string;
}

// ============================================================================
// VELOCITY PREDICTIONS
// ============================================================================

/**
 * Velocity prediction based on technical decisions
 */
export interface DbVelocityPrediction {
  id: string;
  project_id: string;

  // Prediction context
  prediction_date: string;
  horizon_months: number;

  // Input factors
  current_velocity: number;
  current_debt_level: number;
  planned_refactorings: string; // JSON array of refactoring IDs
  planned_features: string; // JSON array of feature IDs
  team_capacity_hours: number;

  // Game theoretic analysis
  scenario_type: 'all_refactor' | 'all_feature' | 'balanced' | 'debt_first' | 'feature_first';
  nash_equilibrium_score: number; // 0-100 stability score
  optimal_allocation: string; // JSON object { refactor_pct, feature_pct }

  // Predictions
  predicted_velocity_trend: string; // JSON array of velocity by month
  predicted_debt_trend: string; // JSON array of debt by month
  confidence_interval_low: string; // JSON array
  confidence_interval_high: string; // JSON array

  // Risk factors
  velocity_at_risk: number; // VaR-style metric
  worst_case_velocity: number;
  best_case_velocity: number;

  // Actual outcomes (filled in later)
  actual_velocity: string | null; // JSON array of actual velocity
  actual_debt: string | null; // JSON array of actual debt
  prediction_accuracy: number | null; // 0-100

  // Timestamps
  created_at: string;
  validated_at: string | null;
}

// ============================================================================
// TECHNICAL DEBT PAYDOWN STRATEGIES
// ============================================================================

/**
 * Game-theoretic debt paydown strategy
 */
export interface DbDebtPaydownStrategy {
  id: string;
  project_id: string;

  // Strategy info
  name: string;
  description: string | null;
  strategy_type: 'snowball' | 'avalanche' | 'highest_roi' | 'highest_risk' | 'balanced' | 'custom';

  // Debt items included
  debt_items: string; // JSON array of { id, source_type, priority, order }
  total_debt_hours: number;
  total_debt_cost: number;

  // Strategy parameters
  monthly_capacity_hours: number;
  paydown_aggressiveness: number; // 0-1: % of capacity for debt
  feature_pressure: number; // 0-1: external feature demand

  // Projected outcomes
  paydown_schedule: string; // JSON array of monthly paydown plans
  projected_completion_date: string | null;
  projected_roi_curve: string; // JSON array of cumulative ROI over time

  // Game theory metrics
  equilibrium_debt_level: number; // Sustainable debt level
  debt_accumulation_rate: number; // Rate at which new debt appears
  net_paydown_rate: number; // Net debt reduction per month

  // Status
  status: 'draft' | 'active' | 'completed' | 'abandoned';
  is_active: number; // SQLite boolean (0 or 1)

  // Timestamps
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

// ============================================================================
// ECONOMIC EVENTS (for tracking actual costs/benefits)
// ============================================================================

/**
 * Tracks actual economic events for ROI validation
 */
export interface DbEconomicEvent {
  id: string;
  project_id: string;

  // Event info
  event_type: 'cost' | 'benefit' | 'risk_realized' | 'risk_avoided';
  source_type: 'refactoring' | 'bug_fix' | 'incident' | 'feature' | 'maintenance';
  source_id: string | null;

  // Economic value
  amount: number; // Dollar value (positive for benefit, negative for cost)
  hours_spent: number | null;
  hourly_rate_used: number | null;

  // Description
  title: string;
  description: string | null;

  // Attribution
  attributed_to_refactoring_id: string | null; // If this event is result of a refactoring

  // Timestamps
  event_date: string;
  created_at: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Per-project ROI configuration
 */
export interface DbROIConfig {
  id: string;
  project_id: string;

  // Rate settings
  default_hourly_rate: number;
  overhead_multiplier: number; // Includes management, meetings, etc.
  risk_free_rate: number; // For NPV calculations

  // Value settings
  bug_fix_cost_average: number;
  incident_cost_average: number;
  security_incident_cost: number;
  developer_onboarding_cost: number;
  feature_delay_cost_per_day: number;

  // Velocity baselines
  baseline_velocity: number;
  velocity_measurement: 'features' | 'story_points' | 'tasks' | 'lines_changed';

  // Scoring weights
  roi_weight: number;
  velocity_weight: number;
  risk_weight: number;
  maintainability_weight: number;

  // Timestamps
  created_at: string;
  updated_at: string;
}

// ============================================================================
// SUMMARY TYPES
// ============================================================================

/**
 * Dashboard summary for ROI Simulator
 */
export interface ROISimulatorSummary {
  projectId: string;

  // Current portfolio status
  portfolio: {
    totalRefactorings: number;
    totalInvestment: number;
    totalExpectedBenefit: number;
    averageROI: number;
    byCategory: Record<RefactoringCategory, { count: number; investment: number; roi: number }>;
    byStatus: Record<string, number>;
  };

  // Economic health
  economics: {
    currentDebtCost: number;
    monthlyDebtAccumulation: number;
    monthlyDebtPaydown: number;
    netDebtTrend: 'increasing' | 'stable' | 'decreasing';
    velocityTrend: 'improving' | 'stable' | 'declining';
    breakEvenForecast: string | null; // Date when debt is paid off at current rate
  };

  // Recommendations
  recommendations: {
    topROIRefactorings: Array<{
      id: string;
      title: string;
      roi: number;
      paybackMonths: number;
    }>;
    urgentItems: Array<{
      id: string;
      title: string;
      reason: string;
    }>;
    optimalAllocation: {
      refactoringPercent: number;
      featurePercent: number;
      explanation: string;
    };
  };

  // Simulation comparison
  simulations: {
    active: DbROISimulation | null;
    alternatives: Array<{
      id: string;
      name: string;
      roi: number;
      timelineMonths: number;
    }>;
  };
}

/**
 * Refactoring item with calculated economic metrics
 */
export interface RefactoringWithROI extends DbRefactoringEconomics {
  // Computed fields for UI
  costBreakdown: {
    directLabor: number;
    opportunityCost: number;
    riskPremium: number;
    learningOverhead: number;
    testingOverhead: number;
  };
  benefitBreakdown: {
    velocityGains: number;
    bugReduction: number;
    securityImprovement: number;
    maintainabilityGains: number;
  };
  roiCategory: 'excellent' | 'good' | 'marginal' | 'poor' | 'negative';
  urgencyLevel: 'critical' | 'high' | 'medium' | 'low';
}
