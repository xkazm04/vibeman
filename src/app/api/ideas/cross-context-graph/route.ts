/**
 * API Route: Cross-Context Dependency Graph
 *
 * GET /api/ideas/cross-context-graph?projectId=xxx
 *   Returns the full dependency graph with nodes, edges, and stats
 *
 * GET /api/ideas/cross-context-graph?projectId=xxx&cascade=contextId
 *   Returns cascade impact analysis for a specific context
 */

import { NextRequest, NextResponse } from 'next/server';
import { contextDb, contextGroupDb, contextGroupRelationshipDb, ideaDb, directionDb } from '@/app/db';
import { buildContextGraph, analyzeCascade } from '@/lib/ideas/crossContextGraph';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get('projectId');
    const cascadeContextId = request.nextUrl.searchParams.get('cascade');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    // Fetch all data for the project
    const [contexts, groups, groupRelationships, ideas, directions] = [
      contextDb.getContextsByProject(projectId),
      contextGroupDb.getGroupsByProject(projectId),
      contextGroupRelationshipDb.getByProject(projectId),
      ideaDb.getIdeasByProject(projectId),
      directionDb.getDirectionsByProject(projectId),
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
