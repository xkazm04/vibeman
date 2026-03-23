/**
 * Domain Event Emitters
 *
 * Convenience functions that emit typed domain events onto the event bus.
 * Each function constructs the full event payload so callers stay lean.
 */

import { randomUUID } from 'crypto';
import { eventBus } from './eventBus';
import { registerDomainSubscribers } from './domainSubscribers';
import type {
  ImplementationLoggedEvent,
  TaskExecutionCompletedEvent,
  QuestionAnsweredEvent,
  QuestionAutoDeepenedEvent,
  BrainDirectionChangedEvent,
} from './types';

// Auto-register subscribers on first import — idempotent (safe to call multiple times)
registerDomainSubscribers();

/**
 * Emit when an implementation log is successfully persisted.
 * Triggers: signal recording, idea status update, goal completion check, cache invalidation.
 */
export function emitImplementationLogged(params: {
  projectId: string;
  logId: string;
  requirementName: string;
  contextId?: string | null;
  provider?: string;
  model?: string;
}): void {
  const event: ImplementationLoggedEvent = {
    id: randomUUID(),
    kind: 'domain:implementation_logged',
    timestamp: new Date().toISOString(),
    projectId: params.projectId,
    logId: params.logId,
    requirementName: params.requirementName,
    contextId: params.contextId ?? null,
    provider: params.provider,
    model: params.model,
  };
  eventBus.emit(event);
}

/**
 * Emit when a question is answered.
 * Triggers: auto-deepen gap analysis, cache invalidation.
 */
export function emitQuestionAnswered(params: {
  projectId: string;
  questionId: string;
  answer: string;
}): void {
  const event: QuestionAnsweredEvent = {
    id: randomUUID(),
    kind: 'question:answered',
    timestamp: new Date().toISOString(),
    projectId: params.projectId,
    questionId: params.questionId,
    answer: params.answer,
  };
  eventBus.emit(event);
}

/**
 * Emit when auto-deepen completes for an answered question.
 * Consumed by the UI to show a notification toast via SSE.
 */
export function emitQuestionAutoDeepened(params: {
  projectId: string;
  questionId: string;
  deepened: boolean;
  gapScore: number;
  gapCount: number;
  summary: string;
  generatedCount: number;
}): void {
  const event: QuestionAutoDeepenedEvent = {
    id: randomUUID(),
    kind: 'question:auto_deepened',
    timestamp: new Date().toISOString(),
    projectId: params.projectId,
    questionId: params.questionId,
    deepened: params.deepened,
    gapScore: params.gapScore,
    gapCount: params.gapCount,
    summary: params.summary,
    generatedCount: params.generatedCount,
  };
  eventBus.emit(event);
}

/**
 * Emit when a task execution completes (success or failure).
 * Triggers: signal recording, cache invalidation, collective memory recording.
 */
export function emitTaskExecutionCompleted(params: {
  projectId: string;
  taskId: string;
  requirementName: string;
  projectPath: string;
  contextId?: string | null;
  success: boolean;
  durationMs?: number;
  error?: string;
  filesModified?: string[];
  provider?: string;
  model?: string;
}): void {
  const event: TaskExecutionCompletedEvent = {
    id: randomUUID(),
    kind: 'domain:task_execution_completed',
    timestamp: new Date().toISOString(),
    projectId: params.projectId,
    taskId: params.taskId,
    requirementName: params.requirementName,
    projectPath: params.projectPath,
    contextId: params.contextId ?? null,
    success: params.success,
    durationMs: params.durationMs,
    error: params.error,
    filesModified: params.filesModified || [],
    provider: params.provider,
    model: params.model,
  };
  eventBus.emit(event);
}

/**
 * Emit when a direction is accepted, rejected, or deleted.
 * Triggers: brain signal recording, insight influence tracking, cache invalidation.
 */
export function emitDirectionChanged(params: {
  projectId: string;
  directionId: string;
  action: 'accepted' | 'rejected' | 'deleted' | 'reverted';
  contextId?: string | null;
  contextName?: string | null;
  requirementId?: string | null;
  pairedDirectionId?: string | null;
  pairedAction?: 'accepted' | 'rejected';
}): void {
  const event: BrainDirectionChangedEvent = {
    id: randomUUID(),
    kind: 'brain:direction_changed',
    timestamp: new Date().toISOString(),
    projectId: params.projectId,
    directionId: params.directionId,
    action: params.action,
    contextId: params.contextId ?? null,
    contextName: params.contextName ?? null,
    requirementId: params.requirementId ?? null,
    pairedDirectionId: params.pairedDirectionId ?? null,
    pairedAction: params.pairedAction,
  };
  eventBus.emit(event);
}
