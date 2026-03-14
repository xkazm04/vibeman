/**
 * Domain Scheduler
 *
 * File-path-overlap-aware scheduling for the execute stage.
 * Replaces DAG-based scheduling with domain isolation by file-path intersection.
 * Specs that touch the same files are serialized; non-overlapping specs run in parallel.
 */

import * as path from 'node:path';
import type { SpecMetadata, AffectedFiles } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface SchedulerState {
  pending: SpecMetadata[];
  running: Map<string, Set<string>>; // specId -> claimed paths
  completed: Set<string>;
  failed: Set<string>;
}

// ============================================================================
// Path Utilities
// ============================================================================

/**
 * Returns the union of all file paths from an AffectedFiles object,
 * normalized to forward slashes for cross-platform consistency.
 */
export function getAllPaths(af: AffectedFiles): Set<string> {
  const paths = new Set<string>();
  for (const p of [...af.create, ...af.modify, ...af.delete]) {
    paths.add(path.normalize(p).replace(/\\/g, '/'));
  }
  return paths;
}

/**
 * Returns true if any element in set `a` also exists in set `b`.
 * Iterates the smaller set for efficiency.
 */
export function hasOverlap(a: Set<string>, b: Set<string>): boolean {
  const [smaller, larger] = a.size <= b.size ? [a, b] : [b, a];
  for (const item of smaller) {
    if (larger.has(item)) return true;
  }
  return false;
}

// ============================================================================
// Batch Generation
// ============================================================================

/**
 * Computes the next batch of specs that can execute in parallel.
 *
 * Rules:
 * - batch.length <= available slots (maxParallel - running.size)
 * - No spec in the batch overlaps with any running task's claimed paths
 * - No two specs in the batch overlap with each other
 */
export function getNextBatch(state: SchedulerState, maxParallel: number): SpecMetadata[] {
  const availableSlots = maxParallel - state.running.size;
  if (availableSlots <= 0) return [];

  // Collect all running paths into one set for fast overlap checks
  const runningPaths = new Set<string>();
  for (const paths of state.running.values()) {
    for (const p of paths) {
      runningPaths.add(p);
    }
  }

  const batch: SpecMetadata[] = [];
  const batchPaths = new Set<string>();

  for (const spec of state.pending) {
    if (batch.length >= availableSlots) break;

    const specPaths = getAllPaths(spec.affectedFiles);

    // Skip if overlaps with running tasks
    if (hasOverlap(specPaths, runningPaths)) continue;

    // Skip if overlaps with other specs already in this batch
    if (hasOverlap(specPaths, batchPaths)) continue;

    batch.push(spec);
    for (const p of specPaths) {
      batchPaths.add(p);
    }
  }

  return batch;
}
