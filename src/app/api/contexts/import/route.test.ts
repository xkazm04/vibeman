/**
 * contexts import route — schedules the re-export after reconciliation (Direction 2a).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const scheduleSpy = vi.fn();
vi.mock('@/lib/contexts/exportContextMap', () => ({
  scheduleContextMapExport: (id: string) => scheduleSpy(id),
}));
vi.mock('@/lib/observability/middleware', () => ({ withObservability: (h: unknown) => h }));
vi.mock('@/lib/project_database', () => ({
  projectDb: { getProject: () => ({ id: 'p1', name: 'P', path: '/fake/proj' }) },
}));
vi.mock('@/lib/queries/contextQueries', () => ({
  contextQueries: { getContextByName: vi.fn(), createContext: vi.fn(), updateContext: vi.fn() },
  contextGroupQueries: { getGroupsByProject: vi.fn(async () => []) },
}));
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    promises: {
      ...actual.promises,
      // An empty but valid committed map — nothing to upsert.
      readFile: vi.fn(async () => JSON.stringify({ groups: [], ungrouped: [] })),
    },
  };
});

import { POST } from './route';

describe('contexts import export scheduling', () => {
  beforeEach(() => scheduleSpy.mockClear());

  it('schedules an export after a successful import', async () => {
    const res = await (POST as (r: NextRequest) => Promise<Response>)(
      new NextRequest('http://localhost/api/contexts/import', {
        method: 'POST',
        body: JSON.stringify({ projectId: 'p1' }),
        headers: { 'content-type': 'application/json' },
      })
    );
    expect(res.status).toBe(200);
    expect(scheduleSpy).toHaveBeenCalledWith('p1');
  });
});
