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

/**
 * Generate a unique signal ID
 */
function generateSignalId(): string {
  return `sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Simple dedup cache to prevent recording identical signals within a time window.
 * Key: project_id + signal_type + data_hash
 */
const recentSignalHashes = new Map<string, number>();
const DEDUP_WINDOW_MS = 60_000; // 60 seconds
const DEDUP_SOFT_CAP = 500;     // trigger time-based cleanup
const DEDUP_HARD_CAP = 1000;    // force eviction of oldest entries

function createSignalHash(projectId: string, signalType: string, data: string): string {
  // Simple hash: first 100 chars of data + type + project
  const dataPrefix = data.slice(0, 100);
  return `${projectId}:${signalType}:${dataPrefix}`;
}

function isDuplicate(projectId: string, signalType: string, data: string): boolean {
  const hash = createSignalHash(projectId, signalType, data);
  const lastSeen = recentSignalHashes.get(hash);
  const now = Date.now();

  if (lastSeen && (now - lastSeen) < DEDUP_WINDOW_MS) {
    return true;
  }

  recentSignalHashes.set(hash, now);

  // Cleanup old entries when past soft cap
  if (recentSignalHashes.size > DEDUP_SOFT_CAP) {
    for (const [key, time] of recentSignalHashes.entries()) {
      if (now - time > DEDUP_WINDOW_MS) {
        recentSignalHashes.delete(key);
      }
    }

    // Hard cap: if still too large, evict oldest entries
    if (recentSignalHashes.size > DEDUP_HARD_CAP) {
      const entries = Array.from(recentSignalHashes.entries()).sort((a, b) => a[1] - b[1]);
      const toRemove = entries.length - DEDUP_SOFT_CAP;
      for (let i = 0; i < toRemove; i++) {
        recentSignalHashes.delete(entries[i][0]);
      }
    }
  }

  return false;
}

/**
 * Last-seen context per project for transition tracking.
 * Tracks { contextId, contextName, timestamp } so we can detect context switches.
 */
const lastContextPerProject = new Map<string, { contextId: string; contextName: string; timestamp: number }>();
const TRANSITION_MAX_GAP_MS = 3600000; // 1 hour max gap

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
      if (isDuplicate(projectId, 'git_activity', dataStr)) return;
      behavioralSignalDb.create({
        id: generateSignalId(),
        project_id: projectId,
        signal_type: 'git_activity',
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
      if (isDuplicate(projectId, 'api_focus', dataStr)) return;
      behavioralSignalDb.create({
        id: generateSignalId(),
        project_id: projectId,
        signal_type: 'api_focus',
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
      if (isDuplicate(projectId, 'context_focus', dataStr)) return;

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
        signal_type: 'context_focus',
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
      if (isDuplicate(projectId, 'implementation', dataStr)) return;
      behavioralSignalDb.create({
        id: generateSignalId(),
        project_id: projectId,
        signal_type: 'implementation',
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
      if (isDuplicate(projectId, 'context_focus', `idea_decision:${data.ideaId}`)) return;
      behavioralSignalDb.create({
        id: generateSignalId(),
        project_id: projectId,
        signal_type: 'context_focus',
        context_id: data.contextId || null,
        context_name: data.contextName || 'General',
        data: dataStr,
        weight: data.accepted ? 0.8 : 0.3,
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
      if (isDuplicate(projectId, 'context_focus', `goal_lifecycle:${data.goalId}:${data.signalType}`)) return;
      behavioralSignalDb.create({
        id: generateSignalId(),
        project_id: projectId,
        signal_type: 'context_focus',
        context_id: data.contextId || null,
        context_name: data.contextName || 'General',
        data: dataStr,
        weight: data.transition ? 1.0 : 0.5,
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
      if (isDuplicate(projectId, 'cross_task_analysis', dataStr)) return;
      behavioralSignalDb.create({
        id: generateSignalId(),
        project_id: projectId,
        signal_type: 'cross_task_analysis',
        context_id: null,
        context_name: null,
        data: dataStr,
        weight: data.success ? 2.0 : 1.0, // Successful analysis is high signal
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
      if (isDuplicate(projectId, 'cross_task_selection', dataStr)) return;
      behavioralSignalDb.create({
        id: generateSignalId(),
        project_id: projectId,
        signal_type: 'cross_task_selection',
        context_id: null,
        context_name: null,
        data: dataStr,
        weight: 1.5, // Plan selection is a high-signal user decision
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
      if (isDuplicate(projectId, 'cli_memory', dataStr)) return;
      behavioralSignalDb.create({
        id: generateSignalId(),
        project_id: projectId,
        signal_type: 'cli_memory',
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
          signal_type: 'api_focus',
          context_id: ep.contextId || null,
          context_name: ep.contextName || null,
          data: JSON.stringify({
            endpoint: ep.endpoint,
            method: ep.method,
            callCount: ep.callCount,
            avgResponseTime: ep.avgResponseTime,
            errorRate: ep.errorRate,
          }),
          weight: ep.callCount > 100 ? 2.0 : ep.callCount > 10 ? 1.5 : 1.0,
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
          case 'git_activity':
            signalCollector.recordGitActivity(projectId, signal.data as GitActivitySignalData, signal.contextId, signal.contextName);
            break;
          case 'api_focus':
            signalCollector.recordApiFocus(projectId, signal.data as ApiFocusSignalData, signal.contextId, signal.contextName);
            break;
          case 'context_focus':
            signalCollector.recordContextFocus(projectId, signal.data as ContextFocusSignalData);
            break;
          case 'implementation':
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
   * Apply decay to old signals (call periodically)
   */
  applyDecay: (projectId: string): number => {
    return behavioralSignalDb.applyDecay(projectId, 0.9, 7);
  },

  /**
   * Clean up old signals beyond retention
   */
  cleanup: (projectId: string, retentionDays: number = 30): number => {
    return behavioralSignalDb.deleteOld(projectId, retentionDays);
  },
};

/**
 * Calculate weight for git activity based on impact
 */
function calculateGitWeight(data: GitActivitySignalData): number {
  const filesChanged = data.filesChanged.length;
  const totalLines = data.linesAdded + data.linesRemoved;

  // More files or more lines = higher weight
  if (filesChanged > 10 || totalLines > 500) return 2.0;
  if (filesChanged > 5 || totalLines > 100) return 1.5;
  return 1.0;
}

/**
 * Calculate weight for API focus based on usage
 */
function calculateApiWeight(data: ApiFocusSignalData): number {
  // High call count or high error rate = more important
  if (data.errorRate > 10) return 2.0; // Problematic endpoint
  if (data.callCount > 100) return 1.8; // Heavy usage
  if (data.callCount > 50) return 1.5;
  return 1.0;
}

/**
 * Calculate weight for context focus based on engagement
 */
function calculateContextWeight(data: ContextFocusSignalData): number {
  const durationMinutes = data.duration / 60000;
  const hasEditActions = data.actions.some(a =>
    a === 'edit_files' || a === 'run_scan' || a === 'accept_direction'
  );

  // Longer engagement or edit actions = higher weight
  if (hasEditActions && durationMinutes > 5) return 2.0;
  if (hasEditActions || durationMinutes > 10) return 1.5;
  return 1.0;
}

/**
 * Calculate weight for implementation based on result
 */
function calculateImplementationWeight(data: ImplementationSignalData): number {
  // Successful implementations with many files = high signal
  if (data.success) {
    const totalFiles = data.filesCreated.length + data.filesModified.length;
    if (totalFiles > 10) return 2.5;
    if (totalFiles > 5) return 2.0;
    return 1.5;
  }
  // Failed implementations are also informative
  return 1.0;
}

/**
 * Calculate weight for CLI memory based on category
 * User-recorded memories are high signal by definition
 */
function calculateCliMemoryWeight(data: CliMemorySignalData): number {
  switch (data.category) {
    case 'decision': return 2.0;  // Architectural decisions most valuable
    case 'pattern': return 1.8;   // Patterns inform future work
    case 'insight': return 1.5;   // Codebase knowledge
    case 'lesson': return 1.5;    // Implementation learnings
    case 'context': return 1.2;   // General context
    default: return 1.5;
  }
}
