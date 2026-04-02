/**
 * DAG Scheduler — Conductor v3
 *
 * Provides topological ordering, cycle detection, critical path analysis,
 * wave-based parallel scheduling, and file conflict resolution for the
 * dispatch phase. Extends the existing dependency-aware getNextBatch()
 * with richer graph algorithms.
 */

import type { V3Task } from './types';

// ============================================================================
// DAG Node & Graph Types
// ============================================================================

export interface DAGNode {
  taskId: string;
  task: V3Task;
  inDegree: number;
  inEdges: string[];       // taskIds this node depends on
  outEdges: string[];      // taskIds that depend on this node
  depth: number;           // topological depth (0 = root, no dependencies)
  estimatedWeight: number; // complexity-based weight for critical path
}

export interface DAGValidation {
  valid: boolean;
  cycles: string[][];      // cycle chains if found (empty if valid)
  roots: string[];         // tasks with no dependencies (entry points)
  leaves: string[];        // tasks nothing depends on (exit points)
  criticalPath: string[];  // taskIds on the longest weighted path
  maxParallelism: number;  // theoretical max tasks runnable in parallel
  totalDepth: number;      // number of sequential waves needed
}

export interface DAGSchedule {
  waves: V3Task[][];
  totalWaves: number;
  criticalPathLength: number;
}

export interface FileConflict {
  file: string;
  conflictingTaskIds: string[];
  resolution: 'serialize' | 'merge-context';
}

export interface DAGMetrics {
  totalWaves: number;
  criticalPathLength: number;
  maxParallelism: number;
  fileConflictsResolved: number;
}

// ============================================================================
// Complexity-to-Weight Mapping
// ============================================================================

const COMPLEXITY_WEIGHTS: Record<number, number> = {
  1: 1,  // simple: fast
  2: 3,  // moderate
  3: 5,  // complex: slow
};

// ============================================================================
// DAG Construction
// ============================================================================

/**
 * Build a directed acyclic graph from task dependency declarations.
 * Each task becomes a node; dependsOn fields become directed edges.
 */
export function buildDAG(tasks: V3Task[]): Map<string, DAGNode> {
  const dag = new Map<string, DAGNode>();
  const taskIds = new Set(tasks.map(t => t.id));

  // Create nodes
  for (const task of tasks) {
    // Filter dependsOn to only reference tasks that exist in this batch
    const validDeps = task.dependsOn.filter(dep => taskIds.has(dep));

    dag.set(task.id, {
      taskId: task.id,
      task,
      inDegree: validDeps.length,
      inEdges: validDeps,
      outEdges: [],
      depth: 0,
      estimatedWeight: COMPLEXITY_WEIGHTS[task.complexity] || 1,
    });
  }

  // Build outEdges (reverse adjacency)
  for (const [, node] of dag) {
    for (const dep of node.inEdges) {
      const depNode = dag.get(dep);
      if (depNode) {
        depNode.outEdges.push(node.taskId);
      }
    }
  }

  return dag;
}

// ============================================================================
// Cycle Detection & Topological Sort (Kahn's Algorithm)
// ============================================================================

/**
 * Validate the DAG: detect cycles, compute roots/leaves, critical path.
 */
export function validateDAG(dag: Map<string, DAGNode>): DAGValidation {
  const sorted = topologicalSort(dag);
  const hasCycles = sorted.length < dag.size;

  // Find cycles if topological sort didn't consume all nodes
  const cycles = hasCycles ? detectCycles(dag) : [];

  // Compute depths using topological order
  if (!hasCycles) {
    computeDepths(dag, sorted);
  }

  const roots = Array.from(dag.values())
    .filter(n => n.inDegree === 0)
    .map(n => n.taskId);

  const leaves = Array.from(dag.values())
    .filter(n => n.outEdges.length === 0)
    .map(n => n.taskId);

  // Compute max parallelism: max number of nodes at any single depth
  const depthCounts = new Map<number, number>();
  for (const node of dag.values()) {
    depthCounts.set(node.depth, (depthCounts.get(node.depth) || 0) + 1);
  }
  const maxParallelism = depthCounts.size > 0
    ? Math.max(...depthCounts.values())
    : 0;

  const totalDepth = depthCounts.size > 0
    ? Math.max(...depthCounts.keys()) + 1
    : 0;

  const criticalPath = hasCycles ? [] : computeCriticalPath(dag);

  return {
    valid: !hasCycles,
    cycles,
    roots,
    leaves,
    criticalPath,
    maxParallelism,
    totalDepth,
  };
}

/**
 * Kahn's algorithm: returns topologically sorted task IDs.
 * If the result has fewer elements than the graph, cycles exist.
 */
export function topologicalSort(dag: Map<string, DAGNode>): string[] {
  const inDegrees = new Map<string, number>();
  for (const [id, node] of dag) {
    inDegrees.set(id, node.inEdges.length);
  }

  const queue: string[] = [];
  for (const [id, degree] of inDegrees) {
    if (degree === 0) queue.push(id);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);

    const node = dag.get(current)!;
    for (const successor of node.outEdges) {
      const newDegree = (inDegrees.get(successor) || 1) - 1;
      inDegrees.set(successor, newDegree);
      if (newDegree === 0) queue.push(successor);
    }
  }

  return sorted;
}

/**
 * Compute topological depths from sorted order.
 * Depth = max(depth of all dependencies) + 1, or 0 for roots.
 */
function computeDepths(dag: Map<string, DAGNode>, sorted: string[]): void {
  for (const taskId of sorted) {
    const node = dag.get(taskId)!;
    if (node.inEdges.length === 0) {
      node.depth = 0;
    } else {
      let maxDepth = 0;
      for (const dep of node.inEdges) {
        const depNode = dag.get(dep);
        if (depNode) {
          maxDepth = Math.max(maxDepth, depNode.depth + 1);
        }
      }
      node.depth = maxDepth;
    }
  }
}

/**
 * Detect cycles using DFS with coloring (white/gray/black).
 * Returns an array of cycle chains.
 */
function detectCycles(dag: Map<string, DAGNode>): string[][] {
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  const parent = new Map<string, string | null>();
  const cycles: string[][] = [];

  for (const id of dag.keys()) {
    color.set(id, WHITE);
    parent.set(id, null);
  }

  function dfs(nodeId: string): void {
    color.set(nodeId, GRAY);
    const node = dag.get(nodeId)!;

    for (const successor of node.outEdges) {
      if (color.get(successor) === GRAY) {
        // Back edge — found a cycle
        const cycle: string[] = [successor];
        let current = nodeId;
        while (current !== successor) {
          cycle.push(current);
          current = parent.get(current) || successor;
        }
        cycle.reverse();
        cycles.push(cycle);
      } else if (color.get(successor) === WHITE) {
        parent.set(successor, nodeId);
        dfs(successor);
      }
    }

    color.set(nodeId, BLACK);
  }

  for (const id of dag.keys()) {
    if (color.get(id) === WHITE) dfs(id);
  }

  return cycles;
}

// ============================================================================
// Critical Path (Longest Weighted Path via DP)
// ============================================================================

/**
 * Compute the critical path through the DAG.
 * Uses dynamic programming on topological order with complexity weights.
 */
export function computeCriticalPath(dag: Map<string, DAGNode>): string[] {
  const sorted = topologicalSort(dag);
  if (sorted.length === 0) return [];

  const dist = new Map<string, number>();
  const predecessor = new Map<string, string | null>();

  for (const id of sorted) {
    dist.set(id, 0);
    predecessor.set(id, null);
  }

  // Forward pass: compute longest path
  for (const taskId of sorted) {
    const node = dag.get(taskId)!;
    const currentDist = dist.get(taskId)! + node.estimatedWeight;

    for (const successor of node.outEdges) {
      if (currentDist > (dist.get(successor) || 0)) {
        dist.set(successor, currentDist);
        predecessor.set(successor, taskId);
      }
    }
  }

  // Find the node with maximum distance (end of critical path)
  let maxDist = 0;
  let endNode = sorted[0];
  for (const [id, d] of dist) {
    const node = dag.get(id)!;
    const totalDist = d + node.estimatedWeight;
    if (totalDist > maxDist) {
      maxDist = totalDist;
      endNode = id;
    }
  }

  // Trace back the critical path
  const path: string[] = [];
  let current: string | null = endNode;
  while (current !== null) {
    path.push(current);
    current = predecessor.get(current) || null;
  }
  path.reverse();

  return path;
}

// ============================================================================
// Wave-Based Scheduling
// ============================================================================

/**
 * Group tasks into execution waves based on topological depth.
 * Tasks in the same wave can run in parallel (no dependencies between them).
 * Respects maxParallel limit by splitting large waves.
 */
export function computeWaves(dag: Map<string, DAGNode>, maxParallel: number): DAGSchedule {
  const sorted = topologicalSort(dag);
  if (sorted.length === 0) {
    return { waves: [], totalWaves: 0, criticalPathLength: 0 };
  }

  // Ensure depths are computed
  computeDepths(dag, sorted);

  // Group by depth
  const depthGroups = new Map<number, V3Task[]>();
  for (const taskId of sorted) {
    const node = dag.get(taskId)!;
    const group = depthGroups.get(node.depth) || [];
    group.push(node.task);
    depthGroups.set(node.depth, group);
  }

  // Convert depth groups to waves, splitting if exceeds maxParallel
  const waves: V3Task[][] = [];
  const maxDepth = Math.max(...depthGroups.keys(), 0);

  for (let d = 0; d <= maxDepth; d++) {
    const group = depthGroups.get(d) || [];
    if (group.length <= maxParallel) {
      waves.push(group);
    } else {
      // Split into sub-waves
      for (let i = 0; i < group.length; i += maxParallel) {
        waves.push(group.slice(i, i + maxParallel));
      }
    }
  }

  const criticalPath = computeCriticalPath(dag);
  const criticalPathLength = criticalPath.reduce((sum, id) => {
    const node = dag.get(id);
    return sum + (node?.estimatedWeight || 0);
  }, 0);

  return {
    waves,
    totalWaves: waves.length,
    criticalPathLength,
  };
}

// ============================================================================
// File Conflict Detection & Resolution
// ============================================================================

/**
 * Detect tasks that target the same files but have no dependency relationship.
 * These are potential merge conflicts if run in parallel.
 */
export function detectFileConflicts(tasks: V3Task[]): FileConflict[] {
  // Build file -> taskId[] reverse index
  const fileToTasks = new Map<string, string[]>();
  for (const task of tasks) {
    for (const file of task.targetFiles) {
      const normalized = file.replace(/\\/g, '/');
      const existing = fileToTasks.get(normalized) || [];
      existing.push(task.id);
      fileToTasks.set(normalized, existing);
    }
  }

  // Build dependency lookup for quick checks
  const dependsOnSet = new Map<string, Set<string>>();
  for (const task of tasks) {
    dependsOnSet.set(task.id, new Set(task.dependsOn));
  }

  const conflicts: FileConflict[] = [];
  for (const [file, taskIds] of fileToTasks) {
    if (taskIds.length < 2) continue;

    // Check if any pair is already serialized by dependencies
    const unserializedIds: string[] = [];
    for (let i = 0; i < taskIds.length; i++) {
      let isSerialized = false;
      for (let j = 0; j < taskIds.length; j++) {
        if (i === j) continue;
        const aDeps = dependsOnSet.get(taskIds[i]);
        const bDeps = dependsOnSet.get(taskIds[j]);
        if (aDeps?.has(taskIds[j]) || bDeps?.has(taskIds[i])) {
          isSerialized = true;
          break;
        }
      }
      if (!isSerialized) unserializedIds.push(taskIds[i]);
    }

    if (unserializedIds.length >= 2) {
      conflicts.push({
        file,
        conflictingTaskIds: unserializedIds,
        resolution: 'serialize',
      });
    }
  }

  return conflicts;
}

/**
 * Resolve file conflicts by adding synthetic dependency edges.
 * Modifies tasks in-place by appending to dependsOn.
 * Returns the mutated tasks array.
 */
export function resolveConflicts(tasks: V3Task[], conflicts: FileConflict[]): V3Task[] {
  for (const conflict of conflicts) {
    if (conflict.resolution !== 'serialize') continue;
    if (conflict.conflictingTaskIds.length < 2) continue;

    // Chain conflicting tasks: A -> B -> C
    // Sort by complexity (simple first) for better ordering
    const sorted = conflict.conflictingTaskIds
      .map(id => tasks.find(t => t.id === id)!)
      .filter(Boolean)
      .sort((a, b) => a.complexity - b.complexity);

    for (let i = 1; i < sorted.length; i++) {
      const prevId = sorted[i - 1].id;
      if (!sorted[i].dependsOn.includes(prevId)) {
        sorted[i].dependsOn.push(prevId);
      }
    }
  }

  return tasks;
}

/**
 * Full DAG pipeline: build, validate, resolve conflicts, compute schedule.
 * Returns null if the graph has irrecoverable cycles.
 */
export function prepareDAGSchedule(
  tasks: V3Task[],
  maxParallel: number
): { schedule: DAGSchedule; validation: DAGValidation; metrics: DAGMetrics } | null {
  // 1. Detect and resolve file conflicts first (may add edges)
  const conflicts = detectFileConflicts(tasks);
  if (conflicts.length > 0) {
    resolveConflicts(tasks, conflicts);
  }

  // 2. Build DAG with conflict-resolved dependencies
  const dag = buildDAG(tasks);

  // 3. Validate (cycle detection)
  const validation = validateDAG(dag);
  if (!validation.valid) {
    return null; // Cycles detected — caller should fall back
  }

  // 4. Compute wave schedule
  const schedule = computeWaves(dag, maxParallel);

  const metrics: DAGMetrics = {
    totalWaves: schedule.totalWaves,
    criticalPathLength: schedule.criticalPathLength,
    maxParallelism: validation.maxParallelism,
    fileConflictsResolved: conflicts.length,
  };

  return { schedule, validation, metrics };
}
