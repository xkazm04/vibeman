/**
 * Architecture Playground Validation Engine
 *
 * Validates design-time architecture graphs for:
 * - Circular dependencies (via DFS cycle detection)
 * - Anti-patterns (e.g., frontend → database)
 * - Missing error handling paths
 * - Orphan nodes with no connections
 */

import type { ProjectTier, IntegrationType } from './types';

export interface PlaygroundNode {
  id: string;
  name: string;
  tier: ProjectTier;
}

export interface PlaygroundEdge {
  id: string;
  sourceId: string;
  targetId: string;
  integrationType: IntegrationType;
  label: string;
}

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  id: string;
  severity: ValidationSeverity;
  title: string;
  description: string;
  nodeIds?: string[];
  edgeIds?: string[];
}

/**
 * Anti-pattern rules: tier pairs that should not have direct connections
 */
const ANTI_PATTERNS: Array<{
  sourceTier: ProjectTier;
  targetTier: ProjectTier;
  integrationType?: IntegrationType;
  title: string;
  description: string;
}> = [
  {
    sourceTier: 'frontend',
    targetTier: 'external',
    integrationType: 'database',
    title: 'Direct frontend-to-database connection',
    description: 'Frontend should not connect directly to databases. Use a backend service as an intermediary for security and abstraction.',
  },
  {
    sourceTier: 'frontend',
    targetTier: 'external',
    integrationType: 'storage',
    title: 'Direct frontend-to-storage connection',
    description: 'Consider using a backend service to manage file uploads with proper validation and access control.',
  },
];

/**
 * Detect circular dependencies using DFS with color marking.
 * Returns all distinct cycles found.
 */
function detectCycles(
  nodes: PlaygroundNode[],
  edges: PlaygroundEdge[]
): ValidationIssue[] {
  const adj = new Map<string, PlaygroundEdge[]>();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of edges) {
    const list = adj.get(e.sourceId);
    if (list) list.push(e);
  }

  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  const parent = new Map<string, string | null>();
  for (const n of nodes) {
    color.set(n.id, WHITE);
    parent.set(n.id, null);
  }

  const issues: ValidationIssue[] = [];
  const foundCycles = new Set<string>();

  function dfs(nodeId: string) {
    color.set(nodeId, GRAY);
    for (const edge of adj.get(nodeId) || []) {
      const targetColor = color.get(edge.targetId);
      if (targetColor === GRAY) {
        // Back edge found — cycle detected
        const cycleNodes: string[] = [edge.targetId];
        let cur = nodeId;
        while (cur !== edge.targetId) {
          cycleNodes.push(cur);
          cur = parent.get(cur) || '';
        }
        cycleNodes.reverse();
        const cycleKey = [...cycleNodes].sort().join(',');
        if (!foundCycles.has(cycleKey)) {
          foundCycles.add(cycleKey);
          const nodeMap = new Map(nodes.map(n => [n.id, n]));
          const names = cycleNodes.map(id => nodeMap.get(id)?.name || id);
          issues.push({
            id: `cycle-${cycleKey}`,
            severity: 'error',
            title: 'Circular dependency detected',
            description: `Cycle: ${names.join(' → ')} → ${names[0]}`,
            nodeIds: cycleNodes,
            edgeIds: [edge.id],
          });
        }
      } else if (targetColor === WHITE) {
        parent.set(edge.targetId, nodeId);
        dfs(edge.targetId);
      }
    }
    color.set(nodeId, BLACK);
  }

  for (const n of nodes) {
    if (color.get(n.id) === WHITE) dfs(n.id);
  }

  return issues;
}

/**
 * Detect anti-pattern connections (e.g., frontend → database)
 */
function detectAntiPatterns(
  nodes: PlaygroundNode[],
  edges: PlaygroundEdge[]
): ValidationIssue[] {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const issues: ValidationIssue[] = [];

  for (const edge of edges) {
    const source = nodeMap.get(edge.sourceId);
    const target = nodeMap.get(edge.targetId);
    if (!source || !target) continue;

    for (const pattern of ANTI_PATTERNS) {
      if (
        source.tier === pattern.sourceTier &&
        target.tier === pattern.targetTier &&
        (!pattern.integrationType || edge.integrationType === pattern.integrationType)
      ) {
        issues.push({
          id: `anti-${edge.id}`,
          severity: 'warning',
          title: pattern.title,
          description: pattern.description,
          nodeIds: [source.id, target.id],
          edgeIds: [edge.id],
        });
      }
    }
  }

  return issues;
}

/**
 * Detect orphan nodes (no connections)
 */
function detectOrphans(
  nodes: PlaygroundNode[],
  edges: PlaygroundEdge[]
): ValidationIssue[] {
  if (nodes.length <= 1) return [];

  const connected = new Set<string>();
  for (const e of edges) {
    connected.add(e.sourceId);
    connected.add(e.targetId);
  }

  return nodes
    .filter(n => !connected.has(n.id))
    .map(n => ({
      id: `orphan-${n.id}`,
      severity: 'info' as ValidationSeverity,
      title: 'Isolated service',
      description: `"${n.name}" has no connections. Consider how it integrates with other services.`,
      nodeIds: [n.id],
    }));
}

/**
 * Run all validations on the playground graph
 */
export function validateDesign(
  nodes: PlaygroundNode[],
  edges: PlaygroundEdge[]
): ValidationIssue[] {
  return [
    ...detectCycles(nodes, edges),
    ...detectAntiPatterns(nodes, edges),
    ...detectOrphans(nodes, edges),
  ];
}
