/**
 * DAG-based Task Scheduler
 *
 * Resolves task dependencies and determines which tasks can execute
 * in parallel. Tasks declare their dependencies by ID; the scheduler
 * performs topological analysis to find "ready" tasks whose
 * dependencies have all completed.
 *
 * Supports configurable parallelism limits and cycle detection.
 */

// ============================================================================
// Types
// ============================================================================

export type DAGTaskStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface DAGTask {
  id: string;
  status: DAGTaskStatus;
  dependencies: string[]; // IDs of tasks this one depends on
}

export interface DAGConfig {
  /** Maximum number of tasks that can run concurrently (default: 3) */
  maxParallel: number;
}

export interface DAGState {
  /** Tasks ready to execute (all dependencies met, not yet started) */
  ready: string[];
  /** Tasks currently running */
  running: string[];
  /** Tasks that have completed successfully */
  completed: string[];
  /** Tasks that have failed */
  failed: string[];
  /** Tasks blocked on unfinished dependencies */
  blocked: string[];
  /** Whether all tasks are finished (completed or failed) */
  isFinished: boolean;
}

const DEFAULT_CONFIG: DAGConfig = {
  maxParallel: 3,
};

// ============================================================================
// DAG Scheduler
// ============================================================================

export class DAGScheduler {
  private config: DAGConfig;

  constructor(config?: Partial<DAGConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Validate the DAG for cycles. Returns null if valid, or an error
   * message describing the cycle if invalid.
   */
  validateNoCycles(tasks: DAGTask[]): string | null {
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const visited = new Set<string>();
    const inStack = new Set<string>();

    const dfs = (id: string): string | null => {
      if (inStack.has(id)) return `Cycle detected involving task "${id}"`;
      if (visited.has(id)) return null;

      inStack.add(id);
      visited.add(id);

      const task = taskMap.get(id);
      if (task) {
        for (const dep of task.dependencies) {
          const cycleError = dfs(dep);
          if (cycleError) return cycleError;
        }
      }

      inStack.delete(id);
      return null;
    };

    for (const task of tasks) {
      const error = dfs(task.id);
      if (error) return error;
    }

    return null;
  }

  /**
   * Get the current state of the DAG given a set of tasks.
   */
  getState(tasks: DAGTask[]): DAGState {
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const completed: string[] = [];
    const failed: string[] = [];
    const running: string[] = [];
    const ready: string[] = [];
    const blocked: string[] = [];

    const completedSet = new Set<string>();
    const failedSet = new Set<string>();

    // First pass: categorize by current status
    for (const task of tasks) {
      switch (task.status) {
        case 'completed':
          completed.push(task.id);
          completedSet.add(task.id);
          break;
        case 'failed':
          failed.push(task.id);
          failedSet.add(task.id);
          break;
        case 'running':
          running.push(task.id);
          break;
        case 'pending':
          // Will be classified as ready or blocked below
          break;
      }
    }

    // Second pass: classify pending tasks as ready or blocked
    for (const task of tasks) {
      if (task.status !== 'pending') continue;

      const allDepsResolved = task.dependencies.every(depId => {
        // A dependency is resolved if it completed successfully
        // or if the dependency task doesn't exist (treat as satisfied)
        return completedSet.has(depId) || !taskMap.has(depId);
      });

      const anyDepFailed = task.dependencies.some(depId =>
        failedSet.has(depId)
      );

      if (anyDepFailed) {
        // If any dependency failed, this task is blocked (cannot proceed)
        blocked.push(task.id);
      } else if (allDepsResolved) {
        ready.push(task.id);
      } else {
        blocked.push(task.id);
      }
    }

    const isFinished = tasks.length > 0 &&
      running.length === 0 &&
      ready.length === 0 &&
      blocked.every(id => {
        // Blocked tasks whose deps have all failed are also "finished"
        const task = taskMap.get(id)!;
        return task.dependencies.some(depId => failedSet.has(depId));
      });

    return { ready, running, completed, failed, blocked, isFinished };
  }

  /**
   * Get the next batch of tasks that should be started, respecting
   * the parallelism limit and dependency ordering.
   */
  getNextBatch(tasks: DAGTask[]): string[] {
    const state = this.getState(tasks);
    const availableSlots = this.config.maxParallel - state.running.length;

    if (availableSlots <= 0) return [];

    return state.ready.slice(0, availableSlots);
  }

  /**
   * Get a topological ordering of all tasks (for display/debugging).
   * Returns task IDs in execution order. Tasks at the same level
   * are grouped together (can run in parallel).
   */
  getExecutionLevels(tasks: DAGTask[]): string[][] {
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const levels: string[][] = [];
    const assigned = new Set<string>();

    while (assigned.size < tasks.length) {
      const level: string[] = [];

      for (const task of tasks) {
        if (assigned.has(task.id)) continue;

        const allDepsAssigned = task.dependencies.every(
          depId => assigned.has(depId) || !taskMap.has(depId)
        );

        if (allDepsAssigned) {
          level.push(task.id);
        }
      }

      if (level.length === 0) {
        // Remaining tasks form a cycle — add them all to break deadlock
        const remaining = tasks.filter(t => !assigned.has(t.id)).map(t => t.id);
        levels.push(remaining);
        break;
      }

      for (const id of level) {
        assigned.add(id);
      }
      levels.push(level);
    }

    return levels;
  }
}

// ============================================================================
// Dependency Resolution Helpers
// ============================================================================

/**
 * Build DAGTask list from tasks with optional dependency declarations.
 * Tasks without dependencies are treated as independent (can run in parallel).
 */
export function buildDAGTasks<T extends { id: string; dependencies?: string[] }>(
  tasks: T[],
  getStatus: (task: T) => DAGTaskStatus
): DAGTask[] {
  return tasks.map(task => ({
    id: task.id,
    status: getStatus(task),
    dependencies: task.dependencies || [],
  }));
}
