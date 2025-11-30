/**
 * Adaptive Learning API
 * Endpoints for the self-optimizing development cycle
 */

import { NextResponse } from 'next/server';
import { ideaDb, scoringThresholdDb, ideaExecutionOutcomeDb } from '@/app/db';
import {
  calculateAdaptiveScore,
  getLearningMetrics,
  getAdaptiveConfig,
  checkThresholds,
  recordExecutionOutcome,
} from '@/app/features/Ideas/sub_Vibeman/lib/adaptiveLearning';

function errorResponse(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status });
}

function successResponse<T>(data: T) {
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, projectId, ideaId, ...params } = body;

    if (!action) {
      return errorResponse('Action is required');
    }

    switch (action) {
      case 'get-score': {
        // Calculate adaptive score for an idea
        if (!ideaId) {
          return errorResponse('ideaId is required');
        }

        const idea = ideaDb.getIdeaById(ideaId);
        if (!idea) {
          return errorResponse('Idea not found', 404);
        }

        const score = calculateAdaptiveScore(idea, idea.project_id);
        const thresholdCheck = checkThresholds(idea.project_id, score);

        return successResponse({
          ideaId,
          score,
          recommendedAction: thresholdCheck.action,
          threshold: thresholdCheck.threshold,
        });
      }

      case 'get-metrics': {
        // Get learning metrics for a project
        if (!projectId) {
          return errorResponse('projectId is required');
        }

        const metrics = getLearningMetrics(projectId);
        return successResponse({ projectId, metrics });
      }

      case 'get-config': {
        // Get adaptive configuration (weights & thresholds)
        if (!projectId) {
          return errorResponse('projectId is required');
        }

        const config = getAdaptiveConfig(projectId);
        return successResponse({ projectId, config });
      }

      case 'record-outcome': {
        // Record an execution outcome
        if (!ideaId) {
          return errorResponse('ideaId is required');
        }

        const idea = ideaDb.getIdeaById(ideaId);
        if (!idea) {
          return errorResponse('Idea not found', 404);
        }

        const outcome = await recordExecutionOutcome(idea, {
          success: params.success ?? false,
          executionTimeMs: params.executionTimeMs,
          filesChanged: params.filesChanged,
          linesAdded: params.linesAdded,
          linesRemoved: params.linesRemoved,
          errorType: params.errorType,
        });

        return successResponse({ outcome });
      }

      case 'update-threshold': {
        // Update a threshold configuration
        if (!params.thresholdId) {
          return errorResponse('thresholdId is required');
        }

        const updated = scoringThresholdDb.update(params.thresholdId, {
          min_score: params.minScore,
          max_score: params.maxScore,
          min_confidence: params.minConfidence,
          enabled: params.enabled,
        });

        if (!updated) {
          return errorResponse('Threshold not found', 404);
        }

        return successResponse({ threshold: updated });
      }

      case 'update-feedback': {
        // Update user feedback score on an outcome
        if (!params.outcomeId || params.feedbackScore === undefined) {
          return errorResponse('outcomeId and feedbackScore are required');
        }

        const updated = ideaExecutionOutcomeDb.updateActualMetrics(params.outcomeId, {
          user_feedback_score: params.feedbackScore,
        });

        if (!updated) {
          return errorResponse('Outcome not found', 404);
        }

        return successResponse({ outcome: updated });
      }

      case 'batch-scores': {
        // Calculate scores for multiple ideas
        if (!projectId) {
          return errorResponse('projectId is required');
        }

        const ideas = ideaDb.getIdeasByProject(projectId)
          .filter(i => i.status === 'pending');

        const scores = ideas.map(idea => {
          const score = calculateAdaptiveScore(idea, projectId);
          const thresholdCheck = checkThresholds(projectId, score);

          return {
            ideaId: idea.id,
            title: idea.title,
            category: idea.category,
            effort: idea.effort,
            impact: idea.impact,
            score,
            recommendedAction: thresholdCheck.action,
          };
        });

        // Sort by adjusted score descending
        scores.sort((a, b) => b.score.adjustedScore - a.score.adjustedScore);

        return successResponse({ projectId, ideas: scores });
      }

      case 'get-history': {
        // Get execution history for a project
        if (!projectId) {
          return errorResponse('projectId is required');
        }

        const limit = params.limit ?? 50;
        const outcomes = ideaExecutionOutcomeDb.getByProject(projectId, limit);

        return successResponse({ projectId, outcomes });
      }

      default:
        return errorResponse(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('Adaptive learning API error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const type = searchParams.get('type') || 'metrics';

    if (!projectId) {
      return errorResponse('projectId is required');
    }

    switch (type) {
      case 'metrics':
        return successResponse({
          projectId,
          metrics: getLearningMetrics(projectId),
        });

      case 'config':
        return successResponse({
          projectId,
          config: getAdaptiveConfig(projectId),
        });

      case 'history':
        const limit = parseInt(searchParams.get('limit') || '50', 10);
        return successResponse({
          projectId,
          outcomes: ideaExecutionOutcomeDb.getByProject(projectId, limit),
        });

      case 'success-rates':
        return successResponse({
          projectId,
          rates: ideaExecutionOutcomeDb.getSuccessRateByCategory(projectId),
        });

      case 'prediction-accuracy':
        return successResponse({
          projectId,
          accuracy: ideaExecutionOutcomeDb.getPredictionAccuracy(projectId),
        });

      default:
        return errorResponse(`Unknown type: ${type}`);
    }
  } catch (error) {
    console.error('Adaptive learning GET error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}
