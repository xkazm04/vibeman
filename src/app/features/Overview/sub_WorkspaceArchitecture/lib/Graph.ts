/**
 * Unified Spatial-Relational Graph Abstraction for Architecture Visualization
 *
 * This class represents a directed graph that co-locates node positions with
 * edge information, enabling algorithms to reason about both spatial proximity
 * and logical relationships simultaneously.
 *
 * Key features:
 * - Edges reference node objects directly (not IDs), eliminating O(n) lookups
 * - Multiple visual projections: matrix view, node-link diagram, and future layouts
 *
 * The data model is the constant; visualizations are interchangeable views.
 */

import type {
  WorkspaceProjectNode,
  CrossProjectRelationship,
  TierConfig,
  IntegrationType,
  ProjectTier,
} from './types';
import { TIER_CONFIG } from './types';
import { TIER_ORDER, MATRIX_CONSTANTS } from './matrixLayoutUtils';

/**
 * Graph edge with resolved source/target node references.
 * Eliminates the need for O(n) lookups when rendering connections.
 */
export interface GraphEdge extends CrossProjectRelationship {
  /** Direct reference to source node (no lookup required) */
  sourceNode: WorkspaceProjectNode;
  /** Direct reference to target node (no lookup required) */
  targetNode: WorkspaceProjectNode;
}

/**
 * Matrix projection result - adjacency matrix representation
 */
export interface MatrixProjection {
  /** Nodes sorted by tier for consistent matrix ordering */
  sortedNodes: WorkspaceProjectNode[];
  /** Adjacency matrix: key is "sourceId-targetId", value is connections */
  matrix: Map<string, CrossProjectRelationship[]>;
  /** Calculated dimensions for rendering */
  dimensions: {
    contentWidth: number;
    contentHeight: number;
    panelWidth: number;
  };
}

/**
 * Diagram projection result - positioned nodes with tier swimlanes
 */
export interface DiagramProjection {
  /** Nodes with calculated x, y, width, height positions */
  nodes: WorkspaceProjectNode[];
  /** Tier swimlane configurations */
  tierConfigs: TierConfig[];
  /** Edges filtered by integration type (raw relationship data) */
  edges: CrossProjectRelationship[];
  /** Resolved edges with direct node references (for O(1) access) */
  resolvedEdges: GraphEdge[];
}

/**
 * Graph statistics and metadata
 */
export interface GraphStats {
  nodeCount: number;
  edgeCount: number;
  integrationTypes: IntegrationType[];
  tierDistribution: Map<ProjectTier, number>;
}

/**
 * Unified Graph class for architecture visualization
 *
 * Usage:
 * ```ts
 * const graph = new Graph(nodes, edges);
 *
 * // Get matrix view data
 * const matrixData = graph.toMatrix();
 *
 * // Get diagram view data
 * const diagramData = graph.toDiagram(800);
 *
 * // Filter edges
 * const filteredGraph = graph.filterByIntegrationType(new Set(['rest', 'graphql']));
 * ```
 */
export class Graph {
  private readonly _nodes: WorkspaceProjectNode[];
  private readonly _edges: CrossProjectRelationship[];
  private readonly _nodeMap: Map<string, WorkspaceProjectNode>;
  private readonly _resolvedEdges: GraphEdge[];
  private readonly _outgoingEdges: Map<string, GraphEdge[]>;
  private readonly _incomingEdges: Map<string, GraphEdge[]>;

  constructor(nodes: WorkspaceProjectNode[], edges: CrossProjectRelationship[]) {
    this._nodes = [...nodes];
    this._edges = [...edges];
    this._nodeMap = new Map(nodes.map(n => [n.id, n]));

    // Build resolved edges with direct node references
    this._resolvedEdges = [];
    this._outgoingEdges = new Map();
    this._incomingEdges = new Map();

    // Initialize edge maps for all nodes
    for (const node of nodes) {
      this._outgoingEdges.set(node.id, []);
      this._incomingEdges.set(node.id, []);
    }

    // Resolve edges and build adjacency lists
    for (const edge of edges) {
      const sourceNode = this._nodeMap.get(edge.sourceProjectId);
      const targetNode = this._nodeMap.get(edge.targetProjectId);

      if (sourceNode && targetNode) {
        const resolvedEdge: GraphEdge = {
          ...edge,
          sourceNode,
          targetNode,
        };
        this._resolvedEdges.push(resolvedEdge);
        this._outgoingEdges.get(sourceNode.id)?.push(resolvedEdge);
        this._incomingEdges.get(targetNode.id)?.push(resolvedEdge);
      }
    }
  }

  // === Accessors ===

  get nodes(): readonly WorkspaceProjectNode[] {
    return this._nodes;
  }

  get edges(): readonly CrossProjectRelationship[] {
    return this._edges;
  }

  get nodeCount(): number {
    return this._nodes.length;
  }

  get edgeCount(): number {
    return this._edges.length;
  }

  getNode(id: string): WorkspaceProjectNode | undefined {
    return this._nodeMap.get(id);
  }

  /**
   * Get resolved edges with direct node references (O(1) access)
   */
  get resolvedEdges(): readonly GraphEdge[] {
    return this._resolvedEdges;
  }

  /**
   * Get outgoing edges from a node
   */
  getOutgoingEdges(nodeId: string): readonly GraphEdge[] {
    return this._outgoingEdges.get(nodeId) || [];
  }

  /**
   * Get incoming edges to a node
   */
  getIncomingEdges(nodeId: string): readonly GraphEdge[] {
    return this._incomingEdges.get(nodeId) || [];
  }

  /**
   * Get all edges connected to a node (both incoming and outgoing)
   */
  getConnectedEdges(nodeId: string): GraphEdge[] {
    const outgoing = this._outgoingEdges.get(nodeId) || [];
    const incoming = this._incomingEdges.get(nodeId) || [];
    return [...outgoing, ...incoming];
  }

  // === Graph Operations ===

  /**
   * Create a new graph filtered by integration types.
   * The new graph maintains resolved edge references.
   */
  filterByIntegrationType(types: Set<IntegrationType>): Graph {
    if (types.size === 0) {
      return this;
    }
    const filteredEdges = this._edges.filter(e => types.has(e.integrationType));
    return new Graph(this._nodes, filteredEdges);
  }

  /**
   * Get resolved edges filtered by integration types.
   * More efficient than creating a new Graph when only edges are needed.
   */
  getResolvedEdgesFiltered(types: Set<IntegrationType>): GraphEdge[] {
    if (types.size === 0) {
      return [...this._resolvedEdges];
    }
    return this._resolvedEdges.filter(e => types.has(e.integrationType));
  }

  /**
   * Get all unique integration types present in the graph
   */
  getIntegrationTypes(): IntegrationType[] {
    const types = new Set<IntegrationType>();
    this._edges.forEach(e => types.add(e.integrationType));
    return Array.from(types);
  }

  /**
   * Get graph statistics
   */
  getStats(): GraphStats {
    const tierDistribution = new Map<ProjectTier, number>();
    this._nodes.forEach(n => {
      tierDistribution.set(n.tier, (tierDistribution.get(n.tier) || 0) + 1);
    });

    return {
      nodeCount: this._nodes.length,
      edgeCount: this._edges.length,
      integrationTypes: this.getIntegrationTypes(),
      tierDistribution,
    };
  }

  // === Projections ===

  /**
   * Project the graph into a matrix (adjacency matrix) representation
   * Used by MatrixGrid component
   */
  toMatrix(): MatrixProjection {
    const sortedNodes = this.sortNodesByTier();
    const matrix = this.buildAdjacencyMatrix(sortedNodes);
    const dimensions = this.calculateMatrixDimensions(sortedNodes.length);

    return {
      sortedNodes,
      matrix,
      dimensions,
    };
  }

  /**
   * Project the graph into a positioned node-link diagram
   * Used by MatrixDiagramView component
   *
   * The projection includes both raw edges and resolved edges.
   * Resolved edges have direct node references for O(1) position access.
   */
  toDiagram(viewportWidth: number): DiagramProjection {
    const { nodes, tierConfigs } = this.positionNodesForDiagram(viewportWidth);

    // Create a map of positioned nodes for resolving edges
    const positionedNodeMap = new Map(nodes.map(n => [n.id, n]));

    // Build resolved edges with positioned node references
    const resolvedEdges: GraphEdge[] = [];
    for (const edge of this._edges) {
      const sourceNode = positionedNodeMap.get(edge.sourceProjectId);
      const targetNode = positionedNodeMap.get(edge.targetProjectId);
      if (sourceNode && targetNode) {
        resolvedEdges.push({
          ...edge,
          sourceNode,
          targetNode,
        });
      }
    }

    return {
      nodes,
      tierConfigs,
      edges: this._edges,
      resolvedEdges,
    };
  }

  // === Private Helpers ===

  /**
   * Sort nodes by tier order for consistent matrix layout
   */
  private sortNodesByTier(): WorkspaceProjectNode[] {
    if (!this._nodes.length) return [];
    return [...this._nodes].sort((a, b) => {
      const tierOrder = { frontend: 0, backend: 1, external: 2, shared: 3 };
      return tierOrder[a.tier] - tierOrder[b.tier];
    });
  }

  /**
   * Build adjacency matrix representation
   */
  private buildAdjacencyMatrix(
    sortedNodes: WorkspaceProjectNode[]
  ): Map<string, CrossProjectRelationship[]> {
    const matrix = new Map<string, CrossProjectRelationship[]>();

    // Initialize empty cells
    for (const source of sortedNodes) {
      for (const target of sortedNodes) {
        if (source.id !== target.id) {
          matrix.set(`${source.id}-${target.id}`, []);
        }
      }
    }

    // Fill in connections
    for (const edge of this._edges) {
      const key = `${edge.sourceProjectId}-${edge.targetProjectId}`;
      const list = matrix.get(key);
      if (list) {
        list.push(edge);
      }
    }

    return matrix;
  }

  /**
   * Calculate matrix view dimensions
   */
  private calculateMatrixDimensions(nodeCount: number): {
    contentWidth: number;
    contentHeight: number;
    panelWidth: number;
  } {
    const { cellSize, labelOffset, headerHeight } = MATRIX_CONSTANTS;
    const contentWidth = nodeCount * cellSize + labelOffset;
    const contentHeight = nodeCount * cellSize + headerHeight;
    const panelWidth = Math.max(320, contentWidth + 48);
    return { contentWidth, contentHeight, panelWidth };
  }

  /**
   * Position nodes for tier-based diagram layout
   */
  private positionNodesForDiagram(diagramWidth: number): {
    nodes: WorkspaceProjectNode[];
    tierConfigs: TierConfig[];
  } {
    if (!this._nodes.length) {
      return { nodes: [], tierConfigs: [] };
    }

    const {
      nodeWidth,
      nodeHeight,
      tierPadding,
      nodePadding,
      topMargin,
      leftMargin,
      gridColumns,
      backendNodePadding,
      backendRowPadding,
    } = MATRIX_CONSTANTS;

    const configs: TierConfig[] = [];
    const byTier = new Map<ProjectTier, WorkspaceProjectNode[]>();

    // Clone nodes to avoid mutating originals
    const positionedNodes = this._nodes.map(n => ({ ...n }));

    for (const p of positionedNodes) {
      const list = byTier.get(p.tier) || [];
      list.push(p);
      byTier.set(p.tier, list);
    }

    // Find backend services connected to frontend (for priority sorting)
    const frontendIds = new Set((byTier.get('frontend') || []).map(n => n.id));
    const connectedToFrontend = new Set<string>();
    for (const edge of this._edges) {
      if (frontendIds.has(edge.sourceProjectId)) {
        connectedToFrontend.add(edge.targetProjectId);
      }
      if (frontendIds.has(edge.targetProjectId)) {
        connectedToFrontend.add(edge.sourceProjectId);
      }
    }

    let currentY = topMargin;
    for (const tierId of TIER_ORDER) {
      let tierNodes = byTier.get(tierId) || [];
      if (tierNodes.length === 0) continue;

      // Backend tier: use 3-column grid layout with connected services on top
      if (tierId === 'backend' && tierNodes.length > 3) {
        // Sort: connected to frontend first, then alphabetically
        tierNodes = [...tierNodes].sort((a, b) => {
          const aConnected = connectedToFrontend.has(a.id) ? 0 : 1;
          const bConnected = connectedToFrontend.has(b.id) ? 0 : 1;
          if (aConnected !== bConnected) return aConnected - bConnected;
          return a.name.localeCompare(b.name);
        });

        const numRows = Math.ceil(tierNodes.length / gridColumns);
        const tierHeight = numRows * nodeHeight + (numRows - 1) * backendRowPadding + 60;
        configs.push({ ...TIER_CONFIG[tierId], y: currentY, height: tierHeight });

        const gridWidth = gridColumns * nodeWidth + (gridColumns - 1) * backendNodePadding;
        const startX = leftMargin + Math.max(0, (diagramWidth - gridWidth) / 2);

        tierNodes.forEach((node, idx) => {
          const col = idx % gridColumns;
          const row = Math.floor(idx / gridColumns);
          node.width = nodeWidth;
          node.height = nodeHeight;
          node.x = startX + col * (nodeWidth + backendNodePadding);
          node.y = currentY + 30 + row * (nodeHeight + backendRowPadding);
        });

        currentY += tierHeight + tierPadding;
      } else {
        // Other tiers: single row layout
        const tierHeight = 100;
        configs.push({ ...TIER_CONFIG[tierId], y: currentY, height: tierHeight });

        const totalWidth = tierNodes.length * nodeWidth + (tierNodes.length - 1) * nodePadding;
        const startX = leftMargin + Math.max(0, (diagramWidth - totalWidth) / 2);

        tierNodes.forEach((node, idx) => {
          node.width = nodeWidth;
          node.height = nodeHeight;
          node.x = startX + idx * (nodeWidth + nodePadding);
          node.y = currentY + (tierHeight - nodeHeight) / 2;
        });

        currentY += tierHeight + tierPadding;
      }
    }

    return { nodes: positionedNodes, tierConfigs: configs };
  }
}

/**
 * Factory function to create a Graph from raw architecture data
 */
export function createGraph(
  nodes: WorkspaceProjectNode[],
  edges: CrossProjectRelationship[]
): Graph {
  return new Graph(nodes, edges);
}
