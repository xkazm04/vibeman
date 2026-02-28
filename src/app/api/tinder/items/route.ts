/**
 * GET /api/tinder/items
 * Unified endpoint for fetching Ideas and/or Directions for Tinder-style evaluation
 */

import { NextRequest, NextResponse } from 'next/server';
import { ideaDb, directionDb, goalDb } from '@/app/db';
import { TinderItem, TinderFilterMode } from '@/app/features/tinder/lib/tinderTypes';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const itemType = (searchParams.get('itemType') || 'both') as TinderFilterMode;
    const offsetParam = searchParams.get('offset') || '0';
    const limitParam = searchParams.get('limit') || '20';
    const ideaCategory = searchParams.get('category'); // Optional category filter for ideas

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
    const goalTitlesMap: Record<string, string> = {};

    // ALWAYS fetch counts for both types (for tab display) regardless of itemType filter
    const allIdeasForCount = projectId && projectId !== 'all'
      ? ideaDb.getIdeasByProject(projectId)
      : ideaDb.getAllIdeas();
    const pendingIdeasForCount = allIdeasForCount.filter(idea => idea.status === 'pending');
    const ideasCount = pendingIdeasForCount.length;

    const allDirectionsForCount = projectId && projectId !== 'all'
      ? directionDb.getPendingDirections(projectId)
      : directionDb.getAllPendingDirections();
    const directionsCount = allDirectionsForCount.length;

    // Fetch Ideas items if needed
    if (itemType === 'ideas' || itemType === 'both') {
      // Use already fetched ideas for count, apply category filter for items
      let pendingIdeas = pendingIdeasForCount;

      // Apply category filter if specified (only for ideas mode or when explicitly filtering)
      if (ideaCategory && itemType === 'ideas') {
        pendingIdeas = pendingIdeas.filter(idea => idea.category === ideaCategory);
      }

      // Batch-fetch goal titles to avoid N+1 queries in IdeaCard
      const goalIds = [...new Set(pendingIdeas.map(idea => idea.goal_id).filter(Boolean))] as string[];
      for (const goalId of goalIds) {
        const goal = goalDb.getGoalById(goalId);
        if (goal) {
          goalTitlesMap[goalId] = goal.title;
        }
      }

      items.push(...pendingIdeas.map(idea => ({
        type: 'idea' as const,
        data: idea
      })));
    }

    // Fetch Directions items if needed
    if (itemType === 'directions' || itemType === 'both') {
      // Use already fetched directions for count
      const pendingDirections = allDirectionsForCount;

      // Group directions by pair_id
      const singleDirections: typeof pendingDirections = [];
      const pairsMap = new Map<string, typeof pendingDirections>();

      for (const direction of pendingDirections) {
        if (direction.pair_id) {
          const existing = pairsMap.get(direction.pair_id) || [];
          existing.push(direction);
          pairsMap.set(direction.pair_id, existing);
        } else {
          singleDirections.push(direction);
        }
      }

      // Add single directions as normal items
      items.push(...singleDirections.map(direction => ({
        type: 'direction' as const,
        data: direction
      })));

      // Add complete pairs as direction_pair items
      for (const [pairId, directions] of pairsMap) {
        if (directions.length === 2) {
          const dirA = directions.find(d => d.pair_label === 'A');
          const dirB = directions.find(d => d.pair_label === 'B');
          if (dirA && dirB) {
            items.push({
              type: 'direction_pair' as const,
              data: {
                pairId,
                problemStatement: dirA.problem_statement || dirB.problem_statement,
                directionA: dirA,
                directionB: dirB,
              }
            });
          } else {
            // Labels don't match, treat as singles
            items.push(...directions.map(direction => ({
              type: 'direction' as const,
              data: direction
            })));
          }
        } else {
          // Incomplete pair, treat as singles
          items.push(...directions.map(direction => ({
            type: 'direction' as const,
            data: direction
          })));
        }
      }
    }

    // Sort all items by created_at (newest first)
    const getCreatedAt = (item: (typeof items)[number]): number => {
      if ('created_at' in item.data) return new Date(item.data.created_at).getTime();
      if ('directionA' in item.data) return new Date(item.data.directionA.created_at).getTime();
      return 0;
    };
    items.sort((a, b) => getCreatedAt(b) - getCreatedAt(a));

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
      },
      goalTitlesMap
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
