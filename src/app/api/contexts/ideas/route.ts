import { NextRequest, NextResponse } from 'next/server';
import { ideaDb } from '@/app/db';
import { deleteRequirement } from '@/app/Claude/lib/claudeCodeManager';
import { DbIdea } from '@/app/db/models/types';

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

    // Get all ideas for this context
    const ideas = ideaDb.getIdeasByContext(contextId);

    // Delete requirement files if they exist and projectPath is provided
    if (projectPath) {
      await deleteRequirementFiles(ideas, projectPath);
    }

    // Delete all ideas from database
    const deletedCount = ideaDb.deleteIdeasByContext(contextId);

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `Deleted ${deletedCount} idea(s) from context`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to delete context ideas',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Delete requirement files associated with ideas
 */
async function deleteRequirementFiles(ideas: DbIdea[], projectPath: string): Promise<void> {
  for (const idea of ideas) {
    if (idea.requirement_id) {
      try {
        const deleteResult = deleteRequirement(projectPath, idea.requirement_id);
        if (!deleteResult.success) {
          // Log warning but continue with other deletions
        }
      } catch (deleteError) {
        // Continue with other deletions even if one fails
      }
    }
  }
}
