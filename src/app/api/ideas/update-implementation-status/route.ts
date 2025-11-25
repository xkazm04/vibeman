import { NextRequest, NextResponse } from 'next/server';
import { ideaDb, contextDb } from '@/app/db';

/**
 * POST /api/ideas/update-implementation-status
 * Update idea status to 'implemented' based on requirement name
 * Also increments the context's implemented_tasks counter if applicable
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

    // Find idea by requirement_id
    const idea = ideaDb.getIdeaByRequirementId(requirementName);

    if (!idea) {
      return NextResponse.json({
        updated: false,
        message: 'No idea found with this requirement_id',
      });
    }

    // Update idea status to 'implemented'
    const updatedIdea = ideaDb.updateIdea(idea.id, { status: 'implemented' });

    if (!updatedIdea) {
      throw new Error('Failed to update idea status');
    }

    // Increment context's implemented_tasks counter if idea has a context
    let contextUpdated = false;
    if (idea.context_id) {
      const updatedContext = contextDb.incrementImplementedTasks(idea.context_id);
      contextUpdated = updatedContext !== null;
    }

    return NextResponse.json({
      updated: true,
      ideaId: idea.id,
      contextUpdated,
      message: 'Idea status updated to implemented',
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to update idea status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
