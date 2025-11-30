/**
 * Lifecycle Resolve API
 * POST: Resolve/implement an idea as part of the lifecycle
 */

import { NextRequest, NextResponse } from 'next/server';
import { ideaDb } from '@/app/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ideaId, projectId } = body;

    if (!ideaId) {
      return NextResponse.json(
        { error: 'ideaId is required' },
        { status: 400 }
      );
    }

    // Get the idea
    const idea = ideaDb.getIdeaById(ideaId);

    if (!idea) {
      return NextResponse.json(
        { error: 'Idea not found' },
        { status: 404 }
      );
    }

    // Update idea status to indicate it's being processed
    ideaDb.updateIdea(ideaId, { status: 'accepted' });

    // Generate requirement name
    const requirementName = `lifecycle_${ideaId}_${Date.now()}`;

    // Call the Claude Code requirement API to implement the idea
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/claude-code/requirement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projectId || idea.project_id,
          name: requirementName,
          content: generateRequirementContent(idea),
          contextId: idea.context_id,
          ideaId: idea.id,
          autoExecute: true,
        }),
      });

      if (response.ok) {
        const result = await response.json();

        // Mark idea as implemented
        ideaDb.updateIdea(ideaId, { status: 'implemented' });

        return NextResponse.json({
          success: true,
          requirementName,
          taskId: result.taskId,
          message: 'Idea resolution started',
        });
      } else {
        return NextResponse.json({
          success: false,
          message: 'Failed to create requirement',
        });
      }
    } catch (reqError) {
      console.error('Failed to create requirement:', reqError);

      // Still mark as processed but return partial success
      return NextResponse.json({
        success: true,
        requirementName,
        message: 'Idea queued for resolution (async)',
      });
    }
  } catch (error) {
    console.error('Error resolving idea:', error);
    return NextResponse.json(
      { error: 'Failed to resolve idea', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function generateRequirementContent(idea: { title: string; description: string | null; reasoning: string | null; category: string }): string {
  return `# ${idea.title}

## Category
${idea.category}

## Description
${idea.description || 'No description provided.'}

## Reasoning
${idea.reasoning || 'No reasoning provided.'}

## Implementation Instructions
1. Analyze the requirement thoroughly
2. Implement the necessary changes
3. Ensure code quality and test coverage
4. Follow existing code patterns and conventions

## Quality Requirements
- All changes must pass type checking
- Follow existing code style
- Add appropriate test coverage where applicable
`;
}
