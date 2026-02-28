/**
 * Task Completion Hook for Collective Memory
 * Captures learnings from completed task executions and tracks
 * which memories were applied (creating a closed feedback loop).
 */

import { recordTaskLearning, getRelevantKnowledge, formatKnowledgeForPrompt } from './collectiveMemoryService';
import { collectiveMemoryDb } from '@/app/db';
import type { DbCollectiveMemoryEntry, ApplicationOutcome } from '@/app/db/models/collective-memory.types';

/**
 * Called after a task execution completes.
 * Records the learning in collective memory.
 */
export function onTaskCompleted(params: {
  projectId: string;
  sessionId?: string;
  taskId: string;
  requirementName: string;
  success: boolean;
  filesChanged?: string[];
  errorMessage?: string;
  toolCounts?: Record<string, number>;
  durationMs?: number;
}): void {
  try {
    recordTaskLearning(params);
  } catch (error) {
    // Best-effort: don't break task completion if memory capture fails
    console.error('[CollectiveMemory] Failed to record task learning:', error);
  }
}

/**
 * Result of getTaskKnowledge — includes application IDs so the caller
 * can resolve them after the task completes (closing the feedback loop).
 */
export interface TaskKnowledgeResult {
  memories: DbCollectiveMemoryEntry[];
  promptSection: string;
  /** Application IDs created for each injected memory (for later resolution) */
  applicationIds: string[];
}

/**
 * Called before a task execution starts.
 * Returns relevant knowledge to inject into the execution context.
 * Creates application records for each injected memory to enable
 * feedback loop resolution after the task completes.
 */
export function getTaskKnowledge(params: {
  projectId: string;
  requirementName: string;
  taskId?: string;
  filePatterns?: string[];
}): TaskKnowledgeResult {
  try {
    const memories = getRelevantKnowledge({
      projectId: params.projectId,
      requirementName: params.requirementName,
      filePatterns: params.filePatterns,
    });
    const promptSection = formatKnowledgeForPrompt(memories);

    // Create application records for each injected memory
    const applicationIds: string[] = [];
    for (const memory of memories) {
      try {
        const appId = `cma_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        collectiveMemoryDb.createApplication({
          id: appId,
          memory_id: memory.id,
          project_id: params.projectId,
          task_id: params.taskId,
          requirement_name: params.requirementName,
        });
        collectiveMemoryDb.updateLastApplied(memory.id);
        applicationIds.push(appId);
      } catch {
        // Individual application record failure shouldn't block others
      }
    }

    return { memories, promptSection, applicationIds };
  } catch (error) {
    console.error('[CollectiveMemory] Failed to get task knowledge:', error);
    return { memories: [], promptSection: '', applicationIds: [] };
  }
}

/**
 * Resolve pending application records after a task completes.
 * This closes the feedback loop: injected memories get their
 * effectiveness scores updated based on actual task outcomes.
 */
export function resolveTaskApplications(
  applicationIds: string[],
  outcome: ApplicationOutcome,
  details?: string
): void {
  for (const appId of applicationIds) {
    try {
      collectiveMemoryDb.resolveApplication(appId, outcome, details);
    } catch {
      // Individual resolution failure shouldn't block others
    }
  }
}
