/**
 * relationships route — re-exports the map on create + delete (Direction 2a).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const scheduleSpy = vi.fn();
vi.mock('@/lib/contexts/exportContextMap', () => ({
  scheduleContextMapExport: (id: string) => scheduleSpy(id),
}));
vi.mock('@/lib/observability/middleware', () => ({ withObservability: (h: unknown) => h }));

const existsSpy = vi.fn(async () => false);
const createSpy = vi.fn(async () => ({ id: 'r1', projectId: 'p1' }));
const getByIdSpy = vi.fn(async () => ({ id: 'r1', projectId: 'p1' }));
const deleteSpy = vi.fn(async () => true);
vi.mock('@/lib/queries/contextQueries', () => ({
  contextGroupRelationshipQueries: {
    exists: (a: string, b: string) => existsSpy(a, b),
    create: (d: unknown) => createSpy(d),
    getById: (id: string) => getByIdSpy(id),
    delete: (id: string) => deleteSpy(id),
  },
}));

import { POST, DELETE } from './route';

describe('relationships export scheduling', () => {
  beforeEach(() => {
    scheduleSpy.mockClear();
    getByIdSpy.mockClear();
  });

  it('schedules an export on create', async () => {
    const res = await (POST as (r: NextRequest) => Promise<Response>)(
      new NextRequest('http://localhost/api/context-group-relationships', {
        method: 'POST',
        body: JSON.stringify({ projectId: 'p1', sourceGroupId: 'g1', targetGroupId: 'g2' }),
        headers: { 'content-type': 'application/json' },
      })
    );
    expect(res.status).toBe(200);
    expect(scheduleSpy).toHaveBeenCalledWith('p1');
  });

  it('schedules an export on delete, resolving project before delete', async () => {
    const res = await (DELETE as (r: NextRequest) => Promise<Response>)(
      new NextRequest('http://localhost/api/context-group-relationships?relationshipId=r1', {
        method: 'DELETE',
      })
    );
    expect(res.status).toBe(200);
    expect(getByIdSpy).toHaveBeenCalledWith('r1');
    expect(scheduleSpy).toHaveBeenCalledWith('p1');
  });
});
