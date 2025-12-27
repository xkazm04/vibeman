/**
 * Evaluation Submission API
 * Endpoint for Claude Code to submit goal evaluation results during automation
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { automationSessionRepository } from '@/app/db/repositories/automation-session.repository';
import { goalDb } from '@/app/db';
import type {
  EvaluationSubmission,
  GoalEvaluationResult,
  GoalStatusChange,
  AutomationCycleResult,
} from '@/lib/standupAutomation/types';

/**
 * POST /api/standup/automation/evaluations
 * Submit goal evaluation results from Claude Code automation
 *
 * Body: EvaluationSubmission
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as EvaluationSubmission;
    const { projectId, sessionId, claudeSessionId, evaluations, metadata, tokensUsed } = body;

    // Validate required fields
    if (!projectId || !sessionId || !evaluations) {
      return NextResponse.json(
        { success: false, error: 'projectId, sessionId, and evaluations are required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(evaluations)) {
      return NextResponse.json(
        { success: false, error: 'evaluations must be an array' },
        { status: 400 }
      );
    }

    logger.info('[Evaluations API] Receiving evaluations from Claude Code', {
      sessionId,
      projectId,
      evaluationCount: evaluations.length,
      claudeSessionId,
    });

    // Get the session
    const session = automationSessionRepository.getById(sessionId);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Automation session not found' },
        { status: 404 }
      );
    }

    // Verify project ID matches
    if (session.project_id !== projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID mismatch' },
        { status: 400 }
      );
    }

    // Update Claude session ID if provided
    if (claudeSessionId && !session.claude_session_id) {
      automationSessionRepository.updateClaudeSessionId(sessionId, claudeSessionId);
    }

    // Process evaluations and optionally apply status updates
    const config = automationSessionRepository.parseConfig(session);
    const statusChanges: GoalStatusChange[] = [];
    const validatedEvaluations: GoalEvaluationResult[] = [];

    for (const evaluation of evaluations) {
      if (!evaluation.goalId) {
        logger.warn('[Evaluations API] Skipping evaluation without goalId');
        continue;
      }

      const validatedEval: GoalEvaluationResult = {
        goalId: evaluation.goalId,
        shouldUpdate: !!evaluation.shouldUpdate,
        currentStatus: evaluation.currentStatus || 'unknown',
        recommendedStatus: evaluation.recommendedStatus,
        evidence: evaluation.evidence || '',
        blockers: evaluation.blockers || [],
        progress: typeof evaluation.progress === 'number' ? evaluation.progress : 0,
        confidence: typeof evaluation.confidence === 'number' ? evaluation.confidence : 0,
        reasoning: evaluation.reasoning || '',
      };

      validatedEvaluations.push(validatedEval);

      // Apply status update if configured and evaluation recommends it
      if (
        config.modes.updateStatuses &&
        validatedEval.shouldUpdate &&
        validatedEval.recommendedStatus &&
        validatedEval.confidence >= 70 // Only apply high-confidence updates
      ) {
        try {
          const goal = goalDb.getGoalById(validatedEval.goalId);
          const validStatuses = ['open', 'in_progress', 'done', 'rejected', 'undecided'] as const;
          type GoalStatus = typeof validStatuses[number];

          // Validate the recommended status before applying
          if (
            goal &&
            goal.status !== validatedEval.recommendedStatus &&
            validStatuses.includes(validatedEval.recommendedStatus as GoalStatus)
          ) {
            // Update the goal status
            goalDb.updateGoal(validatedEval.goalId, {
              status: validatedEval.recommendedStatus as GoalStatus,
            });

            statusChanges.push({
              goalId: validatedEval.goalId,
              goalTitle: goal.title,
              previousStatus: goal.status,
              newStatus: validatedEval.recommendedStatus,
              evidence: validatedEval.evidence,
              changedAt: new Date().toISOString(),
              autoApplied: true,
            });

            logger.info('[Evaluations API] Goal status updated', {
              goalId: goal.id,
              from: goal.status,
              to: validatedEval.recommendedStatus,
              confidence: validatedEval.confidence,
            });
          }
        } catch (error) {
          logger.error('[Evaluations API] Failed to update goal status', {
            goalId: validatedEval.goalId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    // Get existing result to merge
    const existingResult = automationSessionRepository.parseResult(session);

    // Build final result
    const finalResult: AutomationCycleResult = {
      id: sessionId,
      projectId,
      projectName: existingResult?.projectName || '',
      timestamp: existingResult?.timestamp || new Date().toISOString(),
      duration: Date.now() - new Date(session.started_at).getTime(),
      goalsEvaluated: validatedEvaluations.length,
      statusesUpdated: statusChanges,
      goalsGenerated: existingResult?.goalsGenerated || [],
      tasksCreated: existingResult?.tasksCreated || [],
      tokensUsed: {
        input: (existingResult?.tokensUsed?.input || 0) + (tokensUsed?.input || 0),
        output: (existingResult?.tokensUsed?.output || 0) + (tokensUsed?.output || 0),
      },
      errors: existingResult?.errors || [],
    };

    // Complete the session
    automationSessionRepository.complete(sessionId, finalResult);

    logger.info('[Evaluations API] Session completed', {
      sessionId,
      goalsEvaluated: validatedEvaluations.length,
      statusesUpdated: statusChanges.length,
      duration: finalResult.duration,
    });

    return NextResponse.json({
      success: true,
      message: 'Evaluations processed and session completed',
      summary: {
        evaluationsReceived: validatedEvaluations.length,
        statusesUpdated: statusChanges.length,
        sessionPhase: 'complete',
      },
      result: finalResult,
    });
  } catch (error) {
    logger.error('[Evaluations API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process evaluations',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/standup/automation/evaluations
 * Get evaluations for a session (for debugging/monitoring)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'sessionId query parameter required' },
        { status: 400 }
      );
    }

    const session = automationSessionRepository.getById(sessionId);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    const result = automationSessionRepository.parseResult(session);

    return NextResponse.json({
      success: true,
      sessionId,
      phase: session.phase,
      goalsEvaluated: result?.goalsEvaluated || 0,
      statusesUpdated: result?.statusesUpdated || [],
    });
  } catch (error) {
    logger.error('[Evaluations API] GET Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get evaluations',
      },
      { status: 500 }
    );
  }
}
