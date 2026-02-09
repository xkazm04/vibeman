/**
 * API Route: Executive Analysis
 *
 * GET /api/reflector/executive-analysis - Get analysis status or history
 * POST /api/reflector/executive-analysis - Trigger new analysis
 * PATCH /api/reflector/executive-analysis - Cancel running analysis
 */

import { NextRequest } from 'next/server';
import { executiveAnalysisAgent } from '@/lib/reflector/executiveAnalysisAgent';
import type { TimeWindow } from '@/app/features/reflector/sub_Reflection/lib/types';
import {
  successResponse,
  validationError,
  handleApiError,
  createApiErrorResponse,
  ApiErrorCode,
} from '@/lib/api-errors';

/**
 * GET - Get analysis status or history
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const mode = searchParams.get('mode'); // 'status' | 'history'

    if (mode === 'history') {
      const limit = parseInt(searchParams.get('limit') || '10', 10);
      const history = executiveAnalysisAgent.getHistory(projectId, limit);
      return successResponse({ history });
    }

    // Default: return status
    const status = executiveAnalysisAgent.getStatus(projectId);
    return successResponse({ ...status });
  } catch (error) {
    return handleApiError(error, 'executive analysis GET');
  }
}

/**
 * POST - Trigger new analysis
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      projectName,
      contextId,
      contextName,
      timeWindow = 'all',
    } = body;

    const result = await executiveAnalysisAgent.startAnalysis({
      projectId: projectId || null,
      projectName,
      contextId: contextId || null,
      contextName,
      timeWindow: timeWindow as TimeWindow,
    });

    if (!result.success) {
      return createApiErrorResponse(
        result.analysisId ? ApiErrorCode.RESOURCE_CONFLICT : ApiErrorCode.VALIDATION_ERROR,
        result.error || 'Failed to start analysis',
        { details: result.analysisId ? { analysisId: result.analysisId } : undefined }
      );
    }

    return successResponse({
      analysisId: result.analysisId,
      promptContent: result.promptContent,
    });
  } catch (error) {
    return handleApiError(error, 'executive analysis POST');
  }
}

/**
 * PATCH - Cancel running analysis
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { analysisId, error = 'Cancelled by user' } = body;

    if (!analysisId) {
      return validationError('analysisId is required');
    }

    const cancelled = executiveAnalysisAgent.failAnalysis(analysisId, error);

    return successResponse({ cancelled });
  } catch (error) {
    return handleApiError(error, 'executive analysis PATCH');
  }
}
