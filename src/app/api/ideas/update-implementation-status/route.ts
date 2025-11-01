import { NextRequest, NextResponse } from 'next/server';
import { ideaDb } from '@/app/db';

/**
 * POST /api/ideas/update-implementation-status
 * Update idea status to 'implemented' based on requirement name
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requirementName } = body;

    if (!requirementName) {
      return NextResponse.json(
        { error: 'requirementName is required' },
        { status: 400 }
      );
    }

    console.log('[Update Implementation Status] Looking for idea with requirement_id:', requirementName);

    // Find idea by requirement_id
    const idea = ideaDb.getIdeaByRequirementId(requirementName);

    if (!idea) {
      console.log('[Update Implementation Status] No idea found with requirement_id:', requirementName);
      return NextResponse.json({
        updated: false,
        message: 'No idea found with this requirement_id',
      });
    }

    console.log('[Update Implementation Status] Found idea:', idea.id, 'Current status:', idea.status);

    // Update idea status to 'implemented'
    const updatedIdea = ideaDb.updateIdea(idea.id, { status: 'implemented' });

    if (!updatedIdea) {
      throw new Error('Failed to update idea status');
    }

    console.log('[Update Implementation Status] Successfully updated idea to implemented:', idea.id);

    return NextResponse.json({
      updated: true,
      ideaId: idea.id,
      message: 'Idea status updated to implemented',
    });
  } catch (error) {
    console.error('[Update Implementation Status] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update idea status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
