import { NextRequest, NextResponse } from 'next/server';
import { readRequirement, updateRequirement } from '@/app/Claude/lib/claudeCodeManager';
import { validateRequired, errorResponse, handleOperationResult } from '@/lib/api-errors';
import { withObservability } from '@/lib/observability/middleware';

/**
 * GET /api/claude-code/requirements/[name]
 * Read a specific requirement by name
 *
 * Query params:
 * - projectPath: string (required)
 */
async function handleGet(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const { searchParams } = new URL(request.url);
    const projectPath = searchParams.get('projectPath');

    const validationError = validateRequired({ projectPath }, ['projectPath']);
    if (validationError) return validationError;

    const result = readRequirement(projectPath!, decodeURIComponent(name));
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to read requirement' },
        { status: 404 }
      );
    }

    return NextResponse.json({ content: result.content });
  } catch (error) {
    return errorResponse(error, 'Error in GET /api/claude-code/requirements/[name]');
  }
}

/**
 * PUT /api/claude-code/requirements/[name]
 * Update a specific requirement's content
 *
 * Body:
 * - projectPath: string (required)
 * - content: string (required)
 */
async function handlePut(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const body = await request.json();
    const { projectPath, content } = body;

    const validationError = validateRequired({ projectPath, content }, ['projectPath', 'content']);
    if (validationError) return validationError;

    const result = updateRequirement(projectPath, decodeURIComponent(name), content);
    return handleOperationResult(
      result,
      'Requirement updated successfully',
      'Failed to update requirement'
    );
  } catch (error) {
    return errorResponse(error, 'Error in PUT /api/claude-code/requirements/[name]');
  }
}

export const GET = withObservability(handleGet, '/api/claude-code/requirements/[name]');
export const PUT = withObservability(handlePut, '/api/claude-code/requirements/[name]');
