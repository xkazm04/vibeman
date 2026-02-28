import { NextRequest, NextResponse } from 'next/server';
import { listRequirements } from '@/app/Claude/lib/claudeCodeManager';
import { validateRequired, errorResponse, handleOperationResult } from '@/lib/api-errors';
import { withObservability } from '@/lib/observability/middleware';

/**
 * GET /api/claude-code/requirements
 * List all requirements for a project
 *
 * Query params:
 * - projectPath: string (required)
 */
async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectPath = searchParams.get('projectPath');

    const validationError = validateRequired({ projectPath }, ['projectPath']);
    if (validationError) return validationError;

    const result = listRequirements(projectPath!);
    return handleOperationResult(
      result,
      'Requirements listed successfully',
      'Failed to list requirements'
    );
  } catch (error) {
    return errorResponse(error, 'Error in GET /api/claude-code/requirements');
  }
}

export const GET = withObservability(handleGet, '/api/claude-code/requirements');
