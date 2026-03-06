/**
 * DELETE /api/tinder/flush
 * Unified endpoint for flushing (permanently deleting) pending Ideas and/or Directions
 */

import { NextResponse } from 'next/server';
import { ideaRepository } from '@/app/db/repositories/idea.repository';
import { directionRepository } from '@/app/db/repositories/direction.repository';
import { TinderFilterMode } from '@/app/features/tinder/lib/tinderTypes';
import { logger } from '@/lib/logger';
import {
  IdeasErrorCode,
  createIdeasErrorResponse,
  withIdeasErrorHandler,
} from '@/app/features/Ideas/lib/ideasHandlers';

async function handleDelete(request: Request) {
  const body = await request.json();
  const { projectId, itemType = 'both' } = body as {
    projectId: string;
    itemType?: TinderFilterMode;
  };

  // Validate input
  if (!projectId) {
    return createIdeasErrorResponse(IdeasErrorCode.MISSING_REQUIRED_FIELD, {
      field: 'projectId',
      message: 'projectId is required',
    });
  }

  // Validate itemType
  if (!['ideas', 'directions', 'both'].includes(itemType)) {
    return createIdeasErrorResponse(IdeasErrorCode.INVALID_FILTER, {
      field: 'itemType',
      message: `Invalid itemType: must be 'ideas', 'directions', or 'both'`,
    });
  }

  let ideasDeleted = 0;
  let directionsDeleted = 0;

  // Delete Ideas if needed
  if (itemType === 'ideas' || itemType === 'both') {
    if (projectId === 'all') {
      ideasDeleted = ideaRepository.deleteAllPendingIdeas();
    } else {
      ideasDeleted = ideaRepository.deletePendingIdeasByProject(projectId);
    }
  }

  // Delete Directions if needed
  if (itemType === 'directions' || itemType === 'both') {
    if (projectId === 'all') {
      directionsDeleted = directionRepository.deleteAllPendingDirections();
    } else {
      directionsDeleted = directionRepository.deletePendingDirectionsByProject(projectId);
    }
  }

  const totalDeleted = ideasDeleted + directionsDeleted;

  logger.info('Tinder flush completed:', {
    projectId,
    itemType,
    ideasDeleted,
    directionsDeleted,
    totalDeleted
  });

  return NextResponse.json({
    success: true,
    deletedCount: totalDeleted,
    details: {
      ideas: ideasDeleted,
      directions: directionsDeleted
    },
    message: buildFlushMessage(projectId, itemType, ideasDeleted, directionsDeleted)
  });
}

export const DELETE = withIdeasErrorHandler(handleDelete, IdeasErrorCode.DELETE_FAILED);

function buildFlushMessage(
  projectId: string,
  itemType: TinderFilterMode,
  ideasDeleted: number,
  directionsDeleted: number
): string {
  const projectScope = projectId === 'all' ? 'all projects' : 'project';
  const parts: string[] = [];

  if (itemType === 'ideas' || itemType === 'both') {
    parts.push(`${ideasDeleted} idea${ideasDeleted !== 1 ? 's' : ''}`);
  }
  if (itemType === 'directions' || itemType === 'both') {
    parts.push(`${directionsDeleted} direction${directionsDeleted !== 1 ? 's' : ''}`);
  }

  return `Flushed ${parts.join(' and ')} from ${projectScope}`;
}
