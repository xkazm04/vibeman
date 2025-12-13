/**
 * Architecture Graph API Routes
 * Main CRUD operations for architecture graph data
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  architectureNodeDb,
  architectureEdgeDb,
  architectureDriftDb,
  architectureSuggestionDb,
  architectureIdealDb,
  architectureSnapshotDb,
} from '@/app/db';
import { analyzeProjectArchitecture, findExtractionCandidates, findLayerViolations } from '@/app/features/ArchitectureEvolution/lib/graphAnalyzer';
import { generateArchitectureSuggestions, generateDriftAlerts } from '@/app/features/ArchitectureEvolution/lib/suggestionGenerator';
import { projectDb } from '@/lib/project_database';

import { logger } from '@/lib/logger';
/**
 * GET /api/architecture-graph
 * Fetch architecture graph data for a project
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const resource = searchParams.get('resource') || 'graph';

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    switch (resource) {
      case 'graph': {
        // Get full graph data
        const nodes = architectureNodeDb.getActiveNodes(projectId);
        const edges = architectureEdgeDb.getByProject(projectId);
        const nodeStats = architectureNodeDb.getStats(projectId);
        const edgeStats = architectureEdgeDb.getStats(projectId);

        return NextResponse.json({
          nodes,
          edges,
          stats: {
            ...nodeStats,
            ...edgeStats,
          },
        });
      }

      case 'nodes': {
        const layer = searchParams.get('layer');
        const nodeType = searchParams.get('type');

        let nodes;
        if (layer) {
          nodes = architectureNodeDb.getByLayer(projectId, layer);
        } else if (nodeType) {
          nodes = architectureNodeDb.getByType(projectId, nodeType as any);
        } else {
          nodes = architectureNodeDb.getActiveNodes(projectId);
        }

        return NextResponse.json({ nodes });
      }

      case 'edges': {
        const nodeId = searchParams.get('nodeId');
        const circular = searchParams.get('circular');

        let edges;
        if (circular === 'true') {
          edges = architectureEdgeDb.getCircularEdges(projectId);
        } else if (nodeId) {
          const outgoing = architectureEdgeDb.getOutgoing(nodeId);
          const incoming = architectureEdgeDb.getIncoming(nodeId);
          edges = [...outgoing, ...incoming];
        } else {
          edges = architectureEdgeDb.getByProject(projectId);
        }

        return NextResponse.json({ edges });
      }

      case 'drifts': {
        const status = searchParams.get('status');
        const severity = searchParams.get('severity');

        let drifts;
        if (status === 'active') {
          drifts = architectureDriftDb.getActive(projectId);
        } else if (severity) {
          drifts = architectureDriftDb.getBySeverity(projectId, severity as any);
        } else {
          drifts = architectureDriftDb.getByProject(projectId);
        }

        const counts = architectureDriftDb.getCounts(projectId);

        return NextResponse.json({ drifts, counts });
      }

      case 'suggestions': {
        const status = searchParams.get('status');

        let suggestions;
        if (status === 'pending') {
          suggestions = architectureSuggestionDb.getPending(projectId);
        } else {
          suggestions = architectureSuggestionDb.getByProject(projectId);
        }

        return NextResponse.json({ suggestions });
      }

      case 'ideals': {
        const enabled = searchParams.get('enabled');

        let ideals;
        if (enabled === 'true') {
          ideals = architectureIdealDb.getEnabled(projectId);
        } else {
          ideals = architectureIdealDb.getByProject(projectId);
        }

        return NextResponse.json({ ideals });
      }

      case 'snapshots': {
        const latest = searchParams.get('latest');

        if (latest === 'true') {
          const snapshot = architectureSnapshotDb.getLatest(projectId);
          return NextResponse.json({ snapshot });
        }

        const snapshots = architectureSnapshotDb.getByProject(projectId);
        return NextResponse.json({ snapshots });
      }

      case 'stats': {
        const nodeStats = architectureNodeDb.getStats(projectId);
        const edgeStats = architectureEdgeDb.getStats(projectId);
        const driftCounts = architectureDriftDb.getCounts(projectId);

        return NextResponse.json({
          nodes: nodeStats,
          edges: edgeStats,
          drifts: driftCounts,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown resource: ${resource}` },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('Error fetching architecture graph:', { data: error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch architecture graph' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/architecture-graph
 * Analyze project and build/update architecture graph
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, action, data } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Get project path
    const project = projectDb.getProject(projectId);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    switch (action) {
      case 'analyze': {
        // Run full analysis
        const includeAI = data?.includeAI ?? false;

        // Analyze project
        const analysisResult = await analyzeProjectArchitecture(projectId, project.path);

        // Clear existing data
        architectureEdgeDb.deleteByProject(projectId);
        architectureNodeDb.deleteByProject(projectId);

        // Save nodes
        for (const node of analysisResult.nodes) {
          architectureNodeDb.create({
            ...node,
            id: node.id,
          });
        }

        // Save edges
        for (const edge of analysisResult.edges) {
          architectureEdgeDb.create({
            ...edge,
            id: edge.id,
            is_circular: edge.is_circular === 1,
          });
        }

        // Find extraction candidates and layer violations
        const nodes = architectureNodeDb.getActiveNodes(projectId);
        const edges = architectureEdgeDb.getByProject(projectId);
        const extractionCandidates = findExtractionCandidates(nodes, edges);
        const layerViolations = findLayerViolations(nodes, edges);

        // Generate suggestions
        const context = {
          nodes,
          edges,
          circularDependencies: analysisResult.circularDependencies,
          layerViolations,
          extractionCandidates,
        };

        // Generate and save drift alerts
        const driftAlerts = generateDriftAlerts(projectId, context);
        for (const drift of driftAlerts) {
          architectureDriftDb.create({
            ...drift,
            id: uuidv4(),
          });
        }

        // Generate and save suggestions
        const suggestions = await generateArchitectureSuggestions(projectId, context, {
          includeAI,
        });

        for (const suggestion of suggestions) {
          architectureSuggestionDb.create({
            ...suggestion,
            id: uuidv4(),
          });
        }

        return NextResponse.json({
          success: true,
          stats: analysisResult.stats,
          driftsCount: driftAlerts.length,
          suggestionsCount: suggestions.length,
        });
      }

      case 'snapshot': {
        // Create a snapshot of current state
        const nodes = architectureNodeDb.getActiveNodes(projectId);
        const edges = architectureEdgeDb.getByProject(projectId);
        const circularEdges = edges.filter(e => e.is_circular === 1);

        const avgComplexity = nodes.length > 0
          ? nodes.reduce((sum, n) => sum + n.complexity_score, 0) / nodes.length
          : 0;
        const avgCoupling = nodes.length > 0
          ? nodes.reduce((sum, n) => sum + n.coupling_score, 0) / nodes.length
          : 0;

        const snapshot = architectureSnapshotDb.create({
          id: uuidv4(),
          project_id: projectId,
          snapshot_type: data?.type || 'manual',
          name: data?.name || `Snapshot ${new Date().toLocaleDateString()}`,
          description: data?.description || null,
          nodes_count: nodes.length,
          edges_count: edges.length,
          circular_count: circularEdges.length,
          avg_complexity: Math.round(avgComplexity),
          avg_coupling: Math.round(avgCoupling),
          graph_data: {
            nodes: nodes.map(n => ({
              id: n.id,
              path: n.path,
              name: n.name,
              nodeType: n.node_type,
              layer: n.layer,
              metrics: {
                complexity: n.complexity_score,
                stability: n.stability_score,
                coupling: n.coupling_score,
                cohesion: n.cohesion_score,
                loc: n.loc,
              },
            })),
            edges: edges.map(e => ({
              id: e.id,
              source: e.source_node_id,
              target: e.target_node_id,
              weight: e.weight,
              strength: e.strength,
              isCircular: e.is_circular === 1,
            })),
          },
          git_commit: data?.gitCommit || null,
        });

        return NextResponse.json({ success: true, snapshot });
      }

      case 'create_ideal': {
        // Create new architecture ideal/rule
        const ideal = architectureIdealDb.create({
          id: uuidv4(),
          project_id: projectId,
          name: data.name,
          description: data.description,
          rule_type: data.ruleType || 'custom',
          rule_config: data.ruleConfig || {},
          example_compliant: data.exampleCompliant || null,
          example_violation: data.exampleViolation || null,
          severity: data.severity || 'warning',
        });

        return NextResponse.json({ success: true, ideal });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('Error processing architecture graph:', { data: error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process architecture graph' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/architecture-graph
 * Update drift/suggestion status
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { resource, id, updates } = body;

    if (!resource || !id) {
      return NextResponse.json(
        { error: 'Resource and ID are required' },
        { status: 400 }
      );
    }

    switch (resource) {
      case 'drift': {
        const drift = architectureDriftDb.updateStatus(id, updates.status);
        return NextResponse.json({ success: true, drift });
      }

      case 'suggestion': {
        const suggestion = architectureSuggestionDb.updateStatus(
          id,
          updates.status,
          updates.feedback
        );
        return NextResponse.json({ success: true, suggestion });
      }

      case 'ideal': {
        const ideal = architectureIdealDb.update(id, updates);
        return NextResponse.json({ success: true, ideal });
      }

      case 'node': {
        const node = architectureNodeDb.updateMetrics(id, updates);
        return NextResponse.json({ success: true, node });
      }

      default:
        return NextResponse.json(
          { error: `Unknown resource: ${resource}` },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('Error updating architecture graph:', { data: error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update architecture graph' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/architecture-graph
 * Delete architecture graph resources
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const resource = searchParams.get('resource');
    const id = searchParams.get('id');
    const projectId = searchParams.get('projectId');

    if (!resource) {
      return NextResponse.json(
        { error: 'Resource is required' },
        { status: 400 }
      );
    }

    switch (resource) {
      case 'drift': {
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
        const success = architectureDriftDb.delete(id);
        return NextResponse.json({ success });
      }

      case 'suggestion': {
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
        const success = architectureSuggestionDb.delete(id);
        return NextResponse.json({ success });
      }

      case 'ideal': {
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
        const success = architectureIdealDb.delete(id);
        return NextResponse.json({ success });
      }

      case 'snapshot': {
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
        const success = architectureSnapshotDb.delete(id);
        return NextResponse.json({ success });
      }

      case 'all': {
        if (!projectId) return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
        const edgeCount = architectureEdgeDb.deleteByProject(projectId);
        const nodeCount = architectureNodeDb.deleteByProject(projectId);
        return NextResponse.json({ success: true, deletedEdges: edgeCount, deletedNodes: nodeCount });
      }

      default:
        return NextResponse.json(
          { error: `Unknown resource: ${resource}` },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('Error deleting architecture graph:', { data: error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete architecture graph' },
      { status: 500 }
    );
  }
}
