import { NextRequest, NextResponse } from 'next/server';
import { ideaDb } from '@/app/db';
import { deleteRequirement } from '@/app/Claude/lib/claudeCodeManager';

/**
 * POST /api/ideas/tinder/reject
 * Reject an idea and delete associated requirement file if it exists
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ideaId, projectPath } = body;

    if (!ideaId) {
      return NextResponse.json(
        { error: 'ideaId is required' },
        { status: 400 }
      );
    }

    console.log('[Tinder Reject] Processing idea:', ideaId);

    // Get the idea to verify it exists
    const idea = ideaDb.getIdeaById(ideaId);
    if (!idea) {
      return NextResponse.json(
        { error: 'Idea not found' },
        { status: 404 }
      );
    }

    // Delete requirement file if it exists
    if (idea.requirement_id && projectPath) {
      try {
        console.log('[Tinder Reject] Deleting requirement file:', idea.requirement_id);
        const deleteResult = deleteRequirement(projectPath, idea.requirement_id);
        if (deleteResult.success) {
          console.log('[Tinder Reject] Requirement file deleted successfully');
        } else {
          console.warn('[Tinder Reject] Failed to delete requirement file:', deleteResult.error);
        }
      } catch (deleteError) {
        console.error('[Tinder Reject] Error deleting requirement file:', deleteError);
        // Don't fail the rejection if file deletion fails
      }
    }

    // Update idea status to rejected and clear requirement_id
    ideaDb.updateIdea(ideaId, { status: 'rejected', requirement_id: null });
    console.log('[Tinder Reject] Updated idea status to rejected');

    return NextResponse.json({
      success: true,
      message: 'Idea rejected',
    });
  } catch (error) {
    console.error('[Tinder Reject] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to reject idea',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
