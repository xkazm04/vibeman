/**
 * Task Completion Hook for Collective Memory
 * Captures learnings from completed task executions.
 */

import { recordTaskLearning, getRelevantKnowledge, formatKnowledgeForPrompt } from './collectiveMemoryService';
import type { DbCollectiveMemoryEntry } from '@/app/db/models/collective-memory.types';

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
 * Called before a task execution starts.
 * Returns relevant knowledge to inject into the execution context.
 */
export function getTaskKnowledge(params: {
  projectId: string;
  requirementName: string;
  filePatterns?: string[];
}): { memories: DbCollectiveMemoryEntry[]; promptSection: string } {
  try {
    const memories = getRelevantKnowledge({
      projectId: params.projectId,
      requirementName: params.requirementName,
      filePatterns: params.filePatterns,
    });
    const promptSection = formatKnowledgeForPrompt(memories);
    return { memories, promptSection };
  } catch (error) {
    console.error('[CollectiveMemory] Failed to get task knowledge:', error);
    return { memories: [], promptSection: '' };
  }
}
