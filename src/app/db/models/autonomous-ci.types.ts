/**
 * Autonomous CI Types
 * Database model types for the autonomous continuous integration feature
 */

// Build status types
export type BuildStatus = 'pending' | 'running' | 'success' | 'failure' | 'cancelled' | 'skipped';

// Pipeline trigger types
export type PipelineTriggerType = 'on_push' | 'on_schedule' | 'manual' | 'webhook' | 'auto';

// Prediction types for AI insights
export type CIPredictionType =
  | 'build_failure'
  | 'flaky_test'
  | 'performance_regression'
  | 'coverage_drop'
  | 'long_build_time'
  | 'dependency_conflict';

// AI analysis frequency options
export type AIAnalysisFrequency = 'on_change' | 'hourly' | 'daily' | 'weekly';

// Flaky test status
export type FlakyTestStatus = 'detected' | 'investigating' | 'fixed' | 'ignored';

// ============================================================================
// DATABASE MODELS
// ============================================================================

/**
 * CI Pipeline - Main configuration for a CI/CD pipeline
 */
export interface DbCIPipeline {
  id: string;
  project_id: string;

  // Basic info
  name: string;
  description: string | null;

  // Configuration
  trigger_type: PipelineTriggerType;
  schedule_cron: string | null;
  branch_patterns: string | null; // JSON array of branch patterns to watch

  // CI/CD metrics
  success_rate: number; // 0-100 percentage
  average_build_time: number; // in milliseconds
  last_build_status: BuildStatus;
  total_builds: number;
  failed_builds: number;
  flaky_tests_count: number;

  // AI Analysis
  ai_analysis: string | null; // JSON with AI insights
  recommended_optimizations: string | null; // JSON array of recommendations
  predicted_next_failure: string | null; // JSON with failure prediction

  // Test coverage tracking
  current_coverage: number | null; // 0-100 percentage
  min_coverage_threshold: number; // minimum required coverage

  // Status
  is_active: number; // 0 or 1 (boolean in SQLite)
  is_self_healing: number; // 0 or 1 - can AI auto-fix issues

  // Timestamps
  created_at: string;
  updated_at: string;
  last_run: string | null;
}

/**
 * Build Execution - Individual build run
 */
export interface DbBuildExecution {
  id: string;
  project_id: string;
  pipeline_id: string;

  build_number: number;
  status: BuildStatus;
  trigger: PipelineTriggerType; // What triggered this build

  // Git info
  commit_sha: string | null;
  branch: string | null;
  commit_message: string | null;
  author: string | null;

  // Timing
  duration_ms: number;
  started_at: string | null;
  completed_at: string | null;

  // Test results
  test_count: number;
  test_passed: number;
  test_failures: number;
  test_skipped: number;
  test_coverage: number | null; // 0-100

  // Performance metrics
  memory_peak_mb: number | null;
  cpu_avg_percent: number | null;

  // AI prediction outcome
  was_predicted_failure: number; // 0 or 1 - Did AI predict this would fail?
  prediction_confidence: number | null; // 0-100

  // Logs and artifacts
  build_log_path: string | null;
  artifacts: string | null; // JSON array of artifact paths
  changed_files: string | null; // JSON array of changed file paths

  // Error details
  error_message: string | null;
  error_type: string | null; // compilation, test, lint, timeout, etc.

  created_at: string;
}

/**
 * CI Prediction - AI-generated predictions about builds
 */
export interface DbCIPrediction {
  id: string;
  project_id: string;
  pipeline_id: string;
  build_id: string | null; // Reference to build if prediction is for specific build

  prediction_type: CIPredictionType;
  confidence_score: number; // 0-100

  // Prediction details
  prediction_data: string; // JSON with type-specific data
  affected_files: string | null; // JSON array of files involved
  estimated_impact: string; // 'low' | 'medium' | 'high' | 'critical'
  recommended_action: string;

  // Validation
  was_correct: number | null; // 0, 1, or null if not yet validated
  actual_outcome: string | null; // What actually happened

  predicted_at: string;
  validated_at: string | null;
}

/**
 * Flaky Test - Tracking flaky tests for self-healing
 */
export interface DbFlakyTest {
  id: string;
  project_id: string;
  pipeline_id: string;

  // Test identification
  test_name: string;
  test_file: string;
  test_suite: string | null;

  // Flakiness metrics
  failure_count: number;
  success_count: number;
  flakiness_score: number; // 0-100 (higher = more flaky)
  consecutive_failures: number;

  // Detection
  first_detected_at: string;
  last_failure_at: string | null;
  last_success_at: string | null;

  // Status and resolution
  status: FlakyTestStatus;
  root_cause: string | null; // AI-detected root cause
  fix_suggestion: string | null; // AI-suggested fix
  auto_fixed: number; // 0 or 1 - was this auto-fixed by AI

  // Error patterns
  error_patterns: string | null; // JSON array of common error messages

  created_at: string;
  updated_at: string;
}

/**
 * CI Config - Project-level CI configuration
 */
export interface DbCIConfig {
  id: string;
  project_id: string;

  // Feature toggles
  enabled: number; // 0 or 1
  auto_optimize: number; // Allow AI to optimize pipeline
  auto_fix_flaky_tests: number; // Allow AI to fix flaky tests
  predictive_testing: number; // Enable test prediction based on changed code
  self_healing: number; // Enable self-healing for build failures

  // AI settings
  ai_analysis_frequency: AIAnalysisFrequency;

  // Thresholds
  min_test_coverage: number; // e.g., 80
  max_build_time_seconds: number;
  failure_rate_threshold: number; // e.g., 5 (percent)
  flakiness_threshold: number; // Score above which test is considered flaky

  // Notification settings
  notify_on_failure: number;
  notify_on_prediction: number;
  notify_on_optimization: number;

  // Configuration JSON
  optimization_rules: string | null; // JSON with custom rules
  excluded_tests: string | null; // JSON array of tests to exclude from flaky detection

  created_at: string;
  updated_at: string;
}

/**
 * Test Coverage Change - Track coverage changes over time
 */
export interface DbTestCoverageChange {
  id: string;
  project_id: string;
  pipeline_id: string;
  build_id: string;

  // Coverage metrics
  line_coverage: number; // 0-100
  branch_coverage: number | null; // 0-100
  function_coverage: number | null; // 0-100
  statement_coverage: number | null; // 0-100

  // Changes
  coverage_delta: number; // Change from previous build
  new_uncovered_lines: string | null; // JSON array of file:line items

  // AI analysis
  coverage_impact_analysis: string | null; // AI analysis of coverage changes

  created_at: string;
}

/**
 * Pipeline Optimization - AI-suggested optimizations
 */
export interface DbPipelineOptimization {
  id: string;
  project_id: string;
  pipeline_id: string;

  // Optimization type
  optimization_type: 'caching' | 'parallelization' | 'test_selection' | 'dependency_pruning' | 'resource_allocation' | 'other';

  // Details
  title: string;
  description: string;
  estimated_time_savings_ms: number;
  estimated_cost_savings: number | null;

  // Implementation
  implementation_details: string | null; // JSON with specific changes
  confidence: number; // 0-100

  // Status
  status: 'suggested' | 'approved' | 'applied' | 'rejected' | 'reverted';
  applied_at: string | null;
  reverted_at: string | null;
  actual_time_savings_ms: number | null; // Measured after application

  created_at: string;
  updated_at: string;
}

// ============================================================================
// AGGREGATED/DISPLAY TYPES (not stored directly in DB)
// ============================================================================

/**
 * Pipeline summary with computed metrics
 */
export interface CIPipelineSummary {
  pipeline: DbCIPipeline;
  latestBuild: DbBuildExecution | null;
  recentBuilds: DbBuildExecution[];
  trend: {
    successRateTrend: number;
    buildTimeTrend: number;
    coverageTrend: number;
  };
  predictions: DbCIPrediction[];
  flakyTests: DbFlakyTest[];
  healthScore: number; // 0-100 computed score
  pendingOptimizations: number;
}

/**
 * Dashboard statistics
 */
export interface CIDashboardStats {
  totalPipelines: number;
  activePipelines: number;
  totalBuilds: number;
  successRate: number;
  averageBuildTime: number;
  flakyTestsCount: number;
  pendingPredictions: number;
  recentFailures: number;
  buildTrend: Array<{
    date: string;
    success: number;
    failure: number;
    total: number;
  }>;
}

/**
 * Build history point for charts
 */
export interface BuildHistoryPoint {
  date: string;
  buildNumber: number;
  status: BuildStatus;
  duration: number;
  coverage: number | null;
}

// ============================================================================
// DEFAULT CONSTANTS
// ============================================================================

export const DEFAULT_CI_CONFIG = {
  enabled: 1,
  auto_optimize: 1,
  auto_fix_flaky_tests: 0, // Off by default for safety
  predictive_testing: 1,
  self_healing: 0, // Off by default for safety
  ai_analysis_frequency: 'on_change' as AIAnalysisFrequency,
  min_test_coverage: 80,
  max_build_time_seconds: 600, // 10 minutes
  failure_rate_threshold: 10, // 10%
  flakiness_threshold: 30, // 30% flaky score
  notify_on_failure: 1,
  notify_on_prediction: 1,
  notify_on_optimization: 1,
} as const;

export const DEFAULT_PIPELINE_CONFIG = {
  trigger_type: 'manual' as PipelineTriggerType,
  success_rate: 100,
  average_build_time: 0,
  last_build_status: 'pending' as BuildStatus,
  total_builds: 0,
  failed_builds: 0,
  flaky_tests_count: 0,
  current_coverage: null,
  min_coverage_threshold: 80,
  is_active: 1,
  is_self_healing: 0,
} as const;

// Status color mapping helper
export const BUILD_STATUS_COLORS: Record<BuildStatus, { bg: string; text: string; border: string }> = {
  pending: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/40' },
  running: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/40' },
  success: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/40' },
  failure: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/40' },
  cancelled: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/40' },
  skipped: { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/40' },
};
