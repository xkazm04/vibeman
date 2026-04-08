/**
 * Brain 2.0 Type Definitions
 * Types for behavioral learning and autonomous reflection system
 */

// Import and re-export canonical signal type from centralized source
import type { BehavioralSignalType } from '@/types/signals';
export type { BehavioralSignalType };

// Reflection trigger types
export type ReflectionTriggerType = 'threshold' | 'scheduled' | 'manual';

// Reflection status (narrowed from unified StatusAlgebra)
import type { BaseLifecycleStatus } from '@/lib/status';
export type ReflectionStatus = BaseLifecycleStatus;

// Reflection scope
export type ReflectionScope = 'project' | 'global';

/**
 * Behavioral Signal - tracks user activity patterns
 */
export interface DbBehavioralSignal {
  id: string;
  project_id: string;
  signal_type: BehavioralSignalType;
  context_id: string | null;
  context_name: string | null;
  data: string; // JSON payload
  weight: number;
  timestamp: string;
  created_at: string;
  decay_applied_at: string | null;
  cluster_id: string | null;
}

/**
 * Signal data payloads by type
 */
export interface GitActivitySignalData {
  filesChanged: string[];
  commitMessage: string;
  linesAdded: number;
  linesRemoved: number;
  branch: string;
  commitSha?: string;
}

export interface ApiFocusSignalData {
  endpoint: string;
  method: string;
  callCount: number;
  avgResponseTime: number;
  errorRate: number;
}

export interface ContextFocusSignalData {
  contextId: string;
  contextName: string;
  duration: number; // ms spent
  actions: string[]; // 'view', 'edit_files', 'run_scan', etc.
}

export interface ImplementationSignalData {
  requirementId: string;
  requirementName: string;
  directionId?: string;
  contextId: string | null;
  filesCreated: string[];
  filesModified: string[];
  filesDeleted: string[];
  success: boolean;
  executionTimeMs: number;
  error?: string;
  provider?: string;
  model?: string;
}

export interface CrossTaskAnalysisSignalData {
  planId: string;
  workspaceId: string | null;
  projectIds: string[];
  requirement: string;
  requirementSummary: string;
  plansGenerated: number;
  success: boolean;
  executionTimeMs: number;
}

export interface CrossTaskSelectionSignalData {
  planId: string;
  selectedPlan: 1 | 2 | 3;
  planTitle: string;
  userNotes: string | null;
  projectIds: string[];
}

export interface CliMemorySignalData {
  category: 'decision' | 'insight' | 'pattern' | 'context' | 'lesson';
  message: string;
  source: 'claude_code_cli';
  sessionContext?: string;  // optional: what user was working on
  files?: string[];         // optional: related files
}

/**
 * Session Cluster — compressed composite of related signals
 */
export interface SessionClusterSignalData {
  /** IDs of the child signals that were compressed into this cluster */
  childSignalIds: string[];
  /** The dominant signal type within the cluster */
  dominantType: BehavioralSignalType;
  /** Number of signals in the cluster */
  signalCount: number;
  /** ISO timestamp of the earliest signal in the cluster */
  startTime: string;
  /** ISO timestamp of the latest signal in the cluster */
  endTime: string;
  /** Duration of the cluster in milliseconds */
  durationMs: number;
  /** Intensity: signals per minute within the cluster window */
  intensity: number;
  /** Unique files touched across all child signals (if applicable) */
  filesTouched: string[];
  /** Summary of activity (auto-generated) */
  summary: string;
}

/**
 * Direction Outcome - tracks implementation results
 */
export interface DbDirectionOutcome {
  id: string;
  direction_id: string;
  project_id: string;

  // Execution tracking
  execution_started_at: string | null;
  execution_completed_at: string | null;
  execution_success: number | null; // 0 or 1
  execution_error: string | null;

  // Git tracking
  commit_sha: string | null;
  files_changed: string | null; // JSON array
  lines_added: number | null;
  lines_removed: number | null;

  // Revert tracking
  was_reverted: number; // 0 or 1
  revert_detected_at: string | null;
  revert_commit_sha: string | null;

  // User feedback
  user_satisfaction: number | null; // 1-5
  user_feedback: string | null;

  created_at: string;
  updated_at: string;
}

/**
 * Brain Reflection - tracks autonomous reflection sessions
 */
export interface DbBrainReflection {
  id: string;
  project_id: string;
  status: ReflectionStatus;
  trigger_type: ReflectionTriggerType;
  scope: ReflectionScope;

  // Analysis scope
  directions_analyzed: number;
  outcomes_analyzed: number;
  signals_analyzed: number;

  // Results
  guide_sections_updated: string | null; // JSON array
  error_message: string | null;

  // Timing
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

/**
 * Typed evidence reference — discriminated by entity type so resolution
 * can dispatch to the correct repository instead of guessing from IDs.
 */
export type EvidenceRefType = 'direction' | 'signal' | 'reflection';

export interface EvidenceRef {
  type: EvidenceRefType;
  id: string;
}

/**
 * Learning Insight - generated by reflection
 */
export interface LearningInsight {
  type: 'preference_learned' | 'pattern_detected' | 'warning' | 'recommendation' | 'best_practice';
  title: string;
  description: string;
  confidence: number; // 0-100
  evidence: EvidenceRef[];
  evolves?: string; // title of previous insight this one updates
  // Conflict detection fields
  conflict_with?: string; // title of conflicting insight
  conflict_type?: 'semantic' | 'keyword' | 'direct'; // how conflict was detected
  conflict_resolved?: boolean; // whether user has resolved the conflict
  conflict_resolution?: 'keep_both' | 'keep_this' | 'keep_other' | 'merge'; // resolution choice
  // Auto-pruning fields
  auto_pruned?: boolean; // whether this insight was auto-pruned (confidence lowered or conflict auto-resolved)
  auto_prune_reason?: string; // why it was auto-pruned
  original_confidence?: number; // confidence before auto-pruning
}

/**
 * Database row for brain_insights table (first-class insight entity)
 */
export interface DbBrainInsight {
  id: string;
  reflection_id: string;
  project_id: string;
  type: LearningInsight['type'];
  title: string;
  description: string;
  confidence: number;
  evidence: string; // JSON array of direction/signal IDs
  canonical_id: string | null; // hash-based dedup key (type+normalizedTitle+projectId)
  evolves_from_id: string | null; // FK to previous insight ID
  evolves_title: string | null; // original title for display (before FK was resolved)
  // Conflict fields
  conflict_with_id: string | null; // FK to conflicting insight
  conflict_with_title: string | null; // title for display
  conflict_type: string | null; // 'semantic' | 'keyword' | 'direct'
  conflict_resolved: number; // 0 or 1 (SQLite boolean)
  conflict_resolution: string | null; // 'keep_both' | 'keep_this' | 'keep_other' | 'merge'
  // Auto-pruning fields
  auto_pruned: number; // 0 or 1
  auto_prune_reason: string | null;
  original_confidence: number | null;
  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Aggregated behavioral context for prompt injection
 */
export interface BehavioralContext {
  hasData: boolean;

  // Current focus (what user is working on NOW)
  currentFocus: {
    activeContexts: Array<{ id: string; name: string; activityScore: number }>;
    recentFiles: string[];
    recentCommitThemes: string[];
  };

  // Trending areas (patterns over past week)
  trending: {
    hotEndpoints: Array<{ path: string; trend: 'up' | 'down' | 'stable'; changePercent: number }>;
    activeFeatures: string[];
    neglectedAreas: string[];
  };

  // Implementation patterns
  patterns: {
    successRate: number;
    recentSuccesses: number;
    recentFailures: number;
    revertedCount: number;
    averageTaskDuration: number;
    preferredContexts: string[];
  };

  // Top insights from Brain reflections (high-confidence, proven helpful)
  topInsights: Array<{
    title: string;
    type: LearningInsight['type'];
    description: string;
    confidence: number;
  }>;
}

/**
 * Confidence history point for InsightWithMeta sparklines
 */
export interface ConfidencePoint {
  confidence: number;
  date: string;
  reflectionId: string;
}

/**
 * Enriched insight with project/reflection metadata — single source of truth.
 * Used by the insights API route and all Brain UI components.
 */
export interface InsightWithMeta extends LearningInsight {
  id: string;
  project_id: string;
  reflection_id: string;
  confidenceHistory?: ConfidencePoint[];
  annotation?: InsightAnnotation;
}

/**
 * Reflection configuration
 */
export interface ReflectionConfig {
  enabled: boolean;
  triggerThreshold: number; // decisions before reflection
  minGapHours: number; // minimum hours between reflections
  maxDecisionsToAnalyze: number;
  autoUpdateGuide: boolean;
}

/**
 * Create input types
 */
export interface CreateBehavioralSignalInput {
  id: string;
  project_id: string;
  signal_type: BehavioralSignalType;
  context_id?: string | null;
  context_name?: string | null;
  data: string; // JSON
  weight?: number;
  timestamp: string;
}

export interface CreateDirectionOutcomeInput {
  id: string;
  direction_id: string;
  project_id: string;
  execution_started_at?: string;
}

export interface CreateBrainReflectionInput {
  id: string;
  project_id: string;
  trigger_type: ReflectionTriggerType;
  scope?: ReflectionScope;
}

// ── Anomaly Monitors ────────────────────────────────────────────────────────

export type MonitorCondition = 'gt' | 'lt' | 'gte' | 'lte' | 'abs_gt';

export type MonitorMetric =
  | 'signal_z_score'
  | 'success_rate'
  | 'failure_rate'
  | 'activity_count'
  | 'decay_weighted_activity';

export type MonitorEventStatus = 'triggered' | 'acknowledged' | 'snoozed' | 'resolved';

export interface DbAnomalyMonitor {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  enabled: number; // 0 or 1
  metric: MonitorMetric;
  condition: MonitorCondition;
  threshold: number;
  signal_type: string | null;
  context_id: string | null;
  cooldown_minutes: number;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbAnomalyMonitorEvent {
  id: string;
  monitor_id: string;
  project_id: string;
  severity: 'info' | 'warning' | 'critical';
  current_value: number;
  threshold_value: number;
  message: string;
  status: MonitorEventStatus;
  snoozed_until: string | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
  created_at: string;
}

// ── Insight Annotations ────────────────────────────────────────────────────

export interface DbInsightAnnotation {
  id: string;
  insight_id: string;
  note: string | null;
  tags: string; // JSON array of strings
  created_at: string;
  updated_at: string;
}

export interface InsightAnnotation {
  id: string;
  insightId: string;
  note: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateAnomalyMonitorInput {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  metric: MonitorMetric;
  condition: MonitorCondition;
  threshold: number;
  signal_type?: string;
  context_id?: string;
  cooldown_minutes?: number;
}

// ── Unified Transformation Type ──────────────────────────────────────────────
// All Brain entities (signals, insights, anomalies, correlations, predictions,
// effectiveness scores) share a hidden abstract shape. Transformation<T>
// codifies this isomorphism so consumers can work polymorphically across
// entity boundaries.

/**
 * Every Brain entity kind — used as the discriminant in Transformation<K>.
 */
export type TransformationKind =
  | 'signal'
  | 'insight'
  | 'anomaly'
  | 'correlation'
  | 'prediction'
  | 'effectiveness';

/**
 * Core fields shared by every Brain transformation.
 *
 * - `id` / `project_id`: identity
 * - `timestamp`: when the transformation was produced
 * - `confidence`: 0-1 reliability score (normalized from 0-100 for insights)
 * - `evidence`: typed refs to source entities
 * - `parent_id`: optional lineage pointer (evolves_from_id, monitor_id, etc.)
 */
export interface TransformationBase {
  id: string;
  project_id: string;
  timestamp: string;
  confidence: number;
  evidence: EvidenceRef[];
  parent_id: string | null;
}

/**
 * A Brain transformation — a discriminated union over `kind` with a
 * type-specific `payload`. Shared lifecycle, cache invalidation, and
 * evidence validation logic can target `Transformation<K>` generically.
 */
export type Transformation<
  K extends TransformationKind = TransformationKind,
  P = unknown,
> = TransformationBase & {
  kind: K;
  payload: P;
};

// ── Per-Entity Payloads ──────────────────────────────────────────────────────

export interface SignalPayload {
  signal_type: BehavioralSignalType;
  context_id: string | null;
  context_name: string | null;
  data: Record<string, unknown>;
  weight: number;
  decay_applied_at: string | null;
  cluster_id: string | null;
}

export interface InsightPayload {
  type: LearningInsight['type'];
  title: string;
  description: string;
  reflection_id: string;
  canonical_id: string | null;
  evolves_title: string | null;
  conflict_with_id: string | null;
  conflict_type: string | null;
  conflict_resolved: boolean;
  auto_pruned: boolean;
}

export type AnomalyKindValue = 'activity_drop' | 'activity_spike' | 'failure_spike' | 'context_neglected' | 'signal_gap';
export type AnomalySeverityValue = 'info' | 'warning' | 'critical';

export interface AnomalyPayload {
  kind: AnomalyKindValue;
  severity: AnomalySeverityValue;
  title: string;
  description: string;
  signal_type: BehavioralSignalType | 'all';
  current_value: number;
  baseline_avg: number;
  z_score: number;
  context_id?: string;
  context_name?: string;
}

export interface CorrelationPayload {
  source_type: BehavioralSignalType;
  target_type: BehavioralSignalType;
  coefficient: number;
  strength: 'strong' | 'moderate' | 'weak' | 'none';
  avg_lag_minutes: number;
  sample_count: number;
  follow_rate: number;
  description: string;
}

export interface PredictionPayload {
  context_id: string;
  context_name: string;
  reasoning: string;
  avg_transition_time_ms: number;
  transition_count: number;
}

export interface EffectivenessPayload {
  insight_title: string;
  insight_type: string;
  reflection_id: string;
  insight_date: string;
  pre_rate: number;
  post_rate: number;
  pre_total: number;
  post_total: number;
  score: number;
  verdict: 'helpful' | 'neutral' | 'misleading';
  reliable: boolean;
}

// ── Concrete Transformation Aliases ──────────────────────────────────────────

export type SignalTransformation = Transformation<'signal', SignalPayload>;
export type InsightTransformation = Transformation<'insight', InsightPayload>;
export type AnomalyTransformation = Transformation<'anomaly', AnomalyPayload>;
export type CorrelationTransformation = Transformation<'correlation', CorrelationPayload>;
export type PredictionTransformation = Transformation<'prediction', PredictionPayload>;
export type EffectivenessTransformation = Transformation<'effectiveness', EffectivenessPayload>;

/** Union of all concrete transformation types — use for polymorphic handlers. */
export type AnyTransformation =
  | SignalTransformation
  | InsightTransformation
  | AnomalyTransformation
  | CorrelationTransformation
  | PredictionTransformation
  | EffectivenessTransformation;
