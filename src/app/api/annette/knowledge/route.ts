/**
 * Annette Knowledge Graph API
 * Manages the knowledge graph for entity relationships and queries
 */

import { NextRequest, NextResponse } from 'next/server';
import { knowledgeGraph } from '@/app/features/Annette/lib/knowledgeGraph';
import { semanticIndexer } from '@/app/features/Annette/lib/semanticIndexer';
import type { KnowledgeNodeType } from '@/app/db/models/annette.types';

/**
 * GET /api/annette/knowledge
 * Get knowledge graph data
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const nodeId = searchParams.get('nodeId');
    const query = searchParams.get('query');
    const type = searchParams.get('type') as KnowledgeNodeType | null;
    const nodeLimit = parseInt(searchParams.get('nodeLimit') || '100', 10);
    const edgeLimit = parseInt(searchParams.get('edgeLimit') || '500', 10);

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    // If specific node requested
    if (nodeId) {
      const node = knowledgeGraph.getNode(nodeId);
      if (!node) {
        return NextResponse.json(
          { error: 'Node not found' },
          { status: 404 }
        );
      }

      const relatedNodes = knowledgeGraph.getRelatedNodes(nodeId, 20);
      const edges = knowledgeGraph.getEdges(nodeId, 'both');

      return NextResponse.json({ node, relatedNodes, edges });
    }

    // If search query provided
    if (query) {
      const nodes = knowledgeGraph.searchNodes(projectId, query, nodeLimit);
      return NextResponse.json({ nodes });
    }

    // Get full graph
    const { nodes, edges } = knowledgeGraph.getGraph(projectId, {
      nodeLimit,
      edgeLimit,
      minImportance: type ? undefined : 0.3,
    });

    // Filter by type if specified
    const filteredNodes = type
      ? nodes.filter(n => n.nodeType === type)
      : nodes;

    // Get stats
    const stats = knowledgeGraph.getStats(projectId);

    return NextResponse.json({
      nodes: filteredNodes,
      edges,
      stats,
    });
  } catch (error) {
    console.error('Error fetching knowledge graph:', error);
    return NextResponse.json(
      { error: 'Failed to fetch knowledge graph' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/annette/knowledge
 * Create or update knowledge graph elements
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, projectId, ...data } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'createNode': {
        if (!data.name || !data.nodeType) {
          return NextResponse.json(
            { error: 'name and nodeType are required' },
            { status: 400 }
          );
        }

        const node = knowledgeGraph.upsertNode({
          projectId,
          nodeType: data.nodeType,
          name: data.name,
          description: data.description,
          properties: data.properties,
        });

        // Index the node
        await semanticIndexer.indexKnowledgeNode(node.id);

        return NextResponse.json({ node });
      }

      case 'createEdge': {
        if (!data.sourceNodeId || !data.targetNodeId || !data.relationshipType) {
          return NextResponse.json(
            { error: 'sourceNodeId, targetNodeId, and relationshipType are required' },
            { status: 400 }
          );
        }

        const edge = knowledgeGraph.upsertEdge({
          projectId,
          sourceNodeId: data.sourceNodeId,
          targetNodeId: data.targetNodeId,
          relationshipType: data.relationshipType,
          weight: data.weight,
          properties: data.properties,
        });

        return NextResponse.json({ edge });
      }

      case 'extract': {
        if (!data.text) {
          return NextResponse.json(
            { error: 'text is required' },
            { status: 400 }
          );
        }

        const extracted = await knowledgeGraph.extractFromText(projectId, data.text);
        return NextResponse.json(extracted);
      }

      case 'build': {
        if (!data.text) {
          return NextResponse.json(
            { error: 'text is required' },
            { status: 400 }
          );
        }

        const result = await knowledgeGraph.buildFromText(projectId, data.text);
        return NextResponse.json({
          nodes: result.nodes,
          edges: result.edges,
          nodesCreated: result.nodes.length,
          edgesCreated: result.edges.length,
        });
      }

      case 'query': {
        if (!data.question) {
          return NextResponse.json(
            { error: 'question is required' },
            { status: 400 }
          );
        }

        const result = await knowledgeGraph.query(projectId, data.question);
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error processing knowledge operation:', error);
    return NextResponse.json(
      { error: 'Failed to process knowledge operation' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/annette/knowledge
 * Delete a knowledge graph node or edge
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get('nodeId');
    const edgeId = searchParams.get('edgeId');

    if (nodeId) {
      const success = knowledgeGraph.deleteNode(nodeId);
      return NextResponse.json({ success, deleted: 'node' });
    }

    if (edgeId) {
      const success = knowledgeGraph.deleteEdge(edgeId);
      return NextResponse.json({ success, deleted: 'edge' });
    }

    return NextResponse.json(
      { error: 'nodeId or edgeId is required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error deleting knowledge element:', error);
    return NextResponse.json(
      { error: 'Failed to delete knowledge element' },
      { status: 500 }
    );
  }
}
