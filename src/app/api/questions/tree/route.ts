/**
 * API Route: Question Trees
 *
 * GET /api/questions/tree?projectId=xxx
 * Returns all questions organized as tree structures (nested parent→children).
 * Also includes tree metadata like max depth and strategic briefs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { questionDb } from '@/app/db';
import { logger } from '@/lib/logger';
import { buildQuestionForest, type QuestionTreeNode } from '@/app/db/repositories/question.repository';

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

    const allQuestions = questionDb.getQuestionsByProject(projectId);
    const trees = buildQuestionForest(allQuestions);
    const maxDepth = questionDb.getMaxTreeDepth(projectId);

    // Compute per-tree stats
    const treeStats = trees.map(root => ({
      rootId: root.id,
      rootQuestion: root.question,
      context: root.context_map_title,
      totalNodes: countNodes(root),
      maxDepth: computeTreeDepth(root),
      answeredCount: countAnswered(root),
      pendingCount: countPending(root),
      hasStrategicBrief: !!root.strategic_brief,
    }));

    return NextResponse.json({
      success: true,
      trees,
      treeStats,
      totalTrees: trees.length,
      maxDepth,
      totalQuestions: allQuestions.length,
    });
  } catch (error) {
    logger.error('[API] Question tree GET error:', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function countNodes(node: QuestionTreeNode): number {
  return 1 + node.children.reduce((sum, child) => sum + countNodes(child), 0);
}

function computeTreeDepth(node: QuestionTreeNode): number {
  if (node.children.length === 0) return 0;
  return 1 + Math.max(...node.children.map(computeTreeDepth));
}

function countAnswered(node: QuestionTreeNode): number {
  const self = node.status === 'answered' ? 1 : 0;
  return self + node.children.reduce((sum, child) => sum + countAnswered(child), 0);
}

function countPending(node: QuestionTreeNode): number {
  const self = node.status === 'pending' ? 1 : 0;
  return self + node.children.reduce((sum, child) => sum + countPending(child), 0);
}
