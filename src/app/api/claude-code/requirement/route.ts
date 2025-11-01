import { NextRequest, NextResponse } from 'next/server';
import { deleteRequirement } from '@/app/Claude/lib/claudeCodeManager';

/**
 * DELETE /api/claude-code/requirement
 * Delete a requirement file from the .claude/commands directory
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectPath, requirementName } = body;

    if (!projectPath || !requirementName) {
      return NextResponse.json(
        { error: 'projectPath and requirementName are required' },
        { status: 400 }
      );
    }

    console.log('[Delete Requirement] Deleting requirement:', requirementName);

    const result = deleteRequirement(projectPath, requirementName);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to delete requirement' },
        { status: 404 }
      );
    }

    console.log('[Delete Requirement] Successfully deleted requirement');

    return NextResponse.json({
      success: true,
      message: 'Requirement deleted successfully',
    });
  } catch (error) {
    console.error('[Delete Requirement] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete requirement',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
