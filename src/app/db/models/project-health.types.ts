/**
 * Project Health Score Types
 * Database model types for the health score dashboard feature
 */

// Health score status levels
export type HealthScoreStatus = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

// Health score categories (dimensions measured)
export type HealthScoreCategory =
  | 'idea_backlog'
  | 'tech_debt'
  | 'security'
  | 'test_coverage'
  | 'goal_completion'
  | 'code_quality';

// Database model for individual health score snapshots
export interface DbProjectHealth {
  id: string;
  project_id: string;
  overall_score: number; // 0-100
  status: HealthScoreStatus;
  category_scores: string; // JSON string of CategoryScores
  trend: number; // percentage change from previous
  trend_direction: 'up' | 'down' | 'stable';
  ai_explanation: string | null; // AI-generated explanation of score changes
  ai_recommendation: string | null; // AI-suggested focus area
  created_at: string;
}

// Parsed category scores structure
export interface CategoryScores {
  idea_backlog: CategoryScore;
  tech_debt: CategoryScore;
  security: CategoryScore;
  test_coverage: CategoryScore;
  goal_completion: CategoryScore;
  code_quality: CategoryScore;
}

// Individual category score
export interface CategoryScore {
  score: number; // 0-100
  weight: number; // Contribution weight to overall score
  trend: number; // Change from previous measurement
  issues_count?: number; // Number of issues in this category
  details?: string; // Additional context
}

// Health score history for trend analysis
export interface DbProjectHealthHistory {
  id: string;
  project_id: string;
  health_id: string; // Reference to project_health record
  overall_score: number;
  category_scores: string; // JSON string
  recorded_at: string;
}

// Health score configuration per project
export interface DbHealthScoreConfig {
  id: string;
  project_id: string;
  enabled: number; // Boolean (0 or 1)
  auto_calculate: number; // Boolean - auto-recalculate on changes
  calculation_frequency: 'on_change' | 'hourly' | 'daily';
  category_weights: string; // JSON string of weight configuration
  thresholds: string; // JSON string of threshold configuration
  created_at: string;
  updated_at: string;
}

// Category weight configuration
export interface CategoryWeightConfig {
  idea_backlog: number; // 0-1
  tech_debt: number; // 0-1
  security: number; // 0-1
  test_coverage: number; // 0-1
  goal_completion: number; // 0-1
  code_quality: number; // 0-1
}

// Status threshold configuration
export interface StatusThresholdConfig {
  excellent: number; // e.g., 90+
  good: number; // e.g., 70+
  fair: number; // e.g., 50+
  poor: number; // e.g., 30+
  // Below poor is critical
}

// Default category weights
export const DEFAULT_CATEGORY_WEIGHTS: CategoryWeightConfig = {
  idea_backlog: 0.15,
  tech_debt: 0.25,
  security: 0.20,
  test_coverage: 0.15,
  goal_completion: 0.15,
  code_quality: 0.10,
};

// Default status thresholds
export const DEFAULT_STATUS_THRESHOLDS: StatusThresholdConfig = {
  excellent: 85,
  good: 70,
  fair: 50,
  poor: 30,
};

// Statistics summary for dashboard
export interface HealthScoreStats {
  currentScore: number;
  previousScore: number | null;
  trend: number;
  trendDirection: 'up' | 'down' | 'stable';
  status: HealthScoreStatus;
  categoryBreakdown: CategoryScores;
  historyData: HealthHistoryPoint[];
  lastCalculated: string | null;
  topIssue: {
    category: HealthScoreCategory;
    score: number;
    recommendation: string;
  } | null;
}

// History point for trend charts
export interface HealthHistoryPoint {
  date: string;
  score: number;
  status: HealthScoreStatus;
}

// API response types
export interface HealthScoreCalculationResult {
  health: DbProjectHealth;
  stats: HealthScoreStats;
  aiInsights?: {
    explanation: string;
    recommendation: string;
    focusArea: HealthScoreCategory;
  };
}
