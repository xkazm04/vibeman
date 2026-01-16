/**
 * DELETE /api/tinder/flush
 * Unified endpoint for flushing (permanently deleting) pending Ideas and/or Directions
 */

import { NextResponse } from 'next/server';
import { ideaRepository } from '@/app/db/repositories/idea.repository';
import { directionRepository } from '@/app/db/repositories/direction.repository';
import { TinderFilterMode } from '@/app/features/tinder/lib/tinderTypes';
import { logger } from '@/lib/logger';

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { projectId, itemType = 'both' } = body as {
      projectId: string;
      itemType?: TinderFilterMode;
    };

    // Validate input
    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    // Validate itemType
    if (!['ideas', 'directions', 'both'].includes(itemType)) {
      return NextResponse.json(
        { error: 'Invalid itemType', details: `Must be 'ideas', 'directions', or 'both'` },
        { status: 400 }
      );
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
  } catch (error) {
    logger.error('Error flushing tinder items:', { error });
    return NextResponse.json(
      {
        error: 'Failed to flush items',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

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
