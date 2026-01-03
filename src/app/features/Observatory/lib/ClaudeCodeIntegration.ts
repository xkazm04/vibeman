/**
 * Claude Code Integration
 * Hooks into Claude Code execution to track outcomes and feed the learning system
 */

import { observatoryDb } from '@/app/db';
import type { CreateExecutionOutcome } from '@/app/db/models/observatory.types';
import {
  triggerPostExecutionObservation,
  recordHealthMetric,
} from './ObservationService';
import { collectAllSignals } from './signals';
import { learnFromExecutions } from './LearningSystem';

// Execution tracking state
interface TrackedExecution {
  id: string;
  projectId: string;
  projectPath: string;
  requirementContent: string;
  targetFiles: string[];
  startTime: number;
  preHealthScore: number | null;
  preComplexityScores: Record<string, number>;
}

const activeExecutions = new Map<string, TrackedExecution>();

/**
 * Start tracking a Claude Code execution
 * Call this before executing a requirement
 */
export async function startExecutionTracking(
  executionId: string,
  projectId: string,
  projectPath: string,
  requirementContent: string,
  targetFiles: string[]
): Promise<void> {
  // Collect pre-execution signals
  let preHealthScore: number | null = null;
  const preComplexityScores: Record<string, number> = {};

  try {
    const signals = await collectAllSignals(projectPath, targetFiles);
    preHealthScore = signals.aggregated.overallScore;

    for (const result of signals.providers) {
      if (result.providerId === 'complexity') {
        const data = result.data as Record<string, unknown>;
        const mostComplex = data.mostComplex as Array<{ file: string; score: number }> | undefined;
        if (mostComplex) {
          for (const item of mostComplex) {
            preComplexityScores[item.file] = item.score;
          }
        }
      }
    }
  } catch (error) {
    console.error('[ClaudeCodeIntegration] Failed to collect pre-execution signals:', error);
  }

  // Store tracking state
  activeExecutions.set(executionId, {
    id: executionId,
    projectId,
    projectPath,
    requirementContent,
    targetFiles,
    startTime: Date.now(),
    preHealthScore,
    preComplexityScores,
  });

  // Create execution outcome record
  observatoryDb.createExecutionOutcome({
    project_id: projectId,
    execution_id: executionId,
    execution_type: detectExecutionType(requirementContent),
    requirement_content: requirementContent,
    target_files: targetFiles,
  });
}

/**
 * Complete execution tracking
 * Call this after a requirement execution completes
 */
export async function completeExecutionTracking(
  executionId: string,
  success: boolean,
  tokensUsed?: number,
  changedFiles?: string[]
): Promise<void> {
  const tracking = activeExecutions.get(executionId);
  if (!tracking) {
    console.warn(`[ClaudeCodeIntegration] No tracking found for execution ${executionId}`);
    return;
  }

  try {
    const duration = Date.now() - tracking.startTime;

    // Get execution outcome record
    const outcome = observatoryDb.getExecutionOutcomeByExecutionId(executionId);
    if (!outcome) {
      console.error('[ClaudeCodeIntegration] No outcome record found');
      return;
    }

    // Collect post-execution signals
    let postHealthScore: number | null = null;
    const postComplexityScores: Record<string, number> = {};
    let regressionDetected = false;

    try {
      const signals = await collectAllSignals(tracking.projectPath, tracking.targetFiles);
      postHealthScore = signals.aggregated.overallScore;

      for (const result of signals.providers) {
        if (result.providerId === 'complexity') {
          const data = result.data as Record<string, unknown>;
          const mostComplex = data.mostComplex as Array<{ file: string; score: number }> | undefined;
          if (mostComplex) {
            for (const item of mostComplex) {
              postComplexityScores[item.file] = item.score;
            }
          }
        }
      }

      // Check for regressions
      if (tracking.preHealthScore !== null && postHealthScore !== null) {
        if (postHealthScore < tracking.preHealthScore - 10) {
          regressionDetected = true;
        }
      }
    } catch (error) {
      console.error('[ClaudeCodeIntegration] Failed to collect post-execution signals:', error);
    }

    // Calculate improvements
    const healthImprovement =
      tracking.preHealthScore !== null && postHealthScore !== null
        ? postHealthScore - tracking.preHealthScore
        : null;

    // Determine outcome rating
    let outcomeRating: 'excellent' | 'good' | 'neutral' | 'poor' | 'failed';
    if (!success) {
      outcomeRating = 'failed';
    } else if (regressionDetected) {
      outcomeRating = 'poor';
    } else if (healthImprovement !== null && healthImprovement > 10) {
      outcomeRating = 'excellent';
    } else if (healthImprovement !== null && healthImprovement > 0) {
      outcomeRating = 'good';
    } else {
      outcomeRating = 'neutral';
    }

    // Update execution outcome
    observatoryDb.updateExecutionOutcome(outcome.id, {
      success,
      files_changed: changedFiles || [],
      execution_duration_ms: duration,
      tokens_used: tokensUsed,
      pre_complexity_scores: tracking.preComplexityScores,
      post_complexity_scores: postComplexityScores,
      pre_health_score: tracking.preHealthScore || undefined,
      post_health_score: postHealthScore || undefined,
      health_improvement: healthImprovement || undefined,
      outcome_rating: outcomeRating,
      regression_detected: regressionDetected,
      completed_at: new Date().toISOString(),
    });

    // Record health metric if changed
    if (postHealthScore !== null) {
      recordHealthMetric(
        tracking.projectId,
        undefined,
        'overall_health',
        postHealthScore,
        { warning: 60, critical: 40 }
      );
    }

    // Trigger post-execution observation
    triggerPostExecutionObservation(
      tracking.projectId,
      executionId,
      changedFiles || []
    );

    // Learn from this execution (async, don't wait)
    learnFromExecutions(tracking.projectId).catch((error) => {
      console.error('[ClaudeCodeIntegration] Learning failed:', error);
    });
  } finally {
    // Clean up tracking
    activeExecutions.delete(executionId);
  }
}

/**
 * Detect execution type from requirement content
 */
function detectExecutionType(
  content: string
): 'refactor' | 'fix' | 'prevention' | 'enhancement' | 'test' | 'documentation' {
  const lowerContent = content.toLowerCase();

  if (lowerContent.includes('fix') || lowerContent.includes('bug')) {
    return 'fix';
  }
  if (lowerContent.includes('refactor') || lowerContent.includes('simplify')) {
    return 'refactor';
  }
  if (lowerContent.includes('test') || lowerContent.includes('spec')) {
    return 'test';
  }
  if (lowerContent.includes('prevent') || lowerContent.includes('guard')) {
    return 'prevention';
  }
  if (lowerContent.includes('document') || lowerContent.includes('readme')) {
    return 'documentation';
  }

  return 'enhancement';
}

/**
 * Get active executions
 */
export function getActiveExecutions(): TrackedExecution[] {
  return Array.from(activeExecutions.values());
}

/**
 * Check if an execution is being tracked
 */
export function isExecutionTracked(executionId: string): boolean {
  return activeExecutions.has(executionId);
}

/**
 * Hook for the existing TaskRunner to integrate with Observatory
 * Returns functions to call at different stages of execution
 */
export function createObservatoryHooks(
  projectId: string,
  projectPath: string
) {
  let currentExecutionId: string | null = null;

  return {
    /**
     * Call when starting a requirement execution
     */
    onExecutionStart: async (
      executionId: string,
      requirementContent: string,
      targetFiles: string[]
    ) => {
      currentExecutionId = executionId;
      await startExecutionTracking(
        executionId,
        projectId,
        projectPath,
        requirementContent,
        targetFiles
      );
    },

    /**
     * Call when execution completes
     */
    onExecutionComplete: async (
      success: boolean,
      tokensUsed?: number,
      changedFiles?: string[]
    ) => {
      if (currentExecutionId) {
        await completeExecutionTracking(
          currentExecutionId,
          success,
          tokensUsed,
          changedFiles
        );
        currentExecutionId = null;
      }
    },

    /**
     * Get current execution ID
     */
    getCurrentExecutionId: () => currentExecutionId,
  };
}

export type { TrackedExecution };
