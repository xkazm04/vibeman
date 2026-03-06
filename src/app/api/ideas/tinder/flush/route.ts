import { NextResponse } from 'next/server';
import { ideaRepository } from '@/app/db/repositories/idea.repository';
import {
  IdeasErrorCode,
  createIdeasErrorResponse,
  withIdeasErrorHandler,
} from '@/app/features/Ideas/lib/ideasHandlers';

/**
 * DELETE /api/ideas/tinder/flush
 * Flush (permanently delete) ideas from the database
 * Either for a specific project or all projects
 */
async function handleDelete(request: Request) {
  const body = await request.json();
  const { projectId } = body;

  // Validate input
  if (!projectId) {
    return createIdeasErrorResponse(IdeasErrorCode.MISSING_REQUIRED_FIELD, {
      field: 'projectId',
      message: 'projectId is required',
    });
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
}

export const DELETE = withIdeasErrorHandler(handleDelete, IdeasErrorCode.DELETE_FAILED);
