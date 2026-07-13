import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DetectionExecutor } from './detectionExecutor';
import { ScanningExecutor } from './scanningExecutor';
import { ResolvingExecutor } from './resolvingExecutor';
import { lifecycleUrl } from './lifecycleApi';
import type { PhaseContext, LifecycleConfig, LifecycleCycle } from '../lifecycleTypes';
import { DEFAULT_LIFECYCLE_CONFIG } from '../lifecycleTypes';

/**
 * Direction 1 — the autonomous lifecycle pipeline must actually call its APIs.
 *
 * Executors run SERVER-SIDE (imported by /api/lifecycle/route.ts). Node's fetch
 * throws on relative URLs, so the old `fetch('/api/...')` calls silently no-op'd
 * the whole pipeline. These tests assert every executor now builds an ABSOLUTE
 * URL and that a failing resolve surfaces (never silently passes).
 */

function makeCtx(overrides: Partial<LifecycleConfig> = {}): {
  ctx: PhaseContext;
  events: Array<{ type: string; message: string }>;
  cycle: LifecycleCycle;
} {
  const config: LifecycleConfig = {
    ...DEFAULT_LIFECYCLE_CONFIG,
    id: 'cfg_1',
    project_id: 'proj_1',
    created_at: 'now',
    updated_at: 'now',
    ...overrides,
  };
  const cycle = {
    id: 'cycle_1',
    project_id: 'proj_1',
    trigger: 'manual',
    trigger_metadata: {},
    scans_completed: 0,
    scans_total: 0,
    ideas_generated: 0,
    ideas_resolved: 0,
  } as unknown as LifecycleCycle;

  const events: Array<{ type: string; message: string }> = [];
  const ctx: PhaseContext = {
    config,
    cycle,
    isRunning: () => true,
    updatePhase: () => {},
    updateProgress: () => {},
    logEvent: (type, _phase, message) => { events.push({ type, message }); },
  };
  return { ctx, events, cycle };
}

const okJson = (body: unknown) =>
  ({ ok: true, status: 200, json: async () => body }) as unknown as Response;
const errJson = (status: number, body: unknown) =>
  ({ ok: false, status, json: async () => body }) as unknown as Response;

describe('lifecycleUrl', () => {
  it('produces an absolute URL from a root-relative path', () => {
    const url = lifecycleUrl('/api/lifecycle/scan');
    expect(url).toMatch(/^https?:\/\//);
    expect(url.endsWith('/api/lifecycle/scan')).toBe(true);
  });
});

describe('lifecycle executors build absolute URLs', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('DetectionExecutor fetches an absolute /api/lifecycle/detect URL', async () => {
    fetchMock.mockResolvedValue(okJson({ has_changes: false, files_changed: [], insertions: 0, deletions: 0, untracked_files: [], current_branch: 'main' }));
    const { ctx } = makeCtx();
    await new DetectionExecutor().execute(ctx);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toMatch(/^https?:\/\//);
    expect(calledUrl).toContain('/api/lifecycle/detect');
  });

  it('ScanningExecutor fetches an absolute /api/lifecycle/scan URL per scan type', async () => {
    fetchMock.mockResolvedValue(okJson({ ideaCount: 2 }));
    const { ctx } = makeCtx({ scan_types: ['bug_hunter'] });
    await new ScanningExecutor().execute(ctx);

    expect(fetchMock).toHaveBeenCalled();
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toMatch(/^https?:\/\//);
    expect(calledUrl).toContain('/api/lifecycle/scan');
  });

  it('ResolvingExecutor fetches absolute ideas + resolve URLs', async () => {
    fetchMock
      .mockResolvedValueOnce(okJson({ ideas: [{ id: 'idea_1', title: 'Fix X' }] }))
      .mockResolvedValueOnce(okJson({ success: true }));
    const { ctx, cycle } = makeCtx({ auto_resolve: true, max_auto_implementations: 5 });
    await new ResolvingExecutor().execute(ctx);

    for (const call of fetchMock.mock.calls) {
      expect(call[0] as string).toMatch(/^https?:\/\//);
    }
    expect((fetchMock.mock.calls[0][0] as string)).toContain('/api/ideas');
    expect((fetchMock.mock.calls[1][0] as string)).toContain('/api/lifecycle/resolve');
    expect(cycle.ideas_resolved).toBe(1);
  });
});

describe('ResolvingExecutor surfaces failures (never silently pass)', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('a failing resolve with fail_fast fails the whole cycle', async () => {
    fetchMock
      .mockResolvedValueOnce(okJson({ ideas: [{ id: 'idea_1', title: 'Fix X' }] }))
      .mockResolvedValueOnce(errJson(500, { error: 'resolve blew up' }));
    const { ctx } = makeCtx({ auto_resolve: true, fail_fast: true, max_auto_implementations: 5 });

    await expect(new ResolvingExecutor().execute(ctx)).rejects.toThrow(/resolve blew up/);
  });

  it('a failing resolve without fail_fast logs an error and does NOT count as resolved', async () => {
    fetchMock
      .mockResolvedValueOnce(okJson({ ideas: [{ id: 'idea_1', title: 'Fix X' }] }))
      .mockResolvedValueOnce(errJson(500, { error: 'boom' }));
    const { ctx, cycle, events } = makeCtx({ auto_resolve: true, fail_fast: false, max_auto_implementations: 5 });

    await new ResolvingExecutor().execute(ctx);

    expect(cycle.ideas_resolved).toBe(0);
    expect(events.some(e => e.type === 'error' && /boom/.test(e.message))).toBe(true);
  });
});
