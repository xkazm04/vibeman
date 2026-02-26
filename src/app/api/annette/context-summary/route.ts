/**
 * GET /api/annette/context-summary
 * Lightweight endpoint to get a summary of Annette's active context
 * Used by the ContextIndicatorBar to show what Annette currently remembers
 */

import { NextRequest, NextResponse } from 'next/server';
import { memoryStore } from '@/app/features/Annette/lib/memoryStore';
import { knowledgeGraph } from '@/app/features/Annette/lib/knowledgeGraph';

export interface ContextSummaryResponse {
  memories: {
    total: number;
    byType: Record<string, number>;
    topItems: Array<{
      id: string;
      type: string;
      content: string;
      importance: number;
    }>;
  };
  knowledge: {
    totalNodes: number;
    totalEdges: number;
    nodesByType: Record<string, number>;
    topNodes: Array<{
      id: string;
      type: string;
      name: string;
      importance: number;
    }>;
  };
  projectName: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    // Fetch memories (top 10 by importance)
    const allMemories = memoryStore.getByProject({
      projectId,
      limit: 200,
    });

    const byType: Record<string, number> = {};
    for (const m of allMemories) {
      byType[m.memoryType] = (byType[m.memoryType] || 0) + 1;
    }

    const topMemories = [...allMemories]
      .sort((a, b) => b.importanceScore - a.importanceScore)
      .slice(0, 10)
      .map(m => ({
        id: m.id,
        type: m.memoryType,
        content: m.summary || m.content.slice(0, 120),
        importance: m.importanceScore,
      }));

    // Fetch knowledge graph stats + top nodes
    const graphStats = knowledgeGraph.getStats(projectId);
    const topNodes = knowledgeGraph.getNodes(projectId, { limit: 10 })
      .sort((a, b) => b.importanceScore - a.importanceScore)
      .map(n => ({
        id: n.id,
        type: n.nodeType,
        name: n.name,
        importance: n.importanceScore,
      }));

    const response: ContextSummaryResponse = {
      memories: {
        total: allMemories.length,
        byType,
        topItems: topMemories,
      },
      knowledge: {
        totalNodes: graphStats.totalNodes,
        totalEdges: graphStats.totalEdges,
        nodesByType: graphStats.nodesByType,
        topNodes,
      },
      projectName: null,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching context summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch context summary' },
      { status: 500 }
    );
  }
}
