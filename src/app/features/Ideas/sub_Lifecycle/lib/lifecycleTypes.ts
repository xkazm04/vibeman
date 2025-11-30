/**
 * AI-Driven Code Quality Lifecycle Types
 * Defines the state machine, events, and configuration for automated quality lifecycle
 */

import { ScanType } from '../../lib/scanTypes';
import { SupportedProvider } from '@/lib/llm/types';

/**
 * Lifecycle phases representing the automated pipeline stages
 */
export type LifecyclePhase =
  | 'idle'              // Waiting for triggers
  | 'detecting'         // Detecting code changes
  | 'scanning'          // Running AI scans
  | 'resolving'         // AI resolving identified issues
  | 'testing'           // Running automated tests
  | 'validating'        // Validating changes pass quality gates
  | 'deploying'         // Pushing/deploying changes
  | 'completed'         // Cycle completed successfully
  | 'failed';           // Cycle failed at some stage

/**
 * Trigger types that can start a lifecycle cycle
 */
export type LifecycleTrigger =
  | 'code_change'       // File system change detected
  | 'git_push'          // Git push event
  | 'git_commit'        // Git commit event
  | 'scheduled'         // Scheduled interval
  | 'manual'            // User-initiated
  | 'scan_complete'     // Another scan completed
  | 'idea_implemented'; // Idea was implemented

/**
 * Quality gate types for validation
 */
export type QualityGateType =
  | 'type_check'        // TypeScript type checking
  | 'lint'              // ESLint/linting
  | 'unit_test'         // Unit tests
  | 'integration_test'  // Integration tests
  | 'build'             // Build process
  | 'security_scan'     // Security vulnerability scan
  | 'coverage';         // Code coverage threshold

/**
 * Quality gate result
 */
export interface QualityGateResult {
  type: QualityGateType;
  passed: boolean;
  message?: string;
  details?: Record<string, unknown>;
  duration_ms?: number;
}

/**
 * Deployment target types
 */
export type DeploymentTarget =
  | 'local'             // Local environment only
  | 'staging'           // Staging environment
  | 'production'        // Production (with extra safeguards)
  | 'git_branch'        // Push to git branch
  | 'pull_request';     // Create pull request

/**
 * Lifecycle cycle configuration
 */
export interface LifecycleConfig {
  id: string;
  project_id: string;

  // Trigger configuration
  enabled: boolean;
  triggers: LifecycleTrigger[];
  watch_patterns: string[];           // Glob patterns for file watching
  ignore_patterns: string[];          // Patterns to ignore

  // Scan configuration
  scan_types: ScanType[];            // Which scan types to run
  provider: SupportedProvider;        // LLM provider for scans
  max_concurrent_scans: number;       // Max parallel scans

  // Resolution configuration
  auto_resolve: boolean;              // Automatically implement fixes
  max_auto_implementations: number;   // Max fixes per cycle
  require_approval: boolean;          // Require human approval before implementing
  priority_threshold: number;         // Min priority score for auto-resolution (0-100)

  // Quality gates configuration
  quality_gates: QualityGateType[];   // Gates to run
  gate_timeout_ms: number;            // Timeout for each gate
  fail_fast: boolean;                 // Stop on first gate failure

  // Deployment configuration
  auto_deploy: boolean;               // Auto-deploy on success
  deployment_targets: DeploymentTarget[];
  deploy_on_weekend: boolean;         // Allow weekend deployments
  deploy_during_business_hours: boolean;

  // Rate limiting
  min_cycle_interval_ms: number;      // Minimum time between cycles
  cooldown_on_failure_ms: number;     // Cooldown after failed cycle

  // Notifications
  notify_on_success: boolean;
  notify_on_failure: boolean;
  notification_channels: string[];

  created_at: string;
  updated_at: string;
}

/**
 * Default lifecycle configuration
 */
export const DEFAULT_LIFECYCLE_CONFIG: Omit<LifecycleConfig, 'id' | 'project_id' | 'created_at' | 'updated_at'> = {
  enabled: false,
  triggers: ['code_change', 'manual'],
  watch_patterns: ['src/**/*.ts', 'src/**/*.tsx'],
  ignore_patterns: ['node_modules/**', '*.test.ts', '*.spec.ts'],

  scan_types: ['bug_hunter', 'security_protector', 'perf_optimizer'],
  provider: 'gemini',
  max_concurrent_scans: 1,

  auto_resolve: false,
  max_auto_implementations: 3,
  require_approval: true,
  priority_threshold: 70,

  quality_gates: ['type_check', 'lint', 'build'],
  gate_timeout_ms: 300000, // 5 minutes
  fail_fast: true,

  auto_deploy: false,
  deployment_targets: ['local'],
  deploy_on_weekend: false,
  deploy_during_business_hours: true,

  min_cycle_interval_ms: 60000, // 1 minute minimum between cycles
  cooldown_on_failure_ms: 300000, // 5 minute cooldown on failure

  notify_on_success: true,
  notify_on_failure: true,
  notification_channels: [],
};

/**
 * Lifecycle cycle state - represents a single execution of the lifecycle
 */
export interface LifecycleCycle {
  id: string;
  config_id: string;
  project_id: string;

  // Current state
  phase: LifecyclePhase;
  trigger: LifecycleTrigger;
  trigger_metadata?: Record<string, unknown>;

  // Progress tracking
  progress: number;                   // 0-100
  current_step: string;
  total_steps: number;

  // Scan results
  scans_completed: number;
  scans_total: number;
  ideas_generated: number;
  ideas_resolved: number;

  // Quality gate results
  quality_gates_passed: number;
  quality_gates_total: number;
  gate_results: QualityGateResult[];

  // Deployment results
  deployment_status?: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  deployment_details?: Record<string, unknown>;

  // Timing
  started_at: string;
  completed_at?: string;
  duration_ms?: number;

  // Error handling
  error_message?: string;
  error_phase?: LifecyclePhase;
  retry_count: number;

  created_at: string;
  updated_at: string;
}

/**
 * Lifecycle event for history/audit trail
 */
export interface LifecycleEvent {
  id: string;
  cycle_id: string;
  project_id: string;

  event_type: 'phase_change' | 'scan_start' | 'scan_complete' | 'idea_resolved' |
              'gate_start' | 'gate_complete' | 'deploy_start' | 'deploy_complete' |
              'error' | 'warning' | 'info';

  phase: LifecyclePhase;
  message: string;
  details?: Record<string, unknown>;

  created_at: string;
}

/**
 * Lifecycle statistics for dashboard
 */
export interface LifecycleStats {
  project_id: string;

  // Cycle counts
  total_cycles: number;
  successful_cycles: number;
  failed_cycles: number;

  // Phase success rates
  phase_success_rates: Record<LifecyclePhase, number>;

  // Average metrics
  avg_cycle_duration_ms: number;
  avg_ideas_per_cycle: number;
  avg_resolutions_per_cycle: number;

  // Quality gate performance
  gate_pass_rates: Record<QualityGateType, number>;

  // Time series
  cycles_by_day: { date: string; count: number; success: number }[];

  // Trigger distribution
  trigger_counts: Record<LifecycleTrigger, number>;

  last_updated: string;
}

/**
 * Lifecycle orchestrator status
 */
export interface LifecycleOrchestratorStatus {
  is_running: boolean;
  active_cycles: number;
  current_cycle_id?: string;
  current_phase?: LifecyclePhase;
  last_cycle_at?: string;
  next_scheduled_at?: string;
  config: Partial<LifecycleConfig>;
}

/**
 * API request/response types
 */
export interface StartLifecycleRequest {
  project_id: string;
  trigger?: LifecycleTrigger;
  trigger_metadata?: Record<string, unknown>;
  config_overrides?: Partial<LifecycleConfig>;
}

export interface StartLifecycleResponse {
  success: boolean;
  cycle_id?: string;
  message: string;
}

export interface LifecycleConfigUpdateRequest {
  project_id: string;
  config: Partial<LifecycleConfig>;
}

export interface LifecycleCycleResponse {
  cycle: LifecycleCycle;
  events: LifecycleEvent[];
}
