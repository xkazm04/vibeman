import { NextRequest, NextResponse } from 'next/server';
import { deleteRequirement, createRequirement } from '@/app/Claude/lib/claudeCodeManager';
import { withObservability } from '@/lib/observability/middleware';

/**
 * POST /api/claude-code/requirement
 * Create a new requirement file in the .claude/commands directory
 */
async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectPath, requirementName, content, overwrite = false } = body;

    if (!projectPath || !requirementName || !content) {
      return NextResponse.json(
        { error: 'projectPath, requirementName, and content are required' },
        { status: 400 }
      );
    }

    const result = createRequirement(projectPath, requirementName, content, overwrite);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to create requirement' },
        { status: 400 }
      );
    }

    // Extract just the filename for the response
    const fileName = result.filePath?.split(/[\\/]/).pop() || `${requirementName}.md`;

    return NextResponse.json({
      success: true,
      message: 'Requirement created successfully',
      fileName,
      filePath: result.filePath,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to create requirement',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/claude-code/requirement
 * Delete a requirement file from the .claude/commands directory
 */
async function handleDelete(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectPath, requirementName } = body;

    if (!projectPath || !requirementName) {
      return NextResponse.json(
        { error: 'projectPath and requirementName are required' },
        { status: 400 }
      );
    }

    const result = deleteRequirement(projectPath, requirementName);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to delete requirement' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Requirement deleted successfully',
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to delete requirement',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export const POST = withObservability(handlePost, '/api/claude-code/requirement');
export const DELETE = withObservability(handleDelete, '/api/claude-code/requirement');
