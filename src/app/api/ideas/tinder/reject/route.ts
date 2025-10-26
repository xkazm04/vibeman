import { NextRequest, NextResponse } from 'next/server';
import { ideaDb } from '@/app/db';

/**
 * POST /api/ideas/tinder/reject
 * Reject an idea
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ideaId } = body;

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

    // Update idea status to rejected
    ideaDb.updateIdea(ideaId, { status: 'rejected' });
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
