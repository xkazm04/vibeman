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

    // Effort/risk range filters (server-side filtering before pagination)
    const effortMin = searchParams.get('effortMin') ? Number(searchParams.get('effortMin')) : null;
    const effortMax = searchParams.get('effortMax') ? Number(searchParams.get('effortMax')) : null;
    const riskMin = searchParams.get('riskMin') ? Number(searchParams.get('riskMin')) : null;
    const riskMax = searchParams.get('riskMax') ? Number(searchParams.get('riskMax')) : null;

    // Sort order: 'asc' = lowest effort+risk first (default), 'desc' = highest first
    const sortOrder = (searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc';

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

      // Apply effort/risk range filters server-side (before pagination)
      if (effortMin !== null || effortMax !== null) {
        pendingIdeas = pendingIdeas.filter(idea => {
          if (idea.effort === null || idea.effort === undefined) return false;
          if (effortMin !== null && idea.effort < effortMin) return false;
          if (effortMax !== null && idea.effort > effortMax) return false;
          return true;
        });
      }
      if (riskMin !== null || riskMax !== null) {
        pendingIdeas = pendingIdeas.filter(idea => {
          if (idea.risk === null || idea.risk === undefined) return false;
          if (riskMin !== null && idea.risk < riskMin) return false;
          if (riskMax !== null && idea.risk > riskMax) return false;
          return true;
        });
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

    // Sort by effort+risk: categorized items first (sorted by composite score), uncategorized last
    // 'asc' = lowest effort+risk first, 'desc' = highest effort+risk first
    const getEffortRisk = (item: (typeof items)[number]): { effort: number | null; risk: number | null } => {
      if (item.type === 'idea') {
        return { effort: item.data.effort, risk: item.data.risk };
      }
      if (item.type === 'direction') {
        return { effort: item.data.effort, risk: null };
      }
      if (item.type === 'direction_pair') {
        return { effort: item.data.directionA.effort, risk: null };
      }
      return { effort: null, risk: null };
    };

    items.sort((a, b) => {
      const aER = getEffortRisk(a);
      const bER = getEffortRisk(b);
      const aHasEffort = aER.effort !== null && aER.effort !== undefined;
      const aHasRisk = aER.risk !== null && aER.risk !== undefined;
      const bHasEffort = bER.effort !== null && bER.effort !== undefined;
      const bHasRisk = bER.risk !== null && bER.risk !== undefined;
      const aCategorized = aHasEffort && aHasRisk;
      const bCategorized = bHasEffort && bHasRisk;
      const aPartial = aHasEffort || aHasRisk; // has at least one attribute
      const bPartial = bHasEffort || bHasRisk;

      // Fully categorized items come first, then partial, then fully uncategorized
      if (aCategorized && !bCategorized) return -1;
      if (!aCategorized && bCategorized) return 1;
      if (aPartial && !bPartial) return -1;
      if (!aPartial && bPartial) return 1;

      // Both categorized: sort by effort + risk composite
      if (aCategorized && bCategorized) {
        const aScore = (aER.effort || 0) + (aER.risk || 0);
        const bScore = (bER.effort || 0) + (bER.risk || 0);
        return sortOrder === 'asc' ? aScore - bScore : bScore - aScore;
      }

      // Both partial: sort by effort (the common attribute)
      if (aPartial && bPartial) {
        const aScore = (aER.effort || 0) + (aER.risk || 0);
        const bScore = (bER.effort || 0) + (bER.risk || 0);
        return sortOrder === 'asc' ? aScore - bScore : bScore - aScore;
      }

      // Both fully uncategorized: maintain original order
      return 0;
    });

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
