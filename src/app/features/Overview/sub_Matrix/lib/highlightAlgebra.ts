/**
 * Declarative Highlight Algebra
 *
 * A composable system for determining visual emphasis in graph visualizations.
 * Rules can be combined using algebraic operations (union, intersection, propagation)
 * to express complex highlighting logic declaratively.
 *
 * Example usage:
 * ```ts
 * const rule = HighlightRule.selected('node-1')
 *   .withConnections(edges)  // Highlight node and its connections
 *   .union(HighlightRule.selected('node-2'));  // Also highlight another node
 *
 * const weight = rule.getWeight('node-3', 'node'); // 0 = not highlighted, 1 = highlighted
 * ```
 */

import type { GraphEdge } from '../../sub_WorkspaceArchitecture/lib/Graph';

/**
 * Visual weight returned by highlight rules.
 * 0 = not highlighted (dimmed when others are highlighted)
 * 1 = fully highlighted
 * Values between 0-1 can represent partial emphasis (e.g., secondary connections)
 */
export type HighlightWeight = number;

/**
 * Element types that can be highlighted
 */
export type HighlightElementType = 'node' | 'connection';

/**
 * Context for evaluating highlight rules.
 * Contains the current selection state and graph structure.
 */
export interface HighlightContext {
  /** Currently selected cell (source/target pair) */
  activeCell: { sourceId: string; targetId: string } | null;
  /** Graph edges for connection-aware highlighting */
  edges: GraphEdge[];
}

/**
 * A highlight rule that can compute visual weight for elements.
 * Rules are immutable and can be composed algebraically.
 */
export interface HighlightRule {
  /**
   * Compute the visual weight for an element.
   * @param id - Element ID (node ID or connection source ID)
   * @param type - Element type ('node' or 'connection')
   * @param targetId - For connections, the target node ID
   * @returns Visual weight 0-1
   */
  getWeight(id: string, type: HighlightElementType, targetId?: string): HighlightWeight;

  /**
   * Check if anything is highlighted by this rule.
   * Used to determine if non-highlighted elements should be dimmed.
   */
  hasActiveHighlight(): boolean;

  /**
   * Union: highlight if either rule highlights.
   * weight = max(this, other)
   */
  union(other: HighlightRule): HighlightRule;

  /**
   * Intersection: highlight only if both rules highlight.
   * weight = min(this, other)
   */
  intersection(other: HighlightRule): HighlightRule;

  /**
   * Propagation: extend highlighting along edges.
   * Highlights connected nodes/edges with optional weight decay.
   */
  withConnections(edges: GraphEdge[], decay?: number): HighlightRule;

  /**
   * Path: highlight the path between two nodes.
   * Requires edges to compute the path.
   */
  pathTo(targetId: string, edges: GraphEdge[]): HighlightRule;
}

/**
 * Base implementation of highlight rule with composition support.
 */
class BaseHighlightRule implements HighlightRule {
  constructor(
    private readonly evaluator: (id: string, type: HighlightElementType, targetId?: string) => HighlightWeight,
    private readonly hasActive: boolean
  ) {}

  getWeight(id: string, type: HighlightElementType, targetId?: string): HighlightWeight {
    return this.evaluator(id, type, targetId);
  }

  hasActiveHighlight(): boolean {
    return this.hasActive;
  }

  union(other: HighlightRule): HighlightRule {
    return new BaseHighlightRule(
      (id, type, targetId) => Math.max(this.getWeight(id, type, targetId), other.getWeight(id, type, targetId)),
      this.hasActive || other.hasActiveHighlight()
    );
  }

  intersection(other: HighlightRule): HighlightRule {
    return new BaseHighlightRule(
      (id, type, targetId) => Math.min(this.getWeight(id, type, targetId), other.getWeight(id, type, targetId)),
      this.hasActive && other.hasActiveHighlight()
    );
  }

  withConnections(edges: GraphEdge[], decay = 1): HighlightRule {
    // Build a set of node IDs that are highlighted at full weight
    const highlightedNodes = new Set<string>();
    const connectedNodes = new Map<string, number>();

    // First pass: find directly highlighted nodes
    for (const edge of edges) {
      if (this.getWeight(edge.sourceNode.id, 'node') === 1) {
        highlightedNodes.add(edge.sourceNode.id);
      }
      if (this.getWeight(edge.targetNode.id, 'node') === 1) {
        highlightedNodes.add(edge.targetNode.id);
      }
    }

    // Second pass: find connected nodes
    for (const edge of edges) {
      if (highlightedNodes.has(edge.sourceNode.id)) {
        const current = connectedNodes.get(edge.targetNode.id) || 0;
        connectedNodes.set(edge.targetNode.id, Math.max(current, decay));
      }
      if (highlightedNodes.has(edge.targetNode.id)) {
        const current = connectedNodes.get(edge.sourceNode.id) || 0;
        connectedNodes.set(edge.sourceNode.id, Math.max(current, decay));
      }
    }

    return new BaseHighlightRule(
      (id, type, targetId) => {
        const baseWeight = this.getWeight(id, type, targetId);
        if (baseWeight > 0) return baseWeight;

        if (type === 'node') {
          return connectedNodes.get(id) || 0;
        }

        // For connections, check if both endpoints are highlighted or connected
        if (targetId) {
          const sourceHighlighted = highlightedNodes.has(id) || connectedNodes.has(id);
          const targetHighlighted = highlightedNodes.has(targetId) || connectedNodes.has(targetId);
          if (sourceHighlighted && targetHighlighted) {
            // Check if this edge connects to a highlighted node
            for (const edge of edges) {
              if (edge.sourceNode.id === id && edge.targetNode.id === targetId) {
                if (highlightedNodes.has(id) || highlightedNodes.has(targetId)) {
                  return decay;
                }
              }
            }
          }
        }

        return 0;
      },
      this.hasActive
    );
  }

  pathTo(targetId: string, edges: GraphEdge[]): HighlightRule {
    // Build adjacency list for BFS
    const adjacency = new Map<string, Array<{ nodeId: string; edgeId: string }>>();
    for (const edge of edges) {
      if (!adjacency.has(edge.sourceNode.id)) adjacency.set(edge.sourceNode.id, []);
      if (!adjacency.has(edge.targetNode.id)) adjacency.set(edge.targetNode.id, []);
      adjacency.get(edge.sourceNode.id)!.push({ nodeId: edge.targetNode.id, edgeId: edge.id });
      adjacency.get(edge.targetNode.id)!.push({ nodeId: edge.sourceNode.id, edgeId: edge.id });
    }

    // Find all highlighted source nodes
    const sourceNodes: string[] = [];
    for (const [nodeId] of adjacency) {
      if (this.getWeight(nodeId, 'node') === 1) {
        sourceNodes.push(nodeId);
      }
    }

    // BFS to find path from any source to target
    const pathNodes = new Set<string>();
    const pathEdges = new Set<string>();

    for (const sourceId of sourceNodes) {
      const visited = new Set<string>();
      const parent = new Map<string, { nodeId: string; edgeId: string }>();
      const queue = [sourceId];
      visited.add(sourceId);

      while (queue.length > 0) {
        const current = queue.shift()!;
        if (current === targetId) {
          // Reconstruct path
          let node = targetId;
          while (parent.has(node)) {
            pathNodes.add(node);
            const p = parent.get(node)!;
            pathEdges.add(p.edgeId);
            node = p.nodeId;
          }
          pathNodes.add(sourceId);
          break;
        }

        for (const neighbor of adjacency.get(current) || []) {
          if (!visited.has(neighbor.nodeId)) {
            visited.add(neighbor.nodeId);
            parent.set(neighbor.nodeId, { nodeId: current, edgeId: neighbor.edgeId });
            queue.push(neighbor.nodeId);
          }
        }
      }
    }

    return new BaseHighlightRule(
      (id, type, tId) => {
        const baseWeight = this.getWeight(id, type, tId);
        if (baseWeight > 0) return baseWeight;

        if (type === 'node') {
          return pathNodes.has(id) ? 1 : 0;
        }

        // For connections, check if the edge is in the path
        for (const edge of edges) {
          if (edge.sourceNode.id === id && edge.targetNode.id === tId) {
            if (pathEdges.has(edge.id)) return 1;
          }
        }

        return 0;
      },
      this.hasActive || pathNodes.size > 0
    );
  }
}

/**
 * Factory for creating highlight rules.
 */
export const HighlightRule = {
  /**
   * Create a rule that highlights nothing.
   * Useful as a base for composition.
   */
  none(): HighlightRule {
    return new BaseHighlightRule(() => 0, false);
  },

  /**
   * Create a rule that highlights everything.
   */
  all(): HighlightRule {
    return new BaseHighlightRule(() => 1, true);
  },

  /**
   * Create a rule that highlights a specific node.
   */
  node(nodeId: string): HighlightRule {
    return new BaseHighlightRule(
      (id, type) => (type === 'node' && id === nodeId ? 1 : 0),
      true
    );
  },

  /**
   * Create a rule that highlights nodes matching a predicate.
   */
  nodes(predicate: (nodeId: string) => boolean): HighlightRule {
    return new BaseHighlightRule(
      (id, type) => (type === 'node' && predicate(id) ? 1 : 0),
      true
    );
  },

  /**
   * Create a rule that highlights a specific connection.
   */
  connection(sourceId: string, targetId: string): HighlightRule {
    return new BaseHighlightRule(
      (id, type, tId) => (type === 'connection' && id === sourceId && tId === targetId ? 1 : 0),
      true
    );
  },

  /**
   * Create a rule from an active cell selection.
   * This is the primary factory for selection-based highlighting.
   */
  fromSelection(activeCell: { sourceId: string; targetId: string } | null): HighlightRule {
    if (!activeCell) {
      return HighlightRule.none();
    }

    return new BaseHighlightRule(
      (id, type, targetId) => {
        if (type === 'node') {
          // Node is highlighted if it's either the source or target of the active cell
          return activeCell.sourceId === id || activeCell.targetId === id ? 1 : 0;
        }
        // Connection is highlighted if it matches the active cell exactly
        return activeCell.sourceId === id && activeCell.targetId === targetId ? 1 : 0;
      },
      true
    );
  },

  /**
   * Create a rule that highlights nodes and all their direct connections.
   * Common pattern: "highlight X and everything connected to X"
   */
  nodeWithConnections(nodeId: string, edges: GraphEdge[]): HighlightRule {
    const connectedNodeIds = new Set<string>([nodeId]);
    const connectedEdgeKeys = new Set<string>();

    for (const edge of edges) {
      if (edge.sourceNode.id === nodeId) {
        connectedNodeIds.add(edge.targetNode.id);
        connectedEdgeKeys.add(`${edge.sourceNode.id}-${edge.targetNode.id}`);
      }
      if (edge.targetNode.id === nodeId) {
        connectedNodeIds.add(edge.sourceNode.id);
        connectedEdgeKeys.add(`${edge.sourceNode.id}-${edge.targetNode.id}`);
      }
    }

    return new BaseHighlightRule(
      (id, type, targetId) => {
        if (type === 'node') {
          return connectedNodeIds.has(id) ? 1 : 0;
        }
        return connectedEdgeKeys.has(`${id}-${targetId}`) ? 1 : 0;
      },
      true
    );
  },

  /**
   * Create a rule that highlights the path between two nodes.
   */
  path(sourceId: string, targetId: string, edges: GraphEdge[]): HighlightRule {
    return HighlightRule.node(sourceId).pathTo(targetId, edges);
  },
};

/**
 * Convenience function to create a highlight context from component state.
 */
export function createHighlightContext(
  selectedCell: { sourceId: string; targetId: string } | null,
  hoveredCell: { sourceId: string; targetId: string } | null,
  edges: GraphEdge[]
): HighlightContext {
  return {
    activeCell: selectedCell || hoveredCell,
    edges,
  };
}

/**
 * Hook-friendly helper that creates a memoizable highlight rule from context.
 * Selection takes precedence over hover.
 */
export function createHighlightRule(context: HighlightContext): HighlightRule {
  return HighlightRule.fromSelection(context.activeCell);
}

/**
 * Check if element is highlighted (weight > 0)
 */
export function isHighlighted(
  rule: HighlightRule,
  id: string,
  type: HighlightElementType,
  targetId?: string
): boolean {
  return rule.getWeight(id, type, targetId) > 0;
}

/**
 * Check if element should be dimmed (has active selection but element not highlighted)
 */
export function isDimmed(
  rule: HighlightRule,
  id: string,
  type: HighlightElementType,
  targetId?: string
): boolean {
  return rule.hasActiveHighlight() && !isHighlighted(rule, id, type, targetId);
}
