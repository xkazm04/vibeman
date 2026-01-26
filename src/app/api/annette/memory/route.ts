/**
 * Annette Memory API
 * Manages persistent memories for contextual recall
 */

import { NextRequest, NextResponse } from 'next/server';
import { memoryStore } from '@/app/features/Annette/lib/memoryStore';
import { semanticIndexer } from '@/app/features/Annette/lib/semanticIndexer';
import { contextualRecaller } from '@/app/features/Annette/lib/contextualRecaller';
import type { AnnetteMemoryType } from '@/app/db/models/annette.types';

/**
 * GET /api/annette/memory
 * Get memories for a project
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const query = searchParams.get('query');
    const type = searchParams.get('type') as AnnetteMemoryType | null;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    let memories;

    if (query) {
      // Semantic search
      const results = await semanticIndexer.findSimilarMemories(
        projectId,
        query,
        limit,
        0.2
      );
      memories = results.map(r => ({
        ...r.item,
        relevanceScore: r.similarity,
      }));
    } else {
      // Regular fetch
      memories = memoryStore.getByProject({
        projectId,
        type: type || undefined,
        limit,
      });
    }

    // Get stats
    const stats = memoryStore.getConsolidationStats(projectId);
    const byType = memoryStore.getByProject({ projectId, limit: 1000 })
      .reduce((acc, m) => {
        acc[m.memoryType] = (acc[m.memoryType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return NextResponse.json({
      memories,
      stats: {
        totalMemories: memories.length,
        byType,
        tokenSavings: stats.savings,
      },
    });
  } catch (error) {
    console.error('Error fetching memories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch memories' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/annette/memory
 * Create a new memory or perform memory operations
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, projectId, sessionId, ...data } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'create': {
        if (!data.content || !data.memoryType) {
          return NextResponse.json(
            { error: 'content and memoryType are required' },
            { status: 400 }
          );
        }

        const memory = memoryStore.create({
          projectId,
          sessionId,
          memoryType: data.memoryType,
          content: data.content,
          summary: data.summary,
          importanceScore: data.importanceScore,
          sourceMessageIds: data.sourceMessageIds,
          metadata: data.metadata,
        });

        // Index the memory
        await semanticIndexer.indexMemory(memory.id);

        return NextResponse.json({ memory });
      }

      case 'extract': {
        if (!data.messages || !Array.isArray(data.messages)) {
          return NextResponse.json(
            { error: 'messages array is required' },
            { status: 400 }
          );
        }

        const memories = await memoryStore.extractFromConversation(
          projectId,
          sessionId || 'unknown',
          data.messages
        );

        return NextResponse.json({ memories, count: memories.length });
      }

      case 'consolidate': {
        if (!data.memoryIds || !Array.isArray(data.memoryIds)) {
          return NextResponse.json(
            { error: 'memoryIds array is required' },
            { status: 400 }
          );
        }

        const consolidated = await memoryStore.consolidateMemories(
          projectId,
          data.memoryIds
        );

        return NextResponse.json({
          consolidated,
          success: !!consolidated,
        });
      }

      case 'recall': {
        const recalled = await contextualRecaller.recall({
          projectId,
          currentMessage: data.currentMessage,
          recentMessages: data.recentMessages,
          sessionId,
          maxMemories: data.maxMemories,
          maxNodes: data.maxNodes,
        });

        return NextResponse.json(recalled);
      }

      case 'learn': {
        if (!data.messages || !Array.isArray(data.messages)) {
          return NextResponse.json(
            { error: 'messages array is required' },
            { status: 400 }
          );
        }

        const result = await contextualRecaller.learnFromConversation(
          projectId,
          sessionId || 'unknown',
          data.messages
        );

        return NextResponse.json(result);
      }

      case 'maintenance': {
        const result = await contextualRecaller.performMaintenance(projectId);
        return NextResponse.json(result);
      }

      case 'index': {
        const indexedMemories = await semanticIndexer.indexAllMemories(projectId);
        const indexedNodes = await semanticIndexer.indexAllKnowledgeNodes(projectId);
        return NextResponse.json({
          indexedMemories,
          indexedNodes,
          total: indexedMemories + indexedNodes,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error processing memory operation:', error);
    return NextResponse.json(
      { error: 'Failed to process memory operation' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/annette/memory
 * Delete a memory
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    const success = memoryStore.delete(id);

    return NextResponse.json({ success });
  } catch (error) {
    console.error('Error deleting memory:', error);
    return NextResponse.json(
      { error: 'Failed to delete memory' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/annette/memory
 * Update a memory
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, importanceScore } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    if (importanceScore !== undefined) {
      memoryStore.updateImportance(id, importanceScore);
    }

    const memory = memoryStore.getById(id);

    return NextResponse.json({ memory });
  } catch (error) {
    console.error('Error updating memory:', error);
    return NextResponse.json(
      { error: 'Failed to update memory' },
      { status: 500 }
    );
  }
}
