/**
 * @route /api/ideas/cross-context-graph
 * GET - Full dependency graph with nodes, edges, and stats (CrossContextDashboard)
 *
 * GET /api/ideas/cross-context-graph?projectId=xxx
 *   Returns the full dependency graph with nodes, edges, and stats
 *
 * GET /api/ideas/cross-context-graph?projectId=xxx&cascade=contextId
 *   Returns cascade impact analysis for a specific context
 */

import { NextRequest, NextResponse } from 'next/server';
import { contextGroupRelationshipRepository } from '@/app/db/repositories/context-group-relationship.repository';
import { contextGroupRepository } from '@/app/db/repositories/context-group.repository';
import { contextRepository } from '@/app/db/repositories/context.repository';
import { directionRepository } from '@/app/db/repositories/direction.repository';
import { ideaRepository } from '@/app/db/repositories/idea.repository';
import { buildContextGraph, analyzeCascade } from '@/lib/ideas/crossContextGraph';
import { logger } from '@/lib/logger';
import {
  IdeasErrorCode,
  createIdeasErrorResponse,
  handleIdeasApiError,
} from '@/app/features/Ideas/lib/ideasHandlers';

export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get('projectId');
    const cascadeContextId = request.nextUrl.searchParams.get('cascade');

    if (!projectId) {
      return createIdeasErrorResponse(IdeasErrorCode.MISSING_REQUIRED_FIELD, {
        field: 'projectId',
        message: 'projectId is required',
      });
    }

    // Fetch all data for the project
    const [contexts, groups, groupRelationships, ideas, directions] = [
      contextRepository.getContextsByProject(projectId),
      contextGroupRepository.getGroupsByProject(projectId),
      contextGroupRelationshipRepository.getByProject(projectId),
      ideaRepository.getIdeasByProject(projectId),
      directionRepository.getDirectionsByProject(projectId),
    ];

    // Build the graph
    const graph = buildContextGraph(contexts, groups, groupRelationships, ideas, directions);

    // If cascade analysis requested, include it
    let cascade = null;
    if (cascadeContextId) {
      cascade = analyzeCascade(graph, cascadeContextId);
    }

    return NextResponse.json({
      success: true,
      graph: {
        nodes: graph.nodes,
        edges: graph.edges,
        stats: graph.stats,
      },
      cascade,
    });
  } catch (error) {
    logger.error('[API] Cross-context graph error:', { error });
    return handleIdeasApiError(error);
  }
}
