/**
 * API Route: Question Trees
 *
 * GET /api/questions/tree?projectId=xxx
 * Returns all questions organized as tree structures (nested parent→children).
 * Also includes tree metadata like max depth and strategic briefs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { questionTreeService } from '@/lib/questions/questionTreeService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId query parameter is required' },
        { status: 400 }
      );
    }

    const trees = questionTreeService.getQuestionTrees(projectId);
    const maxDepth = questionTreeService.getMaxTreeDepth(projectId);
    const treeStats = questionTreeService.getTreeStats(trees);
    const totalQuestions = trees.reduce(
      (sum, root) => sum + treeStats.find(s => s.rootId === root.id)!.totalNodes,
      0
    );

    return NextResponse.json({
      success: true,
      trees,
      treeStats,
      totalTrees: trees.length,
      maxDepth,
      totalQuestions,
    });
  } catch (error) {
    logger.error('[API] Question tree GET error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
