/**
 * Architecture Analysis Completion Callback
 * POST - Called by Claude Code after analysis completes
 */

import { NextRequest } from 'next/server';
import { architectureAnalysisAgent } from '@/lib/architecture/analysisAgent';
import {
  successResponse,
  validationError,
  notFoundError,
  handleApiError,
  createApiErrorResponse,
  ApiErrorCode,
} from '@/lib/api-errors';

interface RouteParams {
  params: Promise<{
    analysisId: string;
  }>;
}

/**
 * Validate the architecture analysis completion body.
 * Must contain relationships array, patterns array, recommendations array, and narrative string.
 */
function validateCompletionBody(body: unknown): body is {
  relationships: unknown[];
  patterns: unknown[];
  recommendations: unknown[];
  narrative: string;
  project_metadata?: Record<string, unknown>;
} {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;

  return (
    Array.isArray(b.relationships) &&
    Array.isArray(b.patterns) &&
    Array.isArray(b.recommendations) &&
    typeof b.narrative === 'string'
  );
}

/**
 * POST /api/architecture/analyze/[analysisId]/complete
 * Complete an architecture analysis with results
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { analysisId } = await params;

    const analysis = architectureAnalysisAgent.getAnalysis(analysisId);
    if (!analysis) {
      return notFoundError('Analysis session');
    }

    if (analysis.status === 'completed') {
      return createApiErrorResponse(
        ApiErrorCode.RESOURCE_CONFLICT,
        'Analysis already completed',
        { details: { analysisId, status: analysis.status } }
      );
    }

    if (analysis.status === 'failed') {
      return createApiErrorResponse(
        ApiErrorCode.RESOURCE_CONFLICT,
        'Analysis has failed',
        { details: { analysisId, status: analysis.status } }
      );
    }

    const body = await request.json();

    if (!validateCompletionBody(body)) {
      return validationError(
        'Invalid request body. Required: relationships (array), patterns (array), recommendations (array), narrative (string)'
      );
    }

    const result = await architectureAnalysisAgent.completeAnalysis(analysisId, body);

    if (!result.success) {
      return createApiErrorResponse(
        ApiErrorCode.OPERATION_FAILED,
        result.error || 'Failed to complete analysis',
        { details: { analysisId } }
      );
    }

    return successResponse({
      analysisId,
      analysis: result.analysis,
      relationshipsCreated: result.relationshipsCreated,
    });
  } catch (error) {
    // Try to mark analysis as failed
    try {
      const { analysisId } = await params;
      architectureAnalysisAgent.failAnalysis(
        analysisId,
        error instanceof Error ? error.message : 'Unknown error'
      );
    } catch {
      // Ignore failure to mark as failed
    }

    return handleApiError(error, 'complete architecture analysis');
  }
}
