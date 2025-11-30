/**
 * Database model types for Debt Prediction & Prevention System
 * Enables predictive refactoring before technical debt accumulates
 */

/**
 * Learned pattern from historical refactoring data
 * Captures patterns that historically led to technical debt
 */
export interface DbDebtPattern {
  id: string;
  project_id: string;
  name: string;
  description: string;

  // Pattern classification
  pattern_type: 'complexity' | 'duplication' | 'coupling' | 'smell' | 'security' | 'performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string; // e.g., 'circular-dependency', 'god-class', 'feature-envy'

  // Detection rules
  detection_rules: string; // JSON array of detection rule objects
  file_patterns: string; // JSON array of glob patterns this affects
  code_signatures: string; // JSON array of code patterns to match

  // Learning metrics
  occurrence_count: number;
  false_positive_rate: number; // 0.0 - 1.0
  avg_time_to_debt: number; // Days until this becomes problematic
  prevention_success_rate: number; // How often early intervention helped

  // Source tracking
  source: 'learned' | 'predefined' | 'imported';
  learned_from_count: number; // Number of past issues this was learned from

  created_at: string;
  updated_at: string;
}

/**
 * Real-time debt prediction for current code
 */
export interface DbDebtPrediction {
  id: string;
  project_id: string;
  context_id: string | null;

  // Pattern reference
  pattern_id: string | null;

  // Location info
  file_path: string;
  line_start: number;
  line_end: number;
  code_snippet: string; // Relevant code fragment

  // Prediction details
  title: string;
  description: string;
  prediction_type: 'emerging' | 'accelerating' | 'imminent' | 'exists';
  confidence_score: number; // 0-100
  urgency_score: number; // 0-100 (how soon action needed)

  // Trend analysis
  complexity_trend: 'stable' | 'increasing' | 'decreasing';
  complexity_delta: number; // Change since last scan
  velocity: number; // Rate of debt accumulation per day

  // Prevention suggestion
  suggested_action: string;
  micro_refactoring: string | null; // Quick fix suggestion
  estimated_prevention_effort: 'trivial' | 'small' | 'medium' | 'large';
  estimated_cleanup_effort: 'small' | 'medium' | 'large' | 'major'; // If not prevented

  // Status tracking
  status: 'active' | 'dismissed' | 'addressed' | 'escalated';
  dismissed_reason: string | null;
  addressed_at: string | null;

  // Timestamps
  first_detected_at: string;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Tracks code complexity metrics over time for trend analysis
 */
export interface DbComplexityHistory {
  id: string;
  project_id: string;
  file_path: string;

  // Metrics snapshot
  cyclomatic_complexity: number;
  lines_of_code: number;
  dependency_count: number;
  coupling_score: number; // 0-100
  cohesion_score: number; // 0-100

  // Change context
  commit_hash: string | null;
  change_type: 'create' | 'modify' | 'refactor';

  measured_at: string;
  created_at: string;
}

/**
 * Opportunity card for real-time development guidance
 */
export interface DbOpportunityCard {
  id: string;
  project_id: string;
  prediction_id: string;

  // Card display
  card_type: 'prevention' | 'quick-win' | 'warning' | 'suggestion';
  priority: number; // 1-10 (10 = highest)
  title: string;
  summary: string;

  // Action details
  action_type: 'micro-refactor' | 'extract' | 'rename' | 'restructure' | 'review';
  action_description: string;
  estimated_time_minutes: number;

  // Related context
  affected_files: string; // JSON array of file paths
  related_patterns: string; // JSON array of pattern IDs

  // User interaction
  shown_count: number;
  clicked: number; // Boolean (0 or 1)
  acted_upon: number; // Boolean (0 or 1)
  feedback: 'helpful' | 'not-helpful' | 'dismissed' | null;

  // Lifecycle
  expires_at: string | null; // Auto-dismiss after certain time
  created_at: string;
  updated_at: string;
}

/**
 * Prevention action taken by user
 */
export interface DbPreventionAction {
  id: string;
  project_id: string;
  prediction_id: string;
  opportunity_card_id: string | null;

  // Action details
  action_type: 'micro-refactor' | 'full-refactor' | 'dismiss' | 'escalate' | 'defer';
  action_description: string;

  // Metrics
  files_modified: number;
  lines_changed: number;
  time_spent_minutes: number | null;

  // Outcome
  success: number; // Boolean (0 or 1)
  prevented_debt_score: number | null; // Estimated debt points prevented
  user_satisfaction: number | null; // 1-5 rating

  created_at: string;
}

/**
 * Code change event for real-time monitoring
 */
export interface DbCodeChangeEvent {
  id: string;
  project_id: string;
  file_path: string;

  // Change details
  change_type: 'create' | 'modify' | 'delete' | 'rename';
  lines_added: number;
  lines_removed: number;

  // Complexity delta
  complexity_before: number | null;
  complexity_after: number | null;

  // Pattern matches
  patterns_triggered: string; // JSON array of pattern IDs detected
  predictions_created: string; // JSON array of prediction IDs created

  // Context
  commit_hash: string | null;
  author: string | null;

  detected_at: string;
  created_at: string;
}
