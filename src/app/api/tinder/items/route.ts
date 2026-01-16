/**
 * GET /api/tinder/items
 * Unified endpoint for fetching Ideas and/or Directions for Tinder-style evaluation
 */

import { NextRequest, NextResponse } from 'next/server';
import { ideaDb, directionDb } from '@/app/db';
import { TinderItem, TinderFilterMode } from '@/app/features/tinder/lib/tinderTypes';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const itemType = (searchParams.get('itemType') || 'both') as TinderFilterMode;
    const offsetParam = searchParams.get('offset') || '0';
    const limitParam = searchParams.get('limit') || '20';

    // Validate pagination parameters
    const offset = parseInt(offsetParam, 10);
    const limit = parseInt(limitParam, 10);
    if (isNaN(offset) || isNaN(limit) || offset < 0 || limit < 1) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters', details: `offset=${offsetParam}, limit=${limitParam}` },
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

    const items: TinderItem[] = [];
    let ideasCount = 0;
    let directionsCount = 0;

    // Fetch Ideas if needed
    if (itemType === 'ideas' || itemType === 'both') {
      const allIdeas = projectId && projectId !== 'all'
        ? ideaDb.getIdeasByProject(projectId)
        : ideaDb.getAllIdeas();

      const pendingIdeas = allIdeas.filter(idea => idea.status === 'pending');
      ideasCount = pendingIdeas.length;

      items.push(...pendingIdeas.map(idea => ({
        type: 'idea' as const,
        data: idea
      })));
    }

    // Fetch Directions if needed
    if (itemType === 'directions' || itemType === 'both') {
      const pendingDirections = projectId && projectId !== 'all'
        ? directionDb.getPendingDirections(projectId)
        : directionDb.getAllPendingDirections();

      directionsCount = pendingDirections.length;

      items.push(...pendingDirections.map(direction => ({
        type: 'direction' as const,
        data: direction
      })));
    }

    // Sort all items by created_at (newest first)
    items.sort((a, b) =>
      new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime()
    );

    // Paginate
    const paginatedItems = items.slice(offset, offset + limit);
    const hasMore = offset + limit < items.length;

    return NextResponse.json({
      items: paginatedItems,
      hasMore,
      total: items.length,
      counts: {
        ideas: ideasCount,
        directions: directionsCount
      }
    });
  } catch (error) {
    logger.error('Error fetching tinder items:', { error });
    return NextResponse.json(
      {
        error: 'Failed to fetch items',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
