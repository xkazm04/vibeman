/**
 * Signal Collector
 * Central service for capturing and storing behavioral signals
 */

import { behavioralSignalDb, contextDb, predictiveIntentDb } from '@/app/db';
import type {
  BehavioralSignalType,
  GitActivitySignalData,
  ApiFocusSignalData,
  ContextFocusSignalData,
  ImplementationSignalData,
  CrossTaskAnalysisSignalData,
  CrossTaskSelectionSignalData,
  CliMemorySignalData,
} from '@/app/db/models/brain.types';
import { SignalType } from '@/types/signals';
import { LRUCache } from '@/lib/brain/lruCache';
import {
  DEFAULT_DECAY_FACTOR, DEFAULT_RETENTION_DAYS, DECAY_START_FRACTION, DECAY_START_MIN_DAYS,
  SIGNAL_DEDUP_WINDOW_MS, CONTEXT_TRANSITION_MAX_GAP_MS,
  WEIGHT_IDEA_ACCEPTED, WEIGHT_IDEA_REJECTED,
  WEIGHT_GOAL_TRANSITION, WEIGHT_GOAL_NO_TRANSITION,
  WEIGHT_CROSS_TASK_SUCCESS, WEIGHT_CROSS_TASK_FAILURE, WEIGHT_CROSS_TASK_SELECTION,
  WEIGHT_GIT_HEAVY, WEIGHT_GIT_MODERATE, WEIGHT_GIT_LIGHT,
  GIT_HEAVY_FILES_THRESHOLD, GIT_HEAVY_LINES_THRESHOLD, GIT_MODERATE_FILES_THRESHOLD, GIT_MODERATE_LINES_THRESHOLD,
  WEIGHT_API_HIGH_ERROR, WEIGHT_API_HEAVY_USAGE, WEIGHT_API_MODERATE_USAGE, WEIGHT_API_LIGHT,
  API_ERROR_RATE_THRESHOLD, API_HEAVY_CALL_THRESHOLD, API_MODERATE_CALL_THRESHOLD,
  API_BATCH_HEAVY_THRESHOLD, API_BATCH_MODERATE_THRESHOLD,
  WEIGHT_API_BATCH_HEAVY, WEIGHT_API_BATCH_MODERATE, WEIGHT_API_BATCH_LIGHT,
  WEIGHT_CONTEXT_HEAVY, WEIGHT_CONTEXT_MODERATE, WEIGHT_CONTEXT_LIGHT,
  CONTEXT_HEAVY_DURATION_MINUTES, CONTEXT_MODERATE_DURATION_MINUTES,
  WEIGHT_IMPL_MANY_FILES, WEIGHT_IMPL_MODERATE_FILES, WEIGHT_IMPL_SUCCESS, WEIGHT_IMPL_FAILURE,
  IMPL_MANY_FILES_THRESHOLD, IMPL_MODERATE_FILES_THRESHOLD,
  WEIGHT_CLI_DECISION, WEIGHT_CLI_PATTERN, WEIGHT_CLI_INSIGHT, WEIGHT_CLI_LESSON, WEIGHT_CLI_CONTEXT, WEIGHT_CLI_DEFAULT,
} from '@/lib/brain/config';

/**
 * Generate a unique signal ID
 */
function generateSignalId(): string {
  return `sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Bounded LRU dedup cache to prevent recording identical signals within a time window.
 * Key: project_id + signal_type + data_hash → timestamp of last seen.
 * Gracefully evicts oldest entries instead of cliff-edge Map.clear().
 */
const recentSignalHashes = new LRUCache<string, number>(1000);
const DEDUP_WINDOW_MS = SIGNAL_DEDUP_WINDOW_MS;

function createSignalHash(projectId: string, signalType: string, data: string): string {
  // Simple hash: first 100 chars of data + type + project
  const dataPrefix = data.slice(0, 100);
  return `${projectId}:${signalType}:${dataPrefix}`;
}

function isDuplicate(projectId: string, signalType: string, data: string): boolean {
  const hash = createSignalHash(projectId, signalType, data);
  const lastSeen = recentSignalHashes.get(hash);
  const now = Date.now();

  if (lastSeen !== undefined && (now - lastSeen) < DEDUP_WINDOW_MS) {
    return true;
  }

  recentSignalHashes.set(hash, now);
  return false;
}

/**
 * Last-seen context per project for transition tracking.
 * Tracks { contextId, contextName, timestamp } so we can detect context switches.
 */
const lastContextPerProject = new Map<string, { contextId: string; contextName: string; timestamp: number }>();
const TRANSITION_MAX_GAP_MS = CONTEXT_TRANSITION_MAX_GAP_MS;

function recordContextTransition(
  projectId: string,
  toContextId: string,
  toContextName: string,
  signalType: string
): void {
  const now = Date.now();
  const prev = lastContextPerProject.get(projectId);

  // Update the last context
  lastContextPerProject.set(projectId, { contextId: toContextId, contextName: toContextName, timestamp: now });

  // If there's a previous context and it's different, record a transition
  if (prev && prev.contextId !== toContextId && (now - prev.timestamp) < TRANSITION_MAX_GAP_MS) {
    try {
      predictiveIntentDb.createTransition({
        id: `tr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        project_id: projectId,
        from_context_id: prev.contextId,
        from_context_name: prev.contextName,
        to_context_id: toContextId,
        to_context_name: toContextName,
        transition_time_ms: now - prev.timestamp,
        signal_type: signalType,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // Best-effort transition recording
    }
  }
}

/**
 * Signal Collector - captures behavioral signals from various sources
 */
export const signalCollector = {
  /**
   * Record a git activity signal (commit, file changes)
   */
  recordGitActivity: (
    projectId: string,
    data: GitActivitySignalData,
    contextId?: string,
    contextName?: string
  ): void => {
    try {
      const dataStr = JSON.stringify(data);
      if (isDuplicate(projectId, SignalType.GIT_ACTIVITY, dataStr)) return;
      behavioralSignalDb.create({
        id: generateSignalId(),
        project_id: projectId,
        signal_type: SignalType.GIT_ACTIVITY,
        context_id: contextId || null,
        context_name: contextName || null,
        data: dataStr,
        weight: calculateGitWeight(data),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[SignalCollector] Failed to record git activity:', error);
    }
  },

  /**
   * Record an API focus signal (endpoint usage patterns)
   */
  recordApiFocus: (
    projectId: string,
    data: ApiFocusSignalData,
    contextId?: string,
    contextName?: string
  ): void => {
    try {
      const dataStr = JSON.stringify(data);
      if (isDuplicate(projectId, SignalType.API_FOCUS, dataStr)) return;
      behavioralSignalDb.create({
        id: generateSignalId(),
        project_id: projectId,
        signal_type: SignalType.API_FOCUS,
        context_id: contextId || null,
        context_name: contextName || null,
        data: dataStr,
        weight: calculateApiWeight(data),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[SignalCollector] Failed to record API focus:', error);
    }
  },

  /**
   * Record a context focus signal (user viewing/editing context)
   */
  recordContextFocus: (
    projectId: string,
    data: ContextFocusSignalData
  ): void => {
    try {
      const dataStr = JSON.stringify(data);
      if (isDuplicate(projectId, SignalType.CONTEXT_FOCUS, dataStr)) return;

      // Enrich signal data with context metadata
      let enrichedData = dataStr;
      if (data.contextId) {
        try {
          const ctx = contextDb.getContextById(data.contextId);
          if (ctx) {
            const parsed = JSON.parse(dataStr);
            let dbTables: string[] = [];
            let techStack: string[] = [];
            try { dbTables = JSON.parse(ctx.db_tables || '[]'); } catch {}
            try { techStack = JSON.parse(ctx.tech_stack || '[]'); } catch {}
            if (dbTables.length > 0) parsed.dbTables = dbTables;
            if (techStack.length > 0) parsed.techStack = techStack;
            enrichedData = JSON.stringify(parsed);
          }
        } catch { /* enrichment is best-effort */ }
      }

      behavioralSignalDb.create({
        id: generateSignalId(),
        project_id: projectId,
        signal_type: SignalType.CONTEXT_FOCUS,
        context_id: data.contextId,
        context_name: data.contextName,
        data: enrichedData,
        weight: calculateContextWeight(data),
        timestamp: new Date().toISOString(),
      });

      // Track context transition for predictive intent engine
      if (data.contextId && data.contextName) {
        recordContextTransition(projectId, data.contextId, data.contextName, 'context_focus');
      }
    } catch (error) {
      console.error('[SignalCollector] Failed to record context focus:', error);
    }
  },

  /**
   * Record an implementation signal (Claude Code execution result)
   */
  recordImplementation: (
    projectId: string,
    data: ImplementationSignalData
  ): void => {
    try {
      const dataStr = JSON.stringify(data);
      if (isDuplicate(projectId, SignalType.IMPLEMENTATION, dataStr)) return;
      behavioralSignalDb.create({
        id: generateSignalId(),
        project_id: projectId,
        signal_type: SignalType.IMPLEMENTATION,
        context_id: data.contextId || null,
        context_name: null,
        data: dataStr,
        weight: calculateImplementationWeight(data),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[SignalCollector] Failed to record implementation:', error);
    }
  },

  /**
   * Record an idea decision (Tinder swipe) as a behavioral signal.
   * Tracks which categories/contexts the user prefers.
   */
  recordIdeaDecision: (
    projectId: string,
    data: {
      ideaId: string;
      ideaTitle: string;
      category: string;
      accepted: boolean;
      contextId: string | null;
      contextName: string | null;
      rejectionReason?: string | null;
    }
  ): void => {
    try {
      const dataStr = JSON.stringify(data);
      if (isDuplicate(projectId, SignalType.CONTEXT_FOCUS, `idea_decision:${data.ideaId}`)) return;
      behavioralSignalDb.create({
        id: generateSignalId(),
        project_id: projectId,
        signal_type: SignalType.CONTEXT_FOCUS,
        context_id: data.contextId || null,
        context_name: data.contextName || 'General',
        data: dataStr,
        weight: data.accepted ? WEIGHT_IDEA_ACCEPTED : WEIGHT_IDEA_REJECTED,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[SignalCollector] Failed to record idea decision:', error);
    }
  },

  /**
   * Record a goal lifecycle signal (goal status transition detected)
   */
  recordGoalLifecycleSignal: (
    projectId: string,
    data: {
      goalId: string;
      goalTitle: string;
      signalType: string;
      transition?: { from: string; to: string };
      progress: number;
      contextId: string | null;
      contextName: string | null;
    }
  ): void => {
    try {
      const dataStr = JSON.stringify(data);
      if (isDuplicate(projectId, SignalType.CONTEXT_FOCUS, `goal_lifecycle:${data.goalId}:${data.signalType}`)) return;
      behavioralSignalDb.create({
        id: generateSignalId(),
        project_id: projectId,
        signal_type: SignalType.CONTEXT_FOCUS,
        context_id: data.contextId || null,
        context_name: data.contextName || 'General',
        data: dataStr,
        weight: data.transition ? WEIGHT_GOAL_TRANSITION : WEIGHT_GOAL_NO_TRANSITION,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[SignalCollector] Failed to record goal lifecycle signal:', error);
    }
  },

  /**
   * Record a cross-task analysis signal (cross-project requirement analysis completed)
   */
  recordCrossTaskAnalysis: (
    projectId: string,
    data: CrossTaskAnalysisSignalData
  ): void => {
    try {
      const dataStr = JSON.stringify(data);
      if (isDuplicate(projectId, SignalType.CROSS_TASK_ANALYSIS, dataStr)) return;
      behavioralSignalDb.create({
        id: generateSignalId(),
        project_id: projectId,
        signal_type: SignalType.CROSS_TASK_ANALYSIS,
        context_id: null,
        context_name: null,
        data: dataStr,
        weight: data.success ? WEIGHT_CROSS_TASK_SUCCESS : WEIGHT_CROSS_TASK_FAILURE,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[SignalCollector] Failed to record cross-task analysis:', error);
    }
  },

  /**
   * Record a cross-task selection signal (user selected an implementation plan)
   */
  recordCrossTaskSelection: (
    projectId: string,
    data: CrossTaskSelectionSignalData
  ): void => {
    try {
      const dataStr = JSON.stringify(data);
      if (isDuplicate(projectId, SignalType.CROSS_TASK_SELECTION, dataStr)) return;
      behavioralSignalDb.create({
        id: generateSignalId(),
        project_id: projectId,
        signal_type: SignalType.CROSS_TASK_SELECTION,
        context_id: null,
        context_name: null,
        data: dataStr,
        weight: WEIGHT_CROSS_TASK_SELECTION,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[SignalCollector] Failed to record cross-task selection:', error);
    }
  },

  /**
   * Record a CLI memory signal (user explicitly recording knowledge)
   */
  recordCliMemory: (
    projectId: string,
    data: CliMemorySignalData,
    contextId?: string,
    contextName?: string
  ): void => {
    try {
      const dataStr = JSON.stringify(data);
      if (isDuplicate(projectId, SignalType.CLI_MEMORY, dataStr)) return;
      behavioralSignalDb.create({
        id: generateSignalId(),
        project_id: projectId,
        signal_type: SignalType.CLI_MEMORY,
        context_id: contextId || null,
        context_name: contextName || null,
        data: dataStr,
        weight: calculateCliMemoryWeight(data),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[SignalCollector] Failed to record CLI memory:', error);
    }
  },

  /**
   * Batch record API focus signals from observability data
   * Called periodically to aggregate API usage patterns
   */
  recordApiFocusBatch: (
    projectId: string,
    endpoints: Array<{
      endpoint: string;
      method: string;
      callCount: number;
      avgResponseTime: number;
      errorRate: number;
      contextId?: string;
      contextName?: string;
    }>
  ): number => {
    let recorded = 0;
    for (const ep of endpoints) {
      try {
        behavioralSignalDb.create({
          id: generateSignalId(),
          project_id: projectId,
          signal_type: SignalType.API_FOCUS,
          context_id: ep.contextId || null,
          context_name: ep.contextName || null,
          data: JSON.stringify({
            endpoint: ep.endpoint,
            method: ep.method,
            callCount: ep.callCount,
            avgResponseTime: ep.avgResponseTime,
            errorRate: ep.errorRate,
          }),
          weight: ep.callCount > API_BATCH_HEAVY_THRESHOLD ? WEIGHT_API_BATCH_HEAVY : ep.callCount > API_BATCH_MODERATE_THRESHOLD ? WEIGHT_API_BATCH_MODERATE : WEIGHT_API_BATCH_LIGHT,
          timestamp: new Date().toISOString(),
        });
        recorded++;
      } catch (error) {
        console.error('[SignalCollector] Failed to record API focus batch item:', error);
      }
    }
    return recorded;
  },

  /**
   * Batch record multiple signals of any type.
   * Useful for bulk-ingesting signals from automated hooks.
   * Returns the number of signals successfully recorded.
   */
  recordBatch: (
    projectId: string,
    signals: Array<{
      type: BehavioralSignalType;
      data: GitActivitySignalData | ApiFocusSignalData | ContextFocusSignalData | ImplementationSignalData;
      contextId?: string;
      contextName?: string;
    }>
  ): number => {
    let recorded = 0;
    for (const signal of signals) {
      try {
        switch (signal.type) {
          case SignalType.GIT_ACTIVITY:
            signalCollector.recordGitActivity(projectId, signal.data as GitActivitySignalData, signal.contextId, signal.contextName);
            break;
          case SignalType.API_FOCUS:
            signalCollector.recordApiFocus(projectId, signal.data as ApiFocusSignalData, signal.contextId, signal.contextName);
            break;
          case SignalType.CONTEXT_FOCUS:
            signalCollector.recordContextFocus(projectId, signal.data as ContextFocusSignalData);
            break;
          case SignalType.IMPLEMENTATION:
            signalCollector.recordImplementation(projectId, signal.data as ImplementationSignalData);
            break;
        }
        recorded++;
      } catch (error) {
        console.error('[SignalCollector] Failed to record batch signal:', error);
      }
    }
    return recorded;
  },

  /**
   * Apply decay to old signals (call periodically).
   * Decay window is derived from retentionDays to ensure signals are
   * gradually decayed before hard-deletion at the retention boundary.
   */
  applyDecay: (projectId: string, decayFactor: number = DEFAULT_DECAY_FACTOR, retentionDays: number = DEFAULT_RETENTION_DAYS): number => {
    const decayStartDays = Math.max(DECAY_START_MIN_DAYS, Math.floor(retentionDays * DECAY_START_FRACTION));
    return behavioralSignalDb.applyDecay(projectId, decayFactor, decayStartDays);
  },

  /**
   * Clean up old signals beyond retention
   */
  cleanup: (projectId: string, retentionDays: number = DEFAULT_RETENTION_DAYS): number => {
    return behavioralSignalDb.deleteOld(projectId, retentionDays);
  },
};

/**
 * Calculate weight for git activity based on impact
 */
function calculateGitWeight(data: GitActivitySignalData): number {
  const filesChanged = data.filesChanged.length;
  const totalLines = data.linesAdded + data.linesRemoved;

  if (filesChanged > GIT_HEAVY_FILES_THRESHOLD || totalLines > GIT_HEAVY_LINES_THRESHOLD) return WEIGHT_GIT_HEAVY;
  if (filesChanged > GIT_MODERATE_FILES_THRESHOLD || totalLines > GIT_MODERATE_LINES_THRESHOLD) return WEIGHT_GIT_MODERATE;
  return WEIGHT_GIT_LIGHT;
}

/**
 * Calculate weight for API focus based on usage
 */
function calculateApiWeight(data: ApiFocusSignalData): number {
  if (data.errorRate > API_ERROR_RATE_THRESHOLD) return WEIGHT_API_HIGH_ERROR;
  if (data.callCount > API_HEAVY_CALL_THRESHOLD) return WEIGHT_API_HEAVY_USAGE;
  if (data.callCount > API_MODERATE_CALL_THRESHOLD) return WEIGHT_API_MODERATE_USAGE;
  return WEIGHT_API_LIGHT;
}

/**
 * Calculate weight for context focus based on engagement
 */
function calculateContextWeight(data: ContextFocusSignalData): number {
  const durationMinutes = data.duration / 60000;
  const hasEditActions = data.actions.some(a =>
    a === 'edit_files' || a === 'run_scan' || a === 'accept_direction'
  );

  if (hasEditActions && durationMinutes > CONTEXT_HEAVY_DURATION_MINUTES) return WEIGHT_CONTEXT_HEAVY;
  if (hasEditActions || durationMinutes > CONTEXT_MODERATE_DURATION_MINUTES) return WEIGHT_CONTEXT_MODERATE;
  return WEIGHT_CONTEXT_LIGHT;
}

/**
 * Calculate weight for implementation based on result
 */
function calculateImplementationWeight(data: ImplementationSignalData): number {
  if (data.success) {
    const totalFiles = data.filesCreated.length + data.filesModified.length;
    if (totalFiles > IMPL_MANY_FILES_THRESHOLD) return WEIGHT_IMPL_MANY_FILES;
    if (totalFiles > IMPL_MODERATE_FILES_THRESHOLD) return WEIGHT_IMPL_MODERATE_FILES;
    return WEIGHT_IMPL_SUCCESS;
  }
  return WEIGHT_IMPL_FAILURE;
}

/**
 * Calculate weight for CLI memory based on category
 * User-recorded memories are high signal by definition
 */
function calculateCliMemoryWeight(data: CliMemorySignalData): number {
  switch (data.category) {
    case 'decision': return WEIGHT_CLI_DECISION;
    case 'pattern': return WEIGHT_CLI_PATTERN;
    case 'insight': return WEIGHT_CLI_INSIGHT;
    case 'lesson': return WEIGHT_CLI_LESSON;
    case 'context': return WEIGHT_CLI_CONTEXT;
    default: return WEIGHT_CLI_DEFAULT;
  }
}
