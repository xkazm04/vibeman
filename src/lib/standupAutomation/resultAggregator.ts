/**
 * Automation Result Aggregator
 * Aggregates results from Claude Code API callbacks and provides unified access
 */

import { automationSessionRepository } from '@/app/db/repositories/automation-session.repository';
import { logger } from '@/lib/logger';
import type {
  AutomationCycleResult,
  GoalCandidate,
  GoalEvaluationResult,
  GoalStatusChange,
  CandidateSubmission,
  EvaluationSubmission,
} from './types';

// In-memory aggregation state for active sessions
interface AggregationState {
  candidates: GoalCandidate[];
  evaluations: GoalEvaluationResult[];
  statusChanges: GoalStatusChange[];
  metadata: {
    explorationSummary?: string;
    filesAnalyzed?: string[];
    patternsIdentified?: string[];
    implementationEvidence?: Record<string, string[]>;
  };
  tokensUsed: { input: number; output: number };
  startTime: number;
}

const aggregationStates = new Map<string, AggregationState>();

/**
 * Result aggregator for automation sessions
 */
export const automationResultAggregator = {
  /**
   * Initialize aggregation state for a new session
   */
  initSession(sessionId: string): void {
    aggregationStates.set(sessionId, {
      candidates: [],
      evaluations: [],
      statusChanges: [],
      metadata: {},
      tokensUsed: { input: 0, output: 0 },
      startTime: Date.now(),
    });
    logger.debug('[ResultAggregator] Session initialized', { sessionId });
  },

  /**
   * Record candidates from Claude Code submission
   */
  recordCandidates(sessionId: string, submission: CandidateSubmission): void {
    let state = aggregationStates.get(sessionId);
    if (!state) {
      this.initSession(sessionId);
      state = aggregationStates.get(sessionId)!;
    }

    // Add candidates
    state.candidates.push(...submission.candidates);

    // Update metadata
    if (submission.metadata) {
      state.metadata.explorationSummary = submission.metadata.explorationSummary;
      state.metadata.filesAnalyzed = submission.metadata.filesAnalyzed;
      state.metadata.patternsIdentified = submission.metadata.patternsIdentified;
    }

    // Accumulate tokens
    if (submission.tokensUsed) {
      state.tokensUsed.input += submission.tokensUsed.input;
      state.tokensUsed.output += submission.tokensUsed.output;
    }

    logger.info('[ResultAggregator] Candidates recorded', {
      sessionId,
      candidateCount: submission.candidates.length,
      totalCandidates: state.candidates.length,
    });
  },

  /**
   * Record evaluations from Claude Code submission
   */
  recordEvaluations(
    sessionId: string,
    submission: EvaluationSubmission,
    appliedChanges: GoalStatusChange[]
  ): void {
    let state = aggregationStates.get(sessionId);
    if (!state) {
      this.initSession(sessionId);
      state = aggregationStates.get(sessionId)!;
    }

    // Add evaluations
    state.evaluations.push(...submission.evaluations);

    // Add status changes
    state.statusChanges.push(...appliedChanges);

    // Update metadata
    if (submission.metadata) {
      state.metadata.implementationEvidence = submission.metadata.implementationEvidence;
    }

    // Accumulate tokens
    if (submission.tokensUsed) {
      state.tokensUsed.input += submission.tokensUsed.input;
      state.tokensUsed.output += submission.tokensUsed.output;
    }

    logger.info('[ResultAggregator] Evaluations recorded', {
      sessionId,
      evaluationCount: submission.evaluations.length,
      statusChanges: appliedChanges.length,
    });
  },

  /**
   * Get the aggregated result for a session
   */
  getResult(sessionId: string): AggregationState | null {
    return aggregationStates.get(sessionId) || null;
  },

  /**
   * Build final AutomationCycleResult from aggregated state
   */
  buildFinalResult(
    sessionId: string,
    projectId: string,
    projectName: string
  ): AutomationCycleResult {
    const state = aggregationStates.get(sessionId);

    if (!state) {
      // Return empty result if no state
      return {
        id: sessionId,
        projectId,
        projectName,
        timestamp: new Date().toISOString(),
        duration: 0,
        goalsEvaluated: 0,
        statusesUpdated: [],
        goalsGenerated: [],
        tasksCreated: [],
        tokensUsed: { input: 0, output: 0 },
        errors: [],
      };
    }

    return {
      id: sessionId,
      projectId,
      projectName,
      timestamp: new Date().toISOString(),
      duration: Date.now() - state.startTime,
      goalsEvaluated: state.evaluations.length,
      statusesUpdated: state.statusChanges,
      goalsGenerated: state.candidates,
      tasksCreated: [], // Tasks created separately
      tokensUsed: state.tokensUsed,
      errors: [],
    };
  },

  /**
   * Check if a session has received all expected results
   */
  isComplete(sessionId: string, expectedModes: {
    generateGoals: boolean;
    evaluateGoals: boolean;
  }): boolean {
    const state = aggregationStates.get(sessionId);
    if (!state) return false;

    // Check if we received expected data
    if (expectedModes.generateGoals && state.candidates.length === 0) {
      return false;
    }
    if (expectedModes.evaluateGoals && state.evaluations.length === 0) {
      return false;
    }

    return true;
  },

  /**
   * Finalize and persist session result
   */
  finalizeSession(sessionId: string, projectId: string, projectName: string): AutomationCycleResult | null {
    const session = automationSessionRepository.getById(sessionId);
    if (!session) {
      logger.error('[ResultAggregator] Session not found', { sessionId });
      return null;
    }

    const result = this.buildFinalResult(sessionId, projectId, projectName);

    // Mark session as complete with result
    automationSessionRepository.complete(sessionId, result);

    // Cleanup aggregation state
    aggregationStates.delete(sessionId);

    logger.info('[ResultAggregator] Session finalized', {
      sessionId,
      candidates: result.goalsGenerated.length,
      evaluations: result.goalsEvaluated,
      statusChanges: result.statusesUpdated.length,
      duration: result.duration,
    });

    return result;
  },

  /**
   * Handle session failure
   */
  failSession(sessionId: string, errorMessage: string): void {
    automationSessionRepository.fail(sessionId, errorMessage);
    aggregationStates.delete(sessionId);
    logger.error('[ResultAggregator] Session failed', { sessionId, errorMessage });
  },

  /**
   * Get summary of all active aggregation sessions
   */
  getActiveSessions(): Array<{
    sessionId: string;
    candidateCount: number;
    evaluationCount: number;
    elapsedMs: number;
  }> {
    return Array.from(aggregationStates.entries()).map(([sessionId, state]) => ({
      sessionId,
      candidateCount: state.candidates.length,
      evaluationCount: state.evaluations.length,
      elapsedMs: Date.now() - state.startTime,
    }));
  },

  /**
   * Cleanup stale aggregation states (older than 1 hour)
   */
  cleanupStale(): number {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    let cleaned = 0;

    for (const [sessionId, state] of aggregationStates.entries()) {
      if (state.startTime < oneHourAgo) {
        aggregationStates.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info('[ResultAggregator] Cleaned up stale sessions', { count: cleaned });
    }

    return cleaned;
  },
};
