/**
 * Cleanup route — kills the mixed old+new map race (Direction 2b).
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

const deleteContextSpy = vi.fn(() => true);
vi.mock('@/app/db/repositories/context.repository', () => ({
  contextRepository: {
    // A newly-generated context (id not in previousDataIds) so the guard passes.
    getContextsByProject: () => [{ id: 'new1', projectId: 'p1' }],
    deleteContext: (id: string) => deleteContextSpy(id),
  },
}));
vi.mock('@/app/db/repositories/context-group.repository', () => ({
  contextGroupRepository: { deleteGroup: () => true },
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
