/**
 * Cleanup route — kills the mixed old+new map race (Direction 2b) AND honors
 * canonical pins (migration 233): a pinned context (and its group) must survive a
 * full rebuild, never deleted by cleanup.
 *
 * Generation creates the new contexts (each schedules a debounced export); the
 * cleanup route must CANCEL that pending export before deleting old rows, then
 * schedule a single fresh export AFTER the deletes complete.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const scheduleSpy = vi.fn();
const cancelSpy = vi.fn();
vi.mock('@/lib/contexts/exportContextMap', () => ({
  scheduleContextMapExport: (id: string) => scheduleSpy(id),
  cancelContextMapExport: (id: string) => cancelSpy(id),
}));

vi.mock('@/lib/observability/middleware', () => ({
  withObservability: (h: unknown) => h,
}));

// Mutable per-test list of the project's CURRENT contexts (what the DB holds now).
type MockCtx = { id: string; projectId: string; pinned?: number; group_id?: string | null };
let currentContexts: MockCtx[] = [{ id: 'new1', projectId: 'p1' }];

const deleteContextSpy = vi.fn(() => true);
vi.mock('@/app/db/repositories/context.repository', () => ({
  contextRepository: {
    getContextsByProject: () => currentContexts,
    deleteContext: (id: string) => deleteContextSpy(id),
  },
}));
const deleteGroupSpy = vi.fn(() => true);
vi.mock('@/app/db/repositories/context-group.repository', () => ({
  contextGroupRepository: { deleteGroup: (id: string) => deleteGroupSpy(id) },
}));
vi.mock('@/app/db/repositories/context-group-relationship.repository', () => ({
  contextGroupRelationshipRepository: { delete: () => true },
}));

import { POST } from './route';

function req(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/context-generation/cleanup', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

describe('cleanup route export scheduling', () => {
  beforeEach(() => {
    scheduleSpy.mockClear();
    cancelSpy.mockClear();
    deleteContextSpy.mockClear();
    deleteGroupSpy.mockClear();
    currentContexts = [{ id: 'new1', projectId: 'p1' }];
  });

  it('cancels the pending export, deletes, then schedules a fresh export', async () => {
    const res = await (POST as (r: NextRequest) => Promise<Response>)(
      req({
        projectId: 'p1',
        previousDataIds: { contextIds: ['old1'], groupIds: [], relationshipIds: [] },
      })
    );
    expect(res.status).toBe(200);

    expect(cancelSpy).toHaveBeenCalledWith('p1');
    expect(scheduleSpy).toHaveBeenCalledWith('p1');
    expect(deleteContextSpy).toHaveBeenCalledWith('old1');

    // Ordering: cancel BEFORE delete BEFORE schedule (no mixed-map window).
    const cancelOrder = cancelSpy.mock.invocationCallOrder[0];
    const deleteOrder = deleteContextSpy.mock.invocationCallOrder[0];
    const scheduleOrder = scheduleSpy.mock.invocationCallOrder[0];
    expect(cancelOrder).toBeLessThan(deleteOrder);
    expect(deleteOrder).toBeLessThan(scheduleOrder);
  });
});

describe('cleanup route pin preservation (migration 233)', () => {
  beforeEach(() => {
    scheduleSpy.mockClear();
    cancelSpy.mockClear();
    deleteContextSpy.mockClear();
    deleteGroupSpy.mockClear();
  });

  it('never deletes a pinned context even when its id is in previousDataIds', async () => {
    // The DB currently holds a fresh 'new1' and a pinned 'pin1'. previousDataIds
    // (possibly captured before the pin) lists BOTH pin1 and old1.
    currentContexts = [
      { id: 'new1', projectId: 'p1' },
      { id: 'pin1', projectId: 'p1', pinned: 1 },
    ];

    const res = await (POST as (r: NextRequest) => Promise<Response>)(
      req({
        projectId: 'p1',
        previousDataIds: { contextIds: ['old1', 'pin1'], groupIds: [], relationshipIds: [] },
      })
    );
    const json = await res.json();
    expect(res.status).toBe(200);

    expect(deleteContextSpy).toHaveBeenCalledWith('old1');
    expect(deleteContextSpy).not.toHaveBeenCalledWith('pin1');
    expect(json.deleted.contexts).toBe(1);
  });

  it('preserves the group that still holds a pinned context', async () => {
    currentContexts = [
      { id: 'new1', projectId: 'p1' },
      { id: 'pin1', projectId: 'p1', pinned: 1, group_id: 'grpPinned' },
    ];

    const res = await (POST as (r: NextRequest) => Promise<Response>)(
      req({
        projectId: 'p1',
        previousDataIds: {
          contextIds: ['old1', 'pin1'],
          groupIds: ['grpOld', 'grpPinned'],
          relationshipIds: [],
        },
      })
    );
    expect(res.status).toBe(200);

    expect(deleteGroupSpy).toHaveBeenCalledWith('grpOld');
    expect(deleteGroupSpy).not.toHaveBeenCalledWith('grpPinned');
  });

  it('refuses cleanup when the only surviving context is a pinned pre-existing one', async () => {
    // Regeneration produced nothing new; the only context left is the pinned one,
    // which must NOT count as "new data landed" — otherwise we would wipe the map.
    currentContexts = [{ id: 'pin1', projectId: 'p1', pinned: 1 }];

    const res = await (POST as (r: NextRequest) => Promise<Response>)(
      req({
        projectId: 'p1',
        previousDataIds: { contextIds: ['old1', 'pin1'], groupIds: [], relationshipIds: [] },
      })
    );
    const json = await res.json();
    expect(res.status).toBe(409);
    expect(json.skipped).toBe(true);
    expect(deleteContextSpy).not.toHaveBeenCalled();
  });
});
