import { NextResponse } from 'next/server';
import { ideaRepository } from '@/app/db/repositories/idea.repository';
import { logger } from '@/lib/logger';

/**
 * DELETE /api/ideas/tinder/flush
 * Flush (permanently delete) ideas from the database
 * Either for a specific project or all projects
 */
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { projectId } = body;

    // Validate input
    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    let deletedCount: number;

    // Delete all ideas or project-specific ideas
    if (projectId === 'all') {
      deletedCount = ideaRepository.deleteAllIdeas();
    } else {
      deletedCount = ideaRepository.deleteIdeasByProject(projectId);
    }

    return NextResponse.json({
      success: true,
      deletedCount,
      message: projectId === 'all'
        ? `Flushed ${deletedCount} ideas from all projects`
        : `Flushed ${deletedCount} ideas from project`
    });
  } catch (error) {
    logger.error('Error flushing ideas:', { error });
    return NextResponse.json(
      {
        error: 'Failed to flush ideas',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
