/**
 * Observation Service
 * Handles triggers and scheduling for Code Health Observatory
 * Integrates with existing scan queue and file watcher infrastructure
 */

import { observatoryDb } from '@/app/db';
import type { CreateAnalysisSnapshot, UpdateAnalysisSnapshot } from '@/app/db/models/observatory.types';

// Types
export interface ObservationTrigger {
  type: 'file_change' | 'execution_complete' | 'scheduled' | 'manual';
  source: string;
  projectId: string;
  metadata?: Record<string, unknown>;
}

export interface AnalysisConfig {
  projectId: string;
  snapshotType: 'scheduled' | 'triggered' | 'manual' | 'post_execution';
  triggerSource?: string;
  includeComplexityAnalysis?: boolean;
  includePredictions?: boolean;
  includeHealthMetrics?: boolean;
}

export interface AnalysisResult {
  snapshotId: string;
  filesAnalyzed: number;
  issuesFound: number;
  predictionsCreated: number;
  healthScore: number | null;
  duration: number;
}

// Observation event listeners
type ObservationListener = (trigger: ObservationTrigger) => void;
const listeners: ObservationListener[] = [];

/**
 * Register a listener for observation triggers
 */
export function onObservationTrigger(listener: ObservationListener): () => void {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index > -1) listeners.splice(index, 1);
  };
}

/**
 * Emit an observation trigger event
 */
export function emitObservationTrigger(trigger: ObservationTrigger): void {
  listeners.forEach((listener) => {
    try {
      listener(trigger);
    } catch (error) {
      console.error('[ObservationService] Listener error:', error);
    }
  });
}

/**
 * Start a new analysis snapshot
 * Called at the beginning of an analysis run
 */
export function startAnalysisSnapshot(config: AnalysisConfig): string {
  const snapshot = observatoryDb.createAnalysisSnapshot({
    project_id: config.projectId,
    snapshot_type: config.snapshotType,
    trigger_source: config.triggerSource,
  });

  return snapshot.id;
}

/**
 * Complete an analysis snapshot with results
 */
export function completeAnalysisSnapshot(
  snapshotId: string,
  results: Partial<UpdateAnalysisSnapshot>
): void {
  observatoryDb.updateAnalysisSnapshot(snapshotId, {
    ...results,
    status: 'completed',
  });
}

/**
 * Mark an analysis snapshot as failed
 */
export function failAnalysisSnapshot(snapshotId: string, error: string): void {
  observatoryDb.updateAnalysisSnapshot(snapshotId, {
    status: 'failed',
    error_message: error,
  });
}

/**
 * Trigger file change observation
 * Called when files are modified in a project
 */
export function triggerFileChangeObservation(
  projectId: string,
  changedFiles: string[],
  changeType: 'create' | 'modify' | 'delete'
): void {
  emitObservationTrigger({
    type: 'file_change',
    source: 'file_watcher',
    projectId,
    metadata: {
      changedFiles,
      changeType,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Trigger post-execution observation
 * Called after a Claude Code execution completes
 */
export function triggerPostExecutionObservation(
  projectId: string,
  executionId: string,
  changedFiles: string[]
): void {
  emitObservationTrigger({
    type: 'execution_complete',
    source: 'claude_code',
    projectId,
    metadata: {
      executionId,
      changedFiles,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Trigger scheduled observation
 * Called by the scheduler for periodic analysis
 */
export function triggerScheduledObservation(projectId: string): void {
  emitObservationTrigger({
    type: 'scheduled',
    source: 'scheduler',
    projectId,
    metadata: {
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Trigger manual observation
 * Called when user manually requests analysis
 */
export function triggerManualObservation(projectId: string): void {
  emitObservationTrigger({
    type: 'manual',
    source: 'user',
    projectId,
    metadata: {
      timestamp: new Date().toISOString(),
    },
  });
}

// ===== Scheduling Support =====

interface ScheduleConfig {
  projectId: string;
  intervalMinutes: number;
  enabled: boolean;
}

const schedules = new Map<string, NodeJS.Timeout>();

/**
 * Set up a scheduled observation for a project
 */
export function scheduleObservation(config: ScheduleConfig): void {
  // Clear existing schedule
  const existing = schedules.get(config.projectId);
  if (existing) {
    clearInterval(existing);
    schedules.delete(config.projectId);
  }

  if (!config.enabled) return;

  // Set up new schedule
  const interval = setInterval(() => {
    triggerScheduledObservation(config.projectId);
  }, config.intervalMinutes * 60 * 1000);

  schedules.set(config.projectId, interval);
}

/**
 * Stop all scheduled observations
 */
export function stopAllSchedules(): void {
  schedules.forEach((interval) => clearInterval(interval));
  schedules.clear();
}

/**
 * Get the current health summary for a project
 */
export function getProjectHealthSummary(projectId: string) {
  return observatoryDb.getProjectHealthSummary(projectId);
}

/**
 * Get learning progress for a project
 */
export function getLearningProgress(projectId: string) {
  return observatoryDb.getLearningProgress(projectId);
}

// ===== Analysis Helpers =====

/**
 * Calculate health delta from previous snapshot
 */
export function calculateHealthDelta(
  projectId: string,
  currentHealthScore: number
): { delta: number; trend: 'improving' | 'stable' | 'degrading' } {
  const summary = observatoryDb.getProjectHealthSummary(projectId);

  if (!summary.healthScore) {
    return { delta: 0, trend: 'stable' };
  }

  const delta = currentHealthScore - summary.healthScore;

  let trend: 'improving' | 'stable' | 'degrading';
  if (Math.abs(delta) < 0.5) {
    trend = 'stable';
  } else if (delta > 0) {
    trend = 'improving';
  } else {
    trend = 'degrading';
  }

  return { delta, trend };
}

/**
 * Record a health metric for the project
 */
export function recordHealthMetric(
  projectId: string,
  snapshotId: string | undefined,
  metricType: 'overall_health' | 'complexity' | 'test_coverage' | 'duplication' | 'security' | 'performance' | 'maintainability',
  value: number,
  thresholds?: { warning?: number; critical?: number }
): void {
  const latestMetrics = observatoryDb.getLatestHealthMetrics(projectId);
  const previousMetric = latestMetrics.find((m) => m.metric_type === metricType);

  observatoryDb.createHealthMetric({
    project_id: projectId,
    snapshot_id: snapshotId,
    metric_type: metricType,
    metric_value: value,
    previous_value: previousMetric?.metric_value,
    threshold_warning: thresholds?.warning,
    threshold_critical: thresholds?.critical,
  });
}
