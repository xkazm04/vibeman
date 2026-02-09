/**
 * API Route: Executive Analysis Completion
 *
 * POST /api/reflector/executive-analysis/[analysisId]/complete
 * Called by Claude Code when analysis is complete
 */

import { NextRequest } from 'next/server';
import { executiveAnalysisAgent } from '@/lib/reflector/executiveAnalysisAgent';
import { executiveAnalysisDb } from '@/app/db';
import type { ExecutiveAIInsight, CompleteExecutiveAnalysisData } from '@/app/db/models/reflector.types';
import {
  successResponse,
  validationError,
  notFoundError,
  operationFailedError,
  handleApiError,
  createApiErrorResponse,
  ApiErrorCode,
} from '@/lib/api-errors';

interface CompletionRequestBody {
  ideasAnalyzed: number;
  directionsAnalyzed: number;
  insights: ExecutiveAIInsight[];
  narrative: string;
  recommendations: string[];
}

/**
 * Validate the completion request body
 */
function validateCompletionBody(body: unknown): body is CompletionRequestBody {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;

  return (
    typeof b.ideasAnalyzed === 'number' &&
    typeof b.directionsAnalyzed === 'number' &&
    Array.isArray(b.insights) &&
    typeof b.narrative === 'string' &&
    Array.isArray(b.recommendations)
  );
}

/**
 * POST - Complete analysis with results from Claude Code
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ analysisId: string }> }
) {
  try {
    const { analysisId } = await params;

    if (!analysisId) {
      return validationError('analysisId is required');
    }

    const analysis = executiveAnalysisDb.getById(analysisId);
    if (!analysis) {
      return notFoundError('Analysis');
    }

    if (analysis.status !== 'running') {
      return createApiErrorResponse(
        ApiErrorCode.RESOURCE_CONFLICT,
        `Analysis is not running (status: ${analysis.status})`,
        { details: { analysisId, status: analysis.status } }
      );
    }

    const body = await request.json();

    if (!validateCompletionBody(body)) {
      return validationError(
        'Invalid request body. Required: ideasAnalyzed (number), directionsAnalyzed (number), insights (array), narrative (string), recommendations (array)'
      );
    }

    // Validate insights structure
    for (const insight of body.insights) {
      if (!insight.type || !insight.title || !insight.description) {
        return validationError('Each insight must have type, title, and description');
      }
      if (typeof insight.confidence !== 'number' || insight.confidence < 0 || insight.confidence > 100) {
        insight.confidence = 50;
      }
      if (!Array.isArray(insight.evidence)) {
        insight.evidence = [];
      }
      if (typeof insight.actionable !== 'boolean') {
        insight.actionable = false;
      }
    }

    const completionData: CompleteExecutiveAnalysisData = {
      ideasAnalyzed: body.ideasAnalyzed,
      directionsAnalyzed: body.directionsAnalyzed,
      insights: body.insights,
      narrative: body.narrative,
      recommendations: body.recommendations,
    };

    const success = executiveAnalysisAgent.completeAnalysis(analysisId, completionData);

    if (!success) {
      return operationFailedError('Complete analysis');
    }

    return successResponse({
      analysisId,
      insightsCount: body.insights.length,
      recommendationsCount: body.recommendations.length,
    });
  } catch (error) {
    return handleApiError(error, 'executive analysis completion');
  }
}
