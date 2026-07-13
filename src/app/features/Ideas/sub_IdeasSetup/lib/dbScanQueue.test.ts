import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildScanQueueRequests,
  summarizeQueueProgress,
  enqueueDbScans,
  pollScanQueueUntilDone,
} from './dbScanQueue';

/**
 * Direction 2 — the primary Ideas scan must route through the DB-idea path
 * (scan queue → worker → generateIdeas → ideas rows) so results appear as cards.
 * These tests cover the glue: request expansion, progress summarisation, the
 * enqueue call shape (incl. nudging the worker), and terminal-state polling.
 */

describe('buildScanQueueRequests', () => {
  it('creates one request per scanType when no contexts are selected', () => {
    const reqs = buildScanQueueRequests(['bug_hunter', 'perf_optimizer'] as never, []);
    expect(reqs).toEqual([
      { scanType: 'bug_hunter', contextId: undefined },
      { scanType: 'perf_optimizer', contextId: undefined },
    ]);
  });

  it('creates a scanType × context matrix when contexts are selected', () => {
    const reqs = buildScanQueueRequests(['bug_hunter'] as never, ['ctx_a', 'ctx_b']);
    expect(reqs).toEqual([
      { scanType: 'bug_hunter', contextId: 'ctx_a' },
      { scanType: 'bug_hunter', contextId: 'ctx_b' },
    ]);
  });
});

describe('summarizeQueueProgress', () => {
  const ids = ['q1', 'q2', 'q3'];
  it('counts terminal items as done and failed as errors, surfaces a running label', () => {
    const items = [
      { id: 'q1', status: 'completed', scan_type: 'bug_hunter' },
      { id: 'q2', status: 'failed', scan_type: 'perf_optimizer' },
      { id: 'q3', status: 'running', scan_type: 'security_protector' },
    ];
    const { done, errors, runningLabel } = summarizeQueueProgress(items, ids);
    expect(done).toBe(2);
    expect(errors).toBe(1);
    expect(runningLabel).toBe('security_protector');
  });

  it('ignores queue items not in the enqueued set', () => {
    const items = [{ id: 'other', status: 'completed' }];
    expect(summarizeQueueProgress(items, ids)).toEqual({ done: 0, errors: 0, runningLabel: '' });
  });
});

describe('enqueueDbScans', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('nudges the worker then POSTs one queue item per request', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === '/api/scan-queue/worker') {
        return Promise.resolve({ ok: true, json: async () => ({ success: true }) } as unknown as Response);
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ queueItem: { id: `q_${fetchMock.mock.calls.length}` } }),
      } as unknown as Response);
    });

    const ids = await enqueueDbScans({
      projectId: 'proj_1',
      requests: [
        { scanType: 'bug_hunter' as never },
        { scanType: 'perf_optimizer' as never, contextId: 'ctx_a' },
      ],
    });

    // First call starts the worker; next two enqueue.
    expect(fetchMock.mock.calls[0][0]).toBe('/api/scan-queue/worker');
    const enqueueCalls = fetchMock.mock.calls.filter(c => c[0] === '/api/scan-queue');
    expect(enqueueCalls).toHaveLength(2);
    expect(ids).toHaveLength(2);

    const firstBody = JSON.parse(enqueueCalls[0][1].body);
    expect(firstBody).toMatchObject({ projectId: 'proj_1', scanType: 'bug_hunter', triggerType: 'manual' });
  });

  it('throws when the enqueue endpoint rejects', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === '/api/scan-queue/worker') {
        return Promise.resolve({ ok: true, json: async () => ({}) } as unknown as Response);
      }
      return Promise.resolve({ ok: false, status: 400, json: async () => ({ error: 'bad type' }) } as unknown as Response);
    });

    await expect(
      enqueueDbScans({ projectId: 'proj_1', requests: [{ scanType: 'bug_hunter' as never }] })
    ).rejects.toThrow(/bad type/);
  });
});

describe('pollScanQueueUntilDone', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('polls until all enqueued items are terminal and reports final errors', async () => {
    // First poll: one running. Second poll: both terminal (one failed).
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ queueItems: [
        { id: 'q1', status: 'completed', scan_type: 'bug_hunter' },
        { id: 'q2', status: 'running', scan_type: 'perf_optimizer' },
      ] }) } as unknown as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ queueItems: [
        { id: 'q1', status: 'completed' },
        { id: 'q2', status: 'failed' },
      ] }) } as unknown as Response);

    const progress: number[] = [];
    const result = await pollScanQueueUntilDone({
      projectId: 'proj_1',
      enqueuedIds: ['q1', 'q2'],
      intervalMs: 0,
      onProgress: (p) => progress.push(p.done),
      now: () => 0,
    });

    expect(result).toEqual({ errors: 1, completed: true });
    // initial 0 tick, then 1 (first poll), then 2 (second poll).
    expect(progress[progress.length - 1]).toBe(2);
  });

  it('stops early when the signal aborts', async () => {
    const controller = new AbortController();
    controller.abort();
    const result = await pollScanQueueUntilDone({
      projectId: 'proj_1',
      enqueuedIds: ['q1'],
      intervalMs: 0,
      signal: controller.signal,
      onProgress: () => {},
    });
    expect(result.completed).toBe(false);
  });
});
