import { NextRequest, NextResponse } from 'next/server';
import {
  deleteRequirement,
} from '@/app/Claude/lib/claudeCodeManager';
import { validateRequired, errorResponse, handleOperationResult } from '@/lib/api-errors';
import { withObservability } from '@/lib/observability/middleware';

/**
 * DELETE /api/claude-code
 * Delete a requirement
 *
 * Body:
 * - projectPath: string (required)
 * - requirementName: string (required)
 */
async function handleDelete(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectPath, requirementName } = body;

    const validationError = validateRequired({ projectPath, requirementName }, ['projectPath', 'requirementName']);
    if (validationError) return validationError;

    const result = deleteRequirement(projectPath, requirementName);
    return handleOperationResult(
      result,
      'Requirement deleted successfully',
      'Failed to delete requirement'
    );
  } catch (error) {
    return errorResponse(error, 'Error in DELETE /api/claude-code');
  }
}

export const DELETE = withObservability(handleDelete, '/api/claude-code');
