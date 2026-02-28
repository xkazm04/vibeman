import { NextRequest, NextResponse } from 'next/server';
import { claudeFolderExists, isClaudeFolderInitialized } from '@/app/Claude/lib/claudeCodeManager';
import { validateRequired, errorResponse } from '@/lib/api-errors';
import { withObservability } from '@/lib/observability/middleware';

/**
 * GET /api/claude-code/status
 * Check Claude folder status via query params
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

    const exists = claudeFolderExists(projectPath!);
    const initStatus = isClaudeFolderInitialized(projectPath!);

    return NextResponse.json({
      exists,
      initialized: initStatus.initialized,
      missing: initStatus.missing,
    });
  } catch (error) {
    return errorResponse(error, 'Error in GET /api/claude-code/status');
  }
}

/**
 * POST /api/claude-code/status
 * Check the initialization status of Claude Code folder structure
 */
async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectPath } = body;

    if (!projectPath) {
      return NextResponse.json(
        { error: 'Project path is required' },
        { status: 400 }
      );
    }

    // Check Claude Code folder status
    const status = isClaudeFolderInitialized(projectPath);

    return NextResponse.json({
      exists: status.initialized || status.missing.length < 4, // Folder exists if not all items missing
      initialized: status.initialized,
      missing: status.missing,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check status' },
      { status: 500 }
    );
  }
}

export const GET = withObservability(handleGet, '/api/claude-code/status');
export const POST = withObservability(handlePost, '/api/claude-code/status');
