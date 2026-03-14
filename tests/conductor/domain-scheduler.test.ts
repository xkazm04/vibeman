/**
 * Domain Scheduler Tests (EXEC-01)
 *
 * Validates file-path-based scheduling: overlap detection, batch generation,
 * and parallel dispatch safety.
 */

import { describe, it, expect } from 'vitest';
import {
  getAllPaths,
  hasOverlap,
  getNextBatch,
  type SchedulerState,
} from '@/app/features/Manager/lib/conductor/execution/domainScheduler';
import type { AffectedFiles, SpecMetadata } from '@/app/features/Manager/lib/conductor/types';

// ============================================================================
// Helpers
// ============================================================================

function makeSpec(id: string, files: Partial<AffectedFiles> = {}): SpecMetadata {
  return {
    id,
    runId: 'run-1',
    backlogItemId: `backlog-${id}`,
    sequenceNumber: 1,
    title: `Spec ${id}`,
    slug: `spec-${id}`,
    affectedFiles: {
      create: [],
      modify: [],
      delete: [],
      ...files,
    },
    complexity: 'S',
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
}

function emptyState(pending: SpecMetadata[] = []): SchedulerState {
  return {
    pending,
    running: new Map(),
    completed: new Set(),
    failed: new Set(),
  };
}

// ============================================================================
// getAllPaths
// ============================================================================

describe('getAllPaths', () => {
  it('returns union of create, modify, and delete arrays', () => {
    const af: AffectedFiles = {
      create: ['src/a.ts'],
      modify: ['src/b.ts'],
      delete: ['src/c.ts'],
    };
    const result = getAllPaths(af);
    expect(result).toEqual(new Set(['src/a.ts', 'src/b.ts', 'src/c.ts']));
  });

  it('normalizes backslashes to forward slashes', () => {
    const af: AffectedFiles = {
      create: ['src\\components\\Button.tsx'],
      modify: [],
      delete: [],
    };
    const result = getAllPaths(af);
    expect(result.has('src/components/Button.tsx')).toBe(true);
    expect(result.has('src\\components\\Button.tsx')).toBe(false);
  });

  it('normalizes mixed slashes', () => {
    const af: AffectedFiles = {
      create: [],
      modify: ['src/lib\\utils/helper.ts'],
      delete: [],
    };
    const result = getAllPaths(af);
    expect(result.has('src/lib/utils/helper.ts')).toBe(true);
  });

  it('returns empty set for empty arrays', () => {
    const af: AffectedFiles = { create: [], modify: [], delete: [] };
    expect(getAllPaths(af).size).toBe(0);
  });
});

// ============================================================================
// hasOverlap
// ============================================================================

describe('hasOverlap', () => {
  it('returns true when sets share an element', () => {
    const a = new Set(['src/a.ts', 'src/b.ts']);
    const b = new Set(['src/b.ts', 'src/c.ts']);
    expect(hasOverlap(a, b)).toBe(true);
  });

  it('returns false when sets are disjoint', () => {
    const a = new Set(['src/a.ts']);
    const b = new Set(['src/b.ts']);
    expect(hasOverlap(a, b)).toBe(false);
  });

  it('returns false when both sets are empty', () => {
    expect(hasOverlap(new Set(), new Set())).toBe(false);
  });

  it('returns false when one set is empty', () => {
    expect(hasOverlap(new Set(['a.ts']), new Set())).toBe(false);
  });
});

// ============================================================================
// getNextBatch
// ============================================================================

describe('getNextBatch', () => {
  it('returns empty array when no available slots', () => {
    const runningPaths = new Map<string, Set<string>>();
    runningPaths.set('spec-a', new Set(['src/a.ts']));
    runningPaths.set('spec-b', new Set(['src/b.ts']));

    const state: SchedulerState = {
      pending: [makeSpec('c', { modify: ['src/c.ts'] })],
      running: runningPaths,
      completed: new Set(),
      failed: new Set(),
    };

    // maxParallel = 2, already 2 running
    expect(getNextBatch(state, 2)).toEqual([]);
  });

  it('returns non-overlapping specs in a single batch', () => {
    const specA = makeSpec('a', { modify: ['src/a.ts'] });
    const specB = makeSpec('b', { modify: ['src/b.ts'] });
    const state = emptyState([specA, specB]);

    const batch = getNextBatch(state, 4);
    expect(batch).toHaveLength(2);
    expect(batch.map(s => s.id)).toContain('a');
    expect(batch.map(s => s.id)).toContain('b');
  });

  it('only returns first spec when two specs overlap', () => {
    const specA = makeSpec('a', { modify: ['src/shared.ts'] });
    const specB = makeSpec('b', { modify: ['src/shared.ts'] });
    const state = emptyState([specA, specB]);

    const batch = getNextBatch(state, 4);
    expect(batch).toHaveLength(1);
    expect(batch[0].id).toBe('a');
  });

  it('handles mix of overlapping and non-overlapping specs', () => {
    const specA = makeSpec('a', { modify: ['src/shared.ts'] });
    const specB = makeSpec('b', { modify: ['src/shared.ts', 'src/other.ts'] });
    const specC = makeSpec('c', { modify: ['src/unique.ts'] });
    const state = emptyState([specA, specB, specC]);

    const batch = getNextBatch(state, 4);
    expect(batch).toHaveLength(2);
    expect(batch.map(s => s.id)).toContain('a');
    expect(batch.map(s => s.id)).toContain('c');
  });

  it('respects maxParallel limit', () => {
    const specs = [
      makeSpec('a', { modify: ['src/a.ts'] }),
      makeSpec('b', { modify: ['src/b.ts'] }),
      makeSpec('c', { modify: ['src/c.ts'] }),
      makeSpec('d', { modify: ['src/d.ts'] }),
    ];
    const state = emptyState(specs);

    const batch = getNextBatch(state, 2);
    expect(batch).toHaveLength(2);
  });

  it('returns empty when all pending specs overlap with running tasks', () => {
    const runningPaths = new Map<string, Set<string>>();
    runningPaths.set('running-1', new Set(['src/shared.ts']));

    const state: SchedulerState = {
      pending: [
        makeSpec('a', { modify: ['src/shared.ts'] }),
        makeSpec('b', { create: ['src/shared.ts'] }),
      ],
      running: runningPaths,
      completed: new Set(),
      failed: new Set(),
    };

    expect(getNextBatch(state, 4)).toEqual([]);
  });

  it('returns empty array when pending list is empty', () => {
    const state = emptyState([]);
    expect(getNextBatch(state, 4)).toEqual([]);
  });
});
