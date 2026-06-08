/**
 * Outcome Tracker
 * Tracks direction implementation outcomes and detects reverts
 */

import { directionOutcomeRepository } from '@/app/db/repositories/direction-outcome.repository';
import { directionRepository } from '@/app/db/repositories/direction.repository';
import { signalCollector } from './signalCollector';

/**
 * Generate a unique outcome ID
 */
function generateOutcomeId(): string {
  return `outcome_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Outcome Tracker - tracks implementation results for learning
 */
export const outcomeTracker = {
  /**
   * Start tracking an outcome when execution begins
   */
  startTracking: (
    directionId: string,
    projectId: string
  ): string => {
    const outcomeId = generateOutcomeId();

    directionOutcomeRepository.create({
      id: outcomeId,
      direction_id: directionId,
      project_id: projectId,
      execution_started_at: new Date().toISOString(),
    });

    return outcomeId;
  },

  /**
   * Record execution completion (success or failure)
   */
  recordExecution: async (
    outcomeId: string,
    result: {
      success: boolean;
      error?: string;
      commitSha?: string;
      filesChanged?: string[];
      linesAdded?: number;
      linesRemoved?: number;
    }
  ): Promise<void> => {
    try {
      directionOutcomeRepository.updateExecution(outcomeId, {
        execution_completed_at: new Date().toISOString(),
        execution_success: result.success,
        execution_error: result.error,
        commit_sha: result.commitSha,
        files_changed: result.filesChanged,
        lines_added: result.linesAdded,
        lines_removed: result.linesRemoved,
      });
    } catch (error) {
      console.error('[OutcomeTracker] Failed to record execution:', error);
    }
  },

  /**
   * Record execution from direction ID (when outcome not pre-created)
   */
  recordExecutionByDirection: async (
    directionId: string,
    projectId: string,
    result: {
      success: boolean;
      error?: string;
      commitSha?: string;
      filesChanged?: string[];
      linesAdded?: number;
      linesRemoved?: number;
      executionTimeMs?: number;
    }
  ): Promise<string | null> => {
    try {
      // Check if outcome already exists
      let outcome = directionOutcomeRepository.getByDirectionId(directionId);

      if (!outcome) {
        // Create new outcome
        const outcomeId = generateOutcomeId();
        outcome = directionOutcomeRepository.create({
          id: outcomeId,
          direction_id: directionId,
          project_id: projectId,
        });
      }

      // Update with execution result
      directionOutcomeRepository.updateExecution(outcome.id, {
        execution_completed_at: new Date().toISOString(),
        execution_success: result.success,
        execution_error: result.error,
        commit_sha: result.commitSha,
        files_changed: result.filesChanged,
        lines_added: result.linesAdded,
        lines_removed: result.linesRemoved,
      });

      // Also record as behavioral signal
      const direction = directionRepository.getDirectionById(directionId);
      signalCollector.recordImplementation(projectId, {
        requirementId: direction?.requirement_id || '',
        requirementName: direction?.requirement_path || '',
        directionId,
        contextId: direction?.context_id || null,
        filesCreated: result.filesChanged?.filter(f => f.startsWith('+')) || [],
        filesModified: result.filesChanged?.filter(f => !f.startsWith('+') && !f.startsWith('-')) || [],
        filesDeleted: result.filesChanged?.filter(f => f.startsWith('-')) || [],
        success: result.success,
        executionTimeMs: result.executionTimeMs || 0,
        error: result.error,
      });

      return outcome.id;
    } catch (error) {
      console.error('[OutcomeTracker] Failed to record execution by direction:', error);
      return null;
    }
  },

  /**
   * Record user feedback for an outcome
   */
  recordFeedback: (
    directionId: string,
    satisfaction: number,
    feedback?: string
  ): boolean => {
    try {
      const outcome = directionOutcomeRepository.getByDirectionId(directionId);
      if (!outcome) {
        console.warn('[OutcomeTracker] No outcome found for direction:', directionId);
        return false;
      }

      directionOutcomeRepository.updateFeedback(outcome.id, satisfaction, feedback);
      return true;
    } catch (error) {
      console.error('[OutcomeTracker] Failed to record feedback:', error);
      return false;
    }
  },

  /**
   * Mark an outcome as reverted
   */
  markReverted: (
    directionId: string,
    revertCommitSha?: string
  ): boolean => {
    try {
      const outcome = directionOutcomeRepository.getByDirectionId(directionId);
      if (!outcome) {
        console.warn('[OutcomeTracker] No outcome found for direction:', directionId);
        return false;
      }

      directionOutcomeRepository.markReverted(outcome.id, revertCommitSha);
      return true;
    } catch (error) {
      console.error('[OutcomeTracker] Failed to mark reverted:', error);
      return false;
    }
  },

  /**
   * Get outcome for a direction
   */
  getOutcome: (directionId: string) => {
    return directionOutcomeRepository.getByDirectionId(directionId);
  },

  /**
   * Get outcome statistics for a project
   */
  getStats: (projectId: string, days?: number) => {
    return directionOutcomeRepository.getStats(projectId, days);
  },

  /**
   * Get recent outcomes for revert scanning
   */
  getRecentForRevertScan: (projectId: string, days: number = 7) => {
    return directionOutcomeRepository.getRecentWithCommits(projectId, days);
  },

  /**
   * Scan for reverts (to be called periodically)
   * This is a simple heuristic - checks if any recent outcomes
   * have commits that might have been reverted
   */
  scanForReverts: async (
    projectId: string,
    checkRevert: (commitSha: string) => Promise<{ reverted: boolean; revertSha?: string }>
  ): Promise<number> => {
    const recentOutcomes = directionOutcomeRepository.getRecentWithCommits(projectId, 7);
    let revertCount = 0;

    for (const outcome of recentOutcomes) {
      if (!outcome.commit_sha) continue;

      try {
        const result = await checkRevert(outcome.commit_sha);
        if (result.reverted) {
          directionOutcomeRepository.markReverted(outcome.id, result.revertSha);
          revertCount++;
        }
      } catch (error) {
        console.error('[OutcomeTracker] Failed to check revert for commit:', outcome.commit_sha, error);
      }
    }

    return revertCount;
  },
};
