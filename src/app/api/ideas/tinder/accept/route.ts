import { NextRequest, NextResponse } from 'next/server';
import { ideaDb, goalDb, contextDb } from '@/app/db';
import { createRequirement } from '@/app/Claude/lib/claudeCodeManager';
import { buildRequirementFromIdea } from '@/lib/scanner/reqFileBuilder';

/**
 * POST /api/ideas/tinder/accept
 * Accept an idea and generate requirement file
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ideaId, projectPath } = body;

    if (!ideaId || !projectPath) {
      return NextResponse.json(
        { error: 'ideaId and projectPath are required' },
        { status: 400 }
      );
    }

    console.log('[Tinder Accept] Processing idea:', ideaId);

    // 1. Get the idea
    const idea = ideaDb.getIdeaById(ideaId);
    if (!idea) {
      return NextResponse.json(
        { error: 'Idea not found' },
        { status: 404 }
      );
    }

    // 2. Update idea status to accepted
    ideaDb.updateIdea(ideaId, { status: 'accepted' });
    console.log('[Tinder Accept] Updated idea status to accepted');

    // 3. Generate requirement file name
    const requirementName = `idea-${ideaId.substring(0, 8)}-${idea.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .substring(0, 30)}`;

    console.log('[Tinder Accept] Creating requirement:', requirementName);

    // 4. Fetch goal and context if they exist
    const goal = idea.goal_id ? goalDb.getGoalById(idea.goal_id) : null;
    const context = idea.context_id ? contextDb.getContextById(idea.context_id) : null;

    console.log('[Tinder Accept] Associated goal:', goal?.title || 'none');
    console.log('[Tinder Accept] Associated context:', context?.name || 'none');

    // 5. Build requirement content using unified builder
    const content = buildRequirementFromIdea({
      idea,
      goal,
      context,
    });

    // 6. Create requirement file (overwrite if exists)
    const createResult = createRequirement(projectPath, requirementName, content, true);

    if (!createResult.success) {
      // Rollback status change
      ideaDb.updateIdea(ideaId, { status: 'pending' });
      throw new Error(createResult.error || 'Failed to create requirement');
    }

    console.log('[Tinder Accept] Requirement created successfully');

    // 7. Update idea with requirement_id (the requirement file name)
    ideaDb.updateIdea(ideaId, { requirement_id: requirementName });
    console.log('[Tinder Accept] Updated idea with requirement_id:', requirementName);

    return NextResponse.json({
      success: true,
      requirementName,
      message: 'Idea accepted and requirement file created',
    });
  } catch (error) {
    console.error('[Tinder Accept] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to accept idea',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

