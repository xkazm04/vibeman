import { NextRequest, NextResponse } from 'next/server';
import { readClaudeSettings, updateClaudeSettings } from '@/app/Claude/lib/claudeCodeManager';
import { validateRequired, errorResponse, handleOperationResult } from '@/lib/api-errors';
import { withObservability } from '@/lib/observability/middleware';

/**
 * GET /api/claude-code/settings
 * Read Claude settings for a project
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

    const result = readClaudeSettings(projectPath!);
    return handleOperationResult(
      result,
      'Settings read successfully',
      'Failed to read settings'
    );
  } catch (error) {
    return errorResponse(error, 'Error in GET /api/claude-code/settings');
  }
}

/**
 * PUT /api/claude-code/settings
 * Update Claude settings for a project
 *
 * Body:
 * - projectPath: string (required)
 * - settings: object (required)
 */
async function handlePut(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectPath, settings } = body;

    const validationError = validateRequired({ projectPath, settings }, ['projectPath', 'settings']);
    if (validationError) return validationError;

    const result = updateClaudeSettings(projectPath, settings);
    return handleOperationResult(
      result,
      'Settings updated successfully',
      'Failed to update settings'
    );
  } catch (error) {
    return errorResponse(error, 'Error in PUT /api/claude-code/settings');
  }
}

export const GET = withObservability(handleGet, '/api/claude-code/settings');
export const PUT = withObservability(handlePut, '/api/claude-code/settings');
