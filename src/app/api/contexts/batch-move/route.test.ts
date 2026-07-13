/**
 * batch-move route — the primary drag gesture re-exports the map (Direction 2a).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const scheduleSpy = vi.fn();
vi.mock('@/lib/contexts/exportContextMap', () => ({
  scheduleContextMapExport: (id: string) => scheduleSpy(id),
}));
vi.mock('@/lib/observability/middleware', () => ({ withObservability: (h: unknown) => h }));

const batchMoveSpy = vi.fn(async () => [{ id: 'c1', projectId: 'p1', groupId: 'g2' }]);
vi.mock('../../../../lib/queries/contextQueries', () => ({
  contextQueries: { batchMoveContexts: (m: unknown) => batchMoveSpy(m) },
}));

import { POST } from './route';

function req(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/contexts/batch-move', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

describe('batch-move export scheduling', () => {
  beforeEach(() => scheduleSpy.mockClear());

  it('schedules an export for the moved project', async () => {
    const res = await (POST as (r: NextRequest) => Promise<Response>)(
      req({ moves: [{ contextId: 'c1', newGroupId: 'g2' }] })
    );
    expect(res.status).toBe(200);
    expect(scheduleSpy).toHaveBeenCalledWith('p1');
  });
});
