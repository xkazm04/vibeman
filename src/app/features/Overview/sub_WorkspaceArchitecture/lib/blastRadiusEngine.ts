/**
 * Blast Radius Engine
 *
 * BFS traversal over Graph adjacency lists to compute transitive downstream
 * impact from a source node.  Each node in the result set is annotated with
 * its distance (depth) from the origin:
 *   - 1 = direct dependency  (high risk)
 *   - 2 = second-order       (medium risk)
 *   - 3+ = third-order+      (low risk)
 *
 * The engine is stateless — call `computeBlastRadius` with a Graph instance
 * and a source node ID to get the full impact map.
 */

import type { Graph, GraphEdge } from './Graph';

/** Maximum BFS depth to prevent runaway traversal on dense graphs */
const MAX_DEPTH = 10;

/** Impact level bucket derived from BFS depth */
export type ImpactLevel = 'origin' | 'direct' | 'second' | 'third';

/** A single node in the blast radius with its distance metadata */
export interface BlastRadiusNode {
  nodeId: string;
  nodeName: string;
  depth: number;
  impactLevel: ImpactLevel;
  /** The edge that brought this node into the blast radius */
  incomingEdge: GraphEdge;
}

/** Full blast radius result */
export interface BlastRadiusResult {
  /** The origin node ID */
  originId: string;
  /** Map of nodeId → BlastRadiusNode for O(1) lookup */
  impactMap: Map<string, BlastRadiusNode>;
  /** Ordered list of affected nodes (by depth ascending) */
  affectedNodes: BlastRadiusNode[];
  /** All edges within the blast radius subgraph */
  affectedEdges: GraphEdge[];
  /** Summary counts by impact level */
  summary: {
    direct: number;
    second: number;
    third: number;
    total: number;
  };
}

/**
 * Derive impact level from BFS depth.
 */
function depthToImpactLevel(depth: number): ImpactLevel {
  if (depth === 0) return 'origin';
  if (depth === 1) return 'direct';
  if (depth === 2) return 'second';
  return 'third';
}

/**
 * Compute the downstream blast radius from a source node using BFS.
 *
 * Traverses `graph.getOutgoingEdges()` at each level, expanding to
 * transitive dependencies up to `maxDepth` hops (default 10).
 */
export function computeBlastRadius(
  graph: Graph,
  originId: string,
  maxDepth: number = MAX_DEPTH,
): BlastRadiusResult {
  const impactMap = new Map<string, BlastRadiusNode>();
  const affectedEdges: GraphEdge[] = [];

  // BFS frontier: [nodeId, depth]
  const queue: [string, number][] = [[originId, 0]];
  const visited = new Set<string>([originId]);

  while (queue.length > 0) {
    const [currentId, depth] = queue.shift()!;

    if (depth >= maxDepth) continue;

    const outgoing = graph.getOutgoingEdges(currentId);
    for (const edge of outgoing) {
      const targetId = edge.targetNode.id;
      affectedEdges.push(edge);

      if (!visited.has(targetId)) {
        visited.add(targetId);
        const brNode: BlastRadiusNode = {
          nodeId: targetId,
          nodeName: edge.targetNode.name,
          depth: depth + 1,
          impactLevel: depthToImpactLevel(depth + 1),
          incomingEdge: edge,
        };
        impactMap.set(targetId, brNode);
        queue.push([targetId, depth + 1]);
      }
    }
  }

  // Build sorted list
  const affectedNodes = Array.from(impactMap.values()).sort(
    (a, b) => a.depth - b.depth || a.nodeName.localeCompare(b.nodeName),
  );

  // Compute summary
  let direct = 0, second = 0, third = 0;
  for (const node of affectedNodes) {
    if (node.impactLevel === 'direct') direct++;
    else if (node.impactLevel === 'second') second++;
    else third++;
  }

  return {
    originId,
    impactMap,
    affectedNodes,
    affectedEdges,
    summary: { direct, second, third, total: affectedNodes.length },
  };
}

/** Color palette for blast radius visualization */
export const BLAST_RADIUS_COLORS = {
  origin: '#ef4444',   // red-500  — the node you clicked
  direct: '#ef4444',   // red-500  — direct dependencies (high risk)
  second: '#f97316',   // orange-500 — 2nd-order (medium risk)
  third: '#eab308',    // yellow-500 — 3rd-order+ (low risk)
  dimmed: 'rgba(255,255,255,0.06)',
} as const;

/** Opacity values for blast radius edge rendering */
export const BLAST_RADIUS_EDGE_OPACITY = {
  inRadius: 0.8,
  dimmed: 0.04,
} as const;
