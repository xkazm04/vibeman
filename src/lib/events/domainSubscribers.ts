/**
 * Domain Event Subscribers
 *
 * Handles cross-cutting side effects triggered by domain events.
 * Replaces scattered fire-and-forget try-catch blocks with centralized,
 * observable handlers that log errors instead of silently swallowing them.
 *
 * Each subscriber is isolated — one failing subscriber never blocks another.
 */

import { eventBus } from './eventBus';
import type { ImplementationLoggedEvent, TaskExecutionCompletedEvent, QuestionAnsweredEvent, BrainDirectionChangedEvent } from './types';
import { logger } from '@/lib/logger';

// Use globalThis to survive HMR module reloads in development.
// A module-level `let registered` flag resets when Next.js HMR reloads
// this module, causing duplicate handlers to accumulate on the event bus.
const REGISTRATION_KEY = '__domainSubscribers_registered__' as const;

/**
 * Register all domain event subscribers.
 * Safe to call multiple times — only registers once.
 * Uses globalThis guard to prevent duplicate handlers across HMR reloads.
 * (A module-level `let registered` flag resets on HMR reload, but the
 * eventBus singleton persists, causing duplicate handlers to accumulate.)
 */
export function registerDomainSubscribers(): void {
  if ((globalThis as Record<string, unknown>)[REGISTRATION_KEY]) return;
  (globalThis as Record<string, unknown>)[REGISTRATION_KEY] = true;

  eventBus.on('domain:implementation_logged', onImplementationLogged);
  eventBus.on('domain:task_execution_completed', onTaskExecutionCompleted);
  eventBus.on('question:answered', onQuestionAnswered);
  eventBus.on('brain:direction_changed', onDirectionChanged);
}

// ── Implementation Logged ────────────────────────────────────────────────────

function onImplementationLogged(event: ImplementationLoggedEvent): void {
  const { projectId, logId, requirementName, contextId, provider, model } = event;
  if (!projectId) return;

  // 1. Record brain signal
  try {
    const { signalCollector } = require('@/lib/brain/signalCollector');
    signalCollector.recordImplementation(projectId, {
      requirementId: logId,
      requirementName,
      contextId: contextId || null,
      filesCreated: [],
      filesModified: [],
      filesDeleted: [],
      success: true,
      executionTimeMs: 0,
      provider,
      model,
    });
  } catch (error) {
    logger.error('[DomainEvent] Signal recording failed for implementation_logged', {
      logId,
      projectId,
      error,
    });
  }

  // 2. Invalidate brain context cache
  try {
    const { invalidateContextCache } = require('@/lib/brain/brainService');
    invalidateContextCache(projectId);
  } catch (error) {
    logger.error('[DomainEvent] Context cache invalidation failed', {
      projectId,
      error,
    });
  }

  // 3. Auto-update idea status to 'implemented'
  try {
    const { ideaDb, contextDb } = require('@/app/db');
    const idea = ideaDb.getIdeaByRequirementId(requirementName);
    if (idea && idea.status !== 'implemented') {
      ideaDb.updateIdea(idea.id, { status: 'implemented' });
      if (idea.context_id) {
        contextDb.incrementImplementedTasks(idea.context_id);
      }
    }
  } catch (error) {
    logger.error('[DomainEvent] Idea status update failed', {
      requirementName,
      error,
    });
  }

  // 4. Check goal completion
  if (contextId) {
    try {
      const { checkGoalCompletion } = require('@/lib/goals/goalService');
      checkGoalCompletion(contextId, projectId);
    } catch (error) {
      logger.error('[DomainEvent] Goal completion check failed', {
        contextId,
        projectId,
        error,
      });
    }
  }
}

// ── Task Execution Completed ─────────────────────────────────────────────────

function onTaskExecutionCompleted(event: TaskExecutionCompletedEvent): void {
  const {
    projectId, taskId, requirementName, success, durationMs,
    filesModified, error, provider, model,
  } = event;
  if (!projectId) return;

  // 1. Record implementation signal (success or failure)
  try {
    const { signalCollector } = require('@/lib/brain/signalCollector');
    signalCollector.recordImplementation(projectId, {
      requirementId: taskId,
      requirementName,
      contextId: null,
      filesCreated: [],
      filesModified: filesModified || [],
      filesDeleted: [],
      success,
      executionTimeMs: durationMs || 0,
      error: success ? undefined : error,
      provider,
      model,
    });
  } catch (err) {
    logger.error('[DomainEvent] Signal recording failed for task_execution_completed', {
      taskId,
      projectId,
      error: err,
    });
  }

  // 2. Invalidate brain context cache
  try {
    const { invalidateContextCache } = require('@/lib/brain/brainService');
    invalidateContextCache(projectId);
  } catch (err) {
    logger.error('[DomainEvent] Context cache invalidation failed', {
      projectId,
      error: err,
    });
  }

  // 3. Record collective memory learning
  if (success) {
    try {
      const { onTaskCompleted } = require('@/lib/collective-memory/taskCompletionHook');
      onTaskCompleted({
        projectId,
        taskId,
        requirementName,
        success: true,
        filesChanged: filesModified || [],
        durationMs,
      });
    } catch (err) {
      logger.error('[DomainEvent] Collective memory recording failed', {
        taskId,
        error: err,
      });
    }
  } else {
    try {
      const { onTaskCompleted } = require('@/lib/collective-memory/taskCompletionHook');
      onTaskCompleted({
        projectId,
        taskId,
        requirementName,
        success: false,
        filesChanged: filesModified || [],
        errorMessage: error,
        durationMs,
      });
    } catch (err) {
      logger.error('[DomainEvent] Collective memory recording failed', {
        taskId,
        error: err,
      });
    }
  }
}

// ── Direction Changed ────────────────────────────────────────────────────────

function onDirectionChanged(event: BrainDirectionChangedEvent): void {
  const { projectId, directionId, action, contextId, contextName } = event;
  if (!projectId) return;

  // 1. Record brain signal
  try {
    const { signalCollector } = require('@/lib/brain/signalCollector');
    signalCollector.recordContextFocus(projectId, {
      contextId: contextId || directionId,
      contextName: contextName || directionId,
      duration: 0,
      actions: [`${action}_direction`],
    });
  } catch (error) {
    logger.error('[DomainEvent] Signal recording failed for direction_changed', {
      directionId,
      action,
      projectId,
      error,
    });
  }

  // 2. Record insight influence for causal validation
  try {
    const { brainInsightDb, insightInfluenceDb } = require('@/app/db');
    const activeInsights = brainInsightDb.getForEffectiveness(projectId);
    if (activeInsights.length > 0) {
      const now = new Date().toISOString();
      const insightBatch = activeInsights.map((i: { id: string; title: string; completed_at?: string | null }) => ({
        id: i.id,
        title: i.title,
        shownAt: i.completed_at || now,
      }));
      insightInfluenceDb.recordInfluenceBatch(projectId, directionId, action, insightBatch);

      // If there's a paired direction (from pair acceptance), record its influence too
      if (event.pairedDirectionId && event.pairedAction) {
        insightInfluenceDb.recordInfluenceBatch(projectId, event.pairedDirectionId, event.pairedAction, insightBatch);
      }
    }
  } catch (error) {
    logger.error('[DomainEvent] Insight influence recording failed for direction_changed', {
      directionId,
      action,
      projectId,
      error,
    });
  }

  // 3. Invalidate effectiveness + preference caches
  try {
    const { insightEffectivenessCache } = require('@/app/db');
    insightEffectivenessCache.invalidate(projectId);
  } catch (error) {
    logger.error('[DomainEvent] Cache invalidation failed for direction_changed', {
      projectId,
      error,
    });
  }

  // 4. Invalidate direction preference cache (relevant for pair decisions)
  if (event.pairedDirectionId) {
    try {
      const { directionPreferenceDb } = require('@/app/db');
      directionPreferenceDb.invalidate(projectId);
    } catch (error) {
      logger.error('[DomainEvent] Preference cache invalidation failed for direction_changed', {
        projectId,
        error,
      });
    }
  }
}

// ── Question Answered (Auto-Deepen) ─────────────────────────────────────────

async function onQuestionAnswered(_event: QuestionAnsweredEvent): Promise<void> {
  // Auto-deepen belonged to the removed Questions module; this subscriber is now a no-op.
}
