/**
 * contexts route DELETE — re-exports the map on single + bulk delete (Direction 2a).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const scheduleSpy = vi.fn();
vi.mock('@/lib/contexts/exportContextMap', () => ({
  scheduleContextMapExport: (id: string) => scheduleSpy(id),
}));
vi.mock('@/lib/observability/middleware', () => ({ withObservability: (h: unknown) => h }));
vi.mock('@/lib/brain/signalCollector', () => ({ signalCollector: { recordContextFocus: vi.fn() } }));

const deleteAllSpy = vi.fn(async () => 3);
const getContextByIdSpy = vi.fn(async () => ({ id: 'c1', projectId: 'p1' }));
const deleteContextSpy = vi.fn(async () => true);
vi.mock('../../../lib/queries/contextQueries', () => ({
  contextQueries: {
    deleteAllContextsByProject: (id: string) => deleteAllSpy(id),
    getContextById: (id: string) => getContextByIdSpy(id),
    deleteContext: (id: string) => deleteContextSpy(id),
  },
  contextGroupQueries: {},
}));

import { DELETE } from './route';

const del = (qs: string) =>
  (DELETE as (r: NextRequest) => Promise<Response>)(
    new NextRequest(`http://localhost/api/contexts?${qs}`, { method: 'DELETE' })
  );

describe('contexts DELETE export scheduling', () => {
  beforeEach(() => {
    scheduleSpy.mockClear();
    getContextByIdSpy.mockClear();
  });

  it('schedules an export on delete-all (projectId)', async () => {
    const res = await del('projectId=p1');
    expect(res.status).toBe(200);
    expect(scheduleSpy).toHaveBeenCalledWith('p1');
  });

  it('schedules an export on single delete, resolving project before delete', async () => {
    const res = await del('contextId=c1');
    expect(res.status).toBe(200);
    expect(getContextByIdSpy).toHaveBeenCalledWith('c1');
    expect(scheduleSpy).toHaveBeenCalledWith('p1');
  });
});
