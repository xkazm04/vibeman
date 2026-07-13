/**
 * context-groups route DELETE — re-exports the map on single + bulk delete (Direction 2a).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const scheduleSpy = vi.fn();
vi.mock('@/lib/contexts/exportContextMap', () => ({
  scheduleContextMapExport: (id: string) => scheduleSpy(id),
}));
vi.mock('@/lib/observability/middleware', () => ({ withObservability: (h: unknown) => h }));

const deleteAllByProjectSpy = vi.fn(async () => 2);
const getGroupByIdSpy = vi.fn(async () => ({ id: 'g1', projectId: 'p1' }));
const deleteGroupSpy = vi.fn(async () => true);
vi.mock('../../../lib/queries/contextQueries', () => ({
  contextGroupQueries: {
    deleteAllByProject: (id: string) => deleteAllByProjectSpy(id),
    getGroupById: (id: string) => getGroupByIdSpy(id),
    deleteGroup: (id: string) => deleteGroupSpy(id),
  },
}));

import { DELETE } from './route';

const del = (qs: string) =>
  (DELETE as (r: NextRequest) => Promise<Response>)(
    new NextRequest(`http://localhost/api/context-groups?${qs}`, { method: 'DELETE' })
  );

describe('context-groups DELETE export scheduling', () => {
  beforeEach(() => {
    scheduleSpy.mockClear();
    getGroupByIdSpy.mockClear();
  });

  it('schedules an export on bulk delete (projectId)', async () => {
    const res = await del('projectId=p1');
    expect(res.status).toBe(200);
    expect(scheduleSpy).toHaveBeenCalledWith('p1');
  });

  it('schedules an export on single group delete', async () => {
    const res = await del('groupId=g1');
    expect(res.status).toBe(200);
    expect(getGroupByIdSpy).toHaveBeenCalledWith('g1');
    expect(scheduleSpy).toHaveBeenCalledWith('p1');
  });
});
