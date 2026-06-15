/**
 * Pure utility functions for task dependency graph operations.
 * No side effects — used by both the dependency store and UI components.
 */

import type { DependencyEdge, RequirementIdString, TaskStatusUnion } from './types';

/**
 * Detect whether adding edge (from → to) would create a cycle.
 * Uses DFS from `to` to check if `from` is reachable.
 */
export function detectCycle(
  edges: DependencyEdge[],
  newFrom: RequirementIdString,
  newTo: RequirementIdString,
): boolean {
  if (newFrom === newTo) return true;

  // Build adjacency: parent → children
  const childMap = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (!childMap.has(edge.from)) childMap.set(edge.from, new Set());
    childMap.get(edge.from)!.add(edge.to);
  }
  // Add the proposed edge
  if (!childMap.has(newFrom)) childMap.set(newFrom, new Set());
  childMap.get(newFrom)!.add(newTo);

  // DFS from newTo — if we reach newFrom, there's a cycle
  const visited = new Set<string>();
  const stack = [newTo];

  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node === newFrom) return true;
    if (visited.has(node)) continue;
    visited.add(node);
    const children = childMap.get(node);
    if (children) {
      for (const child of children) {
        stack.push(child as RequirementIdString);
      }
    }
  }

  return false;
}

/**
 * Build parent → children and child → parents maps from edges.
 */
export function buildMaps(edges: DependencyEdge[]): {
  parentMap: Record<string, string[]>;
  childMap: Record<string, string[]>;
} {
  const parentMap: Record<string, string[]> = {};
  const childMap: Record<string, string[]> = {};

  for (const edge of edges) {
    if (!parentMap[edge.to]) parentMap[edge.to] = [];
    parentMap[edge.to].push(edge.from);

    if (!childMap[edge.from]) childMap[edge.from] = [];
    childMap[edge.from].push(edge.to);
  }

  return { parentMap, childMap };
}

/**
 * Check if a requirement is blocked (has incomplete parents).
 */
export function isRequirementBlocked(
  reqId: string,
  parentMap: Record<string, string[]>,
  taskStatuses: Record<string, { status: TaskStatusUnion }>,
): boolean {
  const parents = parentMap[reqId];
  if (!parents || parents.length === 0) return false;

  return parents.some(parentId => {
    const task = taskStatuses[parentId];
    return !task || task.status.type !== 'completed';
  });
}

/**
 * Get parent IDs that are blocking a requirement.
 */
export function getBlockingParents(
  reqId: string,
  parentMap: Record<string, string[]>,
  taskStatuses: Record<string, { status: TaskStatusUnion }>,
): string[] {
  const parents = parentMap[reqId];
  if (!parents || parents.length === 0) return [];

  return parents.filter(parentId => {
    const task = taskStatuses[parentId];
    return !task || task.status.type !== 'completed';
  });
}

/**
 * Get all requirement IDs that are currently blocked.
 */
export function getBlockedSet(
  edges: DependencyEdge[],
  taskStatuses: Record<string, { status: TaskStatusUnion }>,
): Set<string> {
  const { parentMap } = buildMaps(edges);
  const blocked = new Set<string>();

  for (const reqId of Object.keys(parentMap)) {
    if (isRequirementBlocked(reqId, parentMap, taskStatuses)) {
      blocked.add(reqId);
    }
  }

  return blocked;
}

/**
 * Get requirements that are idle, have dependencies, and all parents are completed (ready to run).
 */
export function getReadyRequirements(
  edges: DependencyEdge[],
  taskStatuses: Record<string, { status: TaskStatusUnion }>,
): string[] {
  const { parentMap } = buildMaps(edges);
  const ready: string[] = [];

  for (const reqId of Object.keys(parentMap)) {
    const task = taskStatuses[reqId];
    const isIdle = !task || task.status.type === 'idle';
    if (isIdle && !isRequirementBlocked(reqId, parentMap, taskStatuses)) {
      ready.push(reqId);
    }
  }

  return ready;
}
