/**
 * buildContextMap — content-drift export (Direction 1) + revision stability.
 *
 * Verifies that (a) content drift surfaces in the exported map (per-context
 * `contentStale` flag + audit `contentStaleContexts` count) and (b) drift does
 * NOT participate in the `revision` hash — editing a tracked source file must
 * not churn the revision of an otherwise-identical structural map.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('child_process', () => ({
  // No git in the test sandbox — provenance resolves to nulls.
  execSync: vi.fn(() => {
    throw new Error('no git');
  }),
}));

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return { ...actual, existsSync: vi.fn(() => true), promises: actual.promises };
});

vi.mock('@/lib/project_database', () => ({
  projectDb: { getProject: vi.fn(() => ({ id: 'p1', name: 'Proj', path: '/fake/proj' })) },
}));

vi.mock('@/lib/queries/contextQueries', () => ({
  contextQueries: {
    getContextsByProject: vi.fn(async () => [
      {
        id: 'c1',
        name: 'Alpha',
        groupId: 'g1',
        groupName: 'G',
        filePaths: ['a.ts', 'b.ts'],
        category: 'lib',
        description: 'desc',
        businessFeature: null,
        target: null,
        apiRoutes: [],
        pinned: false,
        crossRefs: [],
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      },
    ]),
  },
  contextGroupQueries: {
    getGroupsByProject: vi.fn(async () => [
      { id: 'g1', name: 'G', domain: 'feature', color: '#fff', icon: null, type: null },
    ]),
  },
  contextGroupRelationshipQueries: { getByProject: vi.fn(async () => []) },
}));

const staleResolver = { fn: (_f: string) => false };
vi.mock('./fileHashes', () => ({
  getBaselineEntries: vi.fn(() => new Map()),
  buildStaleResolver: vi.fn(() => (f: string) => staleResolver.fn(f)),
}));

import { buildContextMap } from './exportContextMap';

describe('buildContextMap content-drift', () => {
  beforeEach(() => {
    staleResolver.fn = () => false;
  });

  it('flags no drift when nothing changed', async () => {
    const map = await buildContextMap('p1');
    expect(map).toBeTruthy();
    expect(map!.audit.contentStaleContexts).toBe(0);
    expect(map!.groups[0].contexts[0].contentStale).toBeUndefined();
  });

  it('surfaces per-context contentStale + audit count when a file drifted', async () => {
    staleResolver.fn = (f) => f === 'b.ts';
    const map = await buildContextMap('p1');
    expect(map!.audit.contentStaleContexts).toBe(1);
    expect(map!.groups[0].contexts[0].contentStale).toBe(true);
  });

  it('does NOT let drift change the revision (structural map is identical)', async () => {
    staleResolver.fn = () => false;
    const fresh = await buildContextMap('p1');

    staleResolver.fn = (f) => f === 'b.ts';
    const drifted = await buildContextMap('p1');

    // Same structural content ⇒ same revision, even though drift differs.
    expect(drifted!.revision).toBe(fresh!.revision);
    expect(fresh!.groups[0].contexts[0].contentStale).toBeUndefined();
    expect(drifted!.groups[0].contexts[0].contentStale).toBe(true);
  });
});
