import { NextRequest, NextResponse } from 'next/server';
import { ideaDb } from '@/app/db';
import { deleteRequirement } from '@/app/Claude/lib/claudeCodeManager';

/**
 * DELETE /api/contexts/ideas
 * Delete all ideas associated with a specific context_id
 * Also deletes any associated requirement files
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contextId = searchParams.get('contextId');
    const projectPath = searchParams.get('projectPath');

    if (!contextId) {
      return NextResponse.json(
        { error: 'contextId is required' },
        { status: 400 }
      );
    }

    console.log('[Delete Context Ideas] Deleting ideas for context:', contextId);

    // Get all ideas for this context
    const ideas = ideaDb.getIdeasByContext(contextId);
    console.log(`[Delete Context Ideas] Found ${ideas.length} idea(s) to delete`);

    // Delete requirement files if they exist and projectPath is provided
    if (projectPath) {
      for (const idea of ideas) {
        if (idea.requirement_id) {
          try {
            console.log('[Delete Context Ideas] Deleting requirement file:', idea.requirement_id);
            const deleteResult = deleteRequirement(projectPath, idea.requirement_id);
            if (deleteResult.success) {
              console.log('[Delete Context Ideas] Requirement file deleted successfully');
            } else {
              console.warn('[Delete Context Ideas] Failed to delete requirement file:', deleteResult.error);
            }
          } catch (deleteError) {
            console.error('[Delete Context Ideas] Error deleting requirement file:', deleteError);
            // Continue with other deletions
          }
        }
      }
    }

    // Delete all ideas from database
    const deletedCount = ideaDb.deleteIdeasByContext(contextId);
    console.log(`[Delete Context Ideas] Deleted ${deletedCount} idea(s)`);

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `Deleted ${deletedCount} idea(s) from context`,
    });
  } catch (error) {
    console.error('[Delete Context Ideas] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete context ideas',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
