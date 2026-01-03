/**
 * Database model types for Code Health Observatory
 * Extends debt prediction with continuous observation, outcome tracking, and learning
 */

/**
 * Analysis Snapshot - Tracks analysis runs with aggregate metrics
 */
export interface DbAnalysisSnapshot {
  id: string;
  project_id: string;

  // Snapshot timing
  snapshot_type: 'scheduled' | 'triggered' | 'manual' | 'post_execution';
  trigger_source: string | null;

  // Aggregate metrics
  total_files_analyzed: number;
  total_issues_found: number;
  total_predictions_active: number;
  avg_complexity_score: number | null;
  avg_health_score: number | null;

  // Issue breakdown
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;

  // Trend indicators
  health_delta: number | null;
  complexity_delta: number | null;
  issue_velocity: number | null;

  // Processing info
  duration_ms: number | null;
  tokens_used: number | null;
  status: 'running' | 'completed' | 'failed' | 'partial';
  error_message: string | null;

  metadata: string | null; // JSON
  created_at: string;
}

/**
 * Prediction Outcome - Tracks prediction accuracy for learning
 */
export interface DbPredictionOutcome {
  id: string;
  project_id: string;
  prediction_id: string;
  snapshot_id: string | null;

  // Original prediction details
  original_confidence: number;
  original_urgency: number;
  prediction_type: string;
  predicted_severity: string;

  // Outcome classification
  outcome_type:
    | 'confirmed'
    | 'false_positive'
    | 'prevented'
    | 'escalated'
    | 'resolved_naturally'
    | 'still_pending';

  // Accuracy metrics
  time_to_outcome_days: number | null;
  actual_severity: string | null;
  severity_accuracy: number | null;
  timing_accuracy: number | null;

  // Learning data
  pattern_id: string | null;
  contributing_signals: string | null; // JSON array
  user_action_taken: string | null;

  // Feedback
  user_feedback: 'accurate' | 'inaccurate' | 'partially_accurate' | null;
  feedback_notes: string | null;

  created_at: string;
  resolved_at: string | null;
}

/**
 * Execution Outcome - Tracks Claude Code execution results
 */
export interface DbExecutionOutcome {
  id: string;
  project_id: string;
  execution_id: string;
  prediction_id: string | null;

  // Execution context
  execution_type: 'refactor' | 'fix' | 'prevention' | 'enhancement' | 'test' | 'documentation';
  requirement_content: string | null;
  target_files: string | null; // JSON array

  // Pre-execution state
  pre_complexity_scores: string | null; // JSON map
  pre_health_score: number | null;
  pre_issue_count: number | null;

  // Execution results
  success: number; // Boolean 0|1
  files_changed: string | null; // JSON array
  lines_added: number | null;
  lines_removed: number | null;
  execution_duration_ms: number | null;
  tokens_used: number | null;

  // Post-execution state
  post_complexity_scores: string | null; // JSON map
  post_health_score: number | null;
  post_issue_count: number | null;

  // Calculated impacts
  complexity_improvement: number | null;
  health_improvement: number | null;
  issues_resolved: number | null;
  new_issues_introduced: number | null;

  // Outcome assessment
  outcome_rating: 'excellent' | 'good' | 'neutral' | 'poor' | 'failed' | 'pending_review' | null;
  regression_detected: number; // Boolean 0|1
  regression_details: string | null;

  // Learning signals
  successful_patterns: string | null; // JSON array
  failed_patterns: string | null; // JSON array

  // User feedback
  user_accepted: number | null; // Boolean 0|1|null
  user_feedback: string | null;

  created_at: string;
  completed_at: string | null;
}

/**
 * Learned Pattern - Enhanced patterns with auto-fix capabilities
 */
export interface DbLearnedPattern {
  id: string;
  project_id: string | null; // NULL for global patterns
  base_pattern_id: string | null;

  // Pattern identification
  name: string;
  description: string | null;
  pattern_type:
    | 'complexity'
    | 'duplication'
    | 'coupling'
    | 'smell'
    | 'security'
    | 'performance'
    | 'style'
    | 'architecture';
  category: string;

  // Detection configuration
  detection_rules: string; // JSON
  file_patterns: string | null; // JSON array
  code_signatures: string | null; // JSON array

  // Auto-fix capabilities
  has_auto_fix: number; // Boolean 0|1
  auto_fix_template: string | null;
  auto_fix_confidence: number | null;
  auto_fix_risk: 'low' | 'medium' | 'high' | null;
  requires_review: number; // Boolean 0|1

  // Learning metrics
  total_detections: number;
  true_positives: number;
  false_positives: number;
  auto_fixes_attempted: number;
  auto_fixes_successful: number;
  user_overrides: number;

  // Calculated scores
  precision_score: number | null;
  auto_fix_success_rate: number | null;
  confidence_score: number | null;

  // Lifecycle
  status: 'learning' | 'active' | 'deprecated' | 'suspended';
  min_samples_for_auto_fix: number;

  // Source tracking
  source: 'learned' | 'predefined' | 'imported' | 'user_created';
  learned_from_outcomes: string | null; // JSON array

  created_at: string;
  updated_at: string;
}

/**
 * Health Metrics History - Time series for visualizations
 */
export interface DbHealthMetric {
  id: string;
  project_id: string;
  snapshot_id: string | null;

  // Core metrics
  metric_type:
    | 'overall_health'
    | 'complexity'
    | 'test_coverage'
    | 'duplication'
    | 'security'
    | 'performance'
    | 'maintainability';
  metric_value: number;

  // Context
  scope: 'project' | 'context' | 'file';
  scope_id: string | null;

  // Trend data
  previous_value: number | null;
  delta: number | null;
  trend: 'improving' | 'stable' | 'degrading' | null;
  velocity: number | null;

  // Thresholds
  threshold_warning: number | null;
  threshold_critical: number | null;
  status: 'healthy' | 'warning' | 'critical' | null;

  measured_at: string;
  created_at: string;
}

/**
 * Auto-fix Queue - Queue for pending auto-fixes
 */
export interface DbAutoFixItem {
  id: string;
  project_id: string;
  prediction_id: string;
  pattern_id: string;

  // Fix details
  title: string;
  description: string | null;
  target_files: string; // JSON array
  generated_requirement: string;

  // Priority and scheduling
  priority: number;
  urgency_score: number | null;
  confidence_score: number | null;
  estimated_impact: 'low' | 'medium' | 'high' | null;

  // Risk assessment
  risk_level: 'low' | 'medium' | 'high';
  requires_backup: number; // Boolean 0|1
  requires_tests: number; // Boolean 0|1

  // Status tracking
  status: 'pending' | 'approved' | 'executing' | 'completed' | 'failed' | 'rejected' | 'expired';
  approved_by: string | null;
  approved_at: string | null;
  execution_id: string | null;

  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

// ===== Create/Update DTOs =====

export interface CreateAnalysisSnapshot {
  project_id: string;
  snapshot_type: DbAnalysisSnapshot['snapshot_type'];
  trigger_source?: string;
}

export interface UpdateAnalysisSnapshot {
  total_files_analyzed?: number;
  total_issues_found?: number;
  total_predictions_active?: number;
  avg_complexity_score?: number;
  avg_health_score?: number;
  critical_count?: number;
  high_count?: number;
  medium_count?: number;
  low_count?: number;
  health_delta?: number;
  complexity_delta?: number;
  issue_velocity?: number;
  duration_ms?: number;
  tokens_used?: number;
  status?: DbAnalysisSnapshot['status'];
  error_message?: string;
  metadata?: Record<string, unknown>;
}

export interface CreatePredictionOutcome {
  project_id: string;
  prediction_id: string;
  snapshot_id?: string;
  original_confidence: number;
  original_urgency: number;
  prediction_type: string;
  predicted_severity: string;
  outcome_type: DbPredictionOutcome['outcome_type'];
  pattern_id?: string;
  contributing_signals?: string[];
}

export interface CreateExecutionOutcome {
  project_id: string;
  execution_id: string;
  prediction_id?: string;
  execution_type: DbExecutionOutcome['execution_type'];
  requirement_content?: string;
  target_files?: string[];
}

export interface UpdateExecutionOutcome {
  success?: boolean;
  files_changed?: string[];
  lines_added?: number;
  lines_removed?: number;
  execution_duration_ms?: number;
  tokens_used?: number;
  pre_complexity_scores?: Record<string, number>;
  post_complexity_scores?: Record<string, number>;
  pre_health_score?: number;
  post_health_score?: number;
  pre_issue_count?: number;
  post_issue_count?: number;
  complexity_improvement?: number;
  health_improvement?: number;
  issues_resolved?: number;
  new_issues_introduced?: number;
  outcome_rating?: DbExecutionOutcome['outcome_rating'];
  regression_detected?: boolean;
  regression_details?: string;
  successful_patterns?: string[];
  failed_patterns?: string[];
  user_accepted?: boolean;
  user_feedback?: string;
  completed_at?: string;
}

export interface CreateLearnedPattern {
  project_id?: string;
  base_pattern_id?: string;
  name: string;
  description?: string;
  pattern_type: DbLearnedPattern['pattern_type'];
  category: string;
  detection_rules: Record<string, unknown>;
  file_patterns?: string[];
  code_signatures?: string[];
  source: DbLearnedPattern['source'];
}

export interface UpdateLearnedPattern {
  description?: string;
  detection_rules?: Record<string, unknown>;
  file_patterns?: string[];
  code_signatures?: string[];
  has_auto_fix?: boolean;
  auto_fix_template?: string;
  auto_fix_confidence?: number;
  auto_fix_risk?: 'low' | 'medium' | 'high';
  requires_review?: boolean;
  status?: DbLearnedPattern['status'];
}

export interface CreateHealthMetric {
  project_id: string;
  snapshot_id?: string;
  metric_type: DbHealthMetric['metric_type'];
  metric_value: number;
  scope?: DbHealthMetric['scope'];
  scope_id?: string;
  previous_value?: number;
  threshold_warning?: number;
  threshold_critical?: number;
}

export interface CreateAutoFixItem {
  project_id: string;
  prediction_id: string;
  pattern_id: string;
  title: string;
  description?: string;
  target_files: string[];
  generated_requirement: string;
  priority?: number;
  urgency_score?: number;
  confidence_score?: number;
  estimated_impact?: 'low' | 'medium' | 'high';
  risk_level: 'low' | 'medium' | 'high';
  expires_at?: string;
}

export interface UpdateAutoFixItem {
  status?: DbAutoFixItem['status'];
  approved_by?: string;
  approved_at?: string;
  execution_id?: string;
}
