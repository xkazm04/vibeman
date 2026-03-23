import { describe, it, expect, vi } from 'vitest';
import { ScanPipeline } from '@/lib/scan/ScanPipeline';
import type { ScanMiddleware, ScanContext, ScanEvent } from '@/lib/scan/types';
import {
  ValidateMiddleware,
  GatherMiddleware,
  AnalyzeMiddleware,
  BuildResultMiddleware,
  PersistMiddleware,
  EventMiddleware,
  TimingMiddleware,
} from '@/lib/scan/middleware';

function makeContext(overrides: Partial<ScanContext> = {}): ScanContext {
  return {
    config: {
      projectId: 'test-project',
      projectPath: '/tmp/test',
      scanCategory: 'agent',
    },
    scanId: 'test-scan-id',
    startTime: Date.now(),
    files: [],
    findings: [],
    emitEvent: vi.fn(),
    timings: {},
    extras: {},
    ...overrides,
  };
}

function makeMw(name: string, fn?: (ctx: ScanContext) => void): ScanMiddleware {
  return {
    name,
    async handle(ctx, next) {
      fn?.(ctx);
      await next();
    },
  };
}

describe('ScanPipeline', () => {
  it('executes middleware in order', async () => {
    const order: string[] = [];
    const pipeline = new ScanPipeline()
      .use(makeMw('a', () => order.push('a')))
      .use(makeMw('b', () => order.push('b')))
      .use(makeMw('c', () => order.push('c')));

    await pipeline.execute(makeContext());
    expect(order).toEqual(['a', 'b', 'c']);
  });

  it('short-circuits when next() is not called', async () => {
    const order: string[] = [];
    const stopper: ScanMiddleware = {
      name: 'stopper',
      async handle(_ctx, _next) {
        order.push('stop');
        // intentionally not calling next()
      },
    };

    const pipeline = new ScanPipeline()
      .use(makeMw('a', () => order.push('a')))
      .use(stopper)
      .use(makeMw('c', () => order.push('c')));

    await pipeline.execute(makeContext());
    expect(order).toEqual(['a', 'stop']);
  });

  it('insertBefore places middleware correctly', async () => {
    const order: string[] = [];
    const pipeline = new ScanPipeline()
      .use(makeMw('a', () => order.push('a')))
      .use(makeMw('c', () => order.push('c')))
      .insertBefore('c', makeMw('b', () => order.push('b')));

    await pipeline.execute(makeContext());
    expect(order).toEqual(['a', 'b', 'c']);
  });

  it('insertAfter places middleware correctly', async () => {
    const order: string[] = [];
    const pipeline = new ScanPipeline()
      .use(makeMw('a', () => order.push('a')))
      .use(makeMw('c', () => order.push('c')))
      .insertAfter('a', makeMw('b', () => order.push('b')));

    await pipeline.execute(makeContext());
    expect(order).toEqual(['a', 'b', 'c']);
  });

  it('remove eliminates middleware by name', async () => {
    const order: string[] = [];
    const pipeline = new ScanPipeline()
      .use(makeMw('a', () => order.push('a')))
      .use(makeMw('b', () => order.push('b')))
      .use(makeMw('c', () => order.push('c')));

    pipeline.remove('b');
    await pipeline.execute(makeContext());
    expect(order).toEqual(['a', 'c']);
  });

  it('getNames returns ordered middleware names', () => {
    const pipeline = new ScanPipeline()
      .use(makeMw('x'))
      .use(makeMw('y'))
      .use(makeMw('z'));

    expect(pipeline.getNames()).toEqual(['x', 'y', 'z']);
  });
});

describe('ValidateMiddleware', () => {
  it('calls the validator function', async () => {
    const validator = vi.fn();
    const mw = new ValidateMiddleware(validator);
    const ctx = makeContext();

    await mw.handle(ctx, vi.fn());
    expect(validator).toHaveBeenCalledWith(ctx);
  });

  it('throws when validator throws', async () => {
    const mw = new ValidateMiddleware(() => {
      throw new Error('invalid config');
    });

    await expect(mw.handle(makeContext(), vi.fn())).rejects.toThrow('invalid config');
  });
});

describe('AnalyzeMiddleware', () => {
  it('populates ctx.findings from analyzeFn', async () => {
    const findings = [{ title: 'test', description: 'desc' }];
    const mw = new AnalyzeMiddleware(async () => findings);
    const ctx = makeContext();

    await mw.handle(ctx, vi.fn());
    expect(ctx.findings).toEqual(findings);
  });
});

describe('BuildResultMiddleware', () => {
  it('populates ctx.result', async () => {
    const mw = new BuildResultMiddleware();
    const ctx = makeContext({
      files: [{ path: 'a.ts', content: '', size: 0 }],
      findings: [{ title: 'f', description: 'd' }],
    });

    await mw.handle(ctx, vi.fn());
    expect(ctx.result).toBeDefined();
    expect(ctx.result!.success).toBe(true);
    expect(ctx.result!.findings).toHaveLength(1);
    expect(ctx.result!.metadata.fileCount).toBe(1);
  });
});

describe('PersistMiddleware', () => {
  it('calls repository.save when result and repository exist', async () => {
    const save = vi.fn();
    const result = { success: true, scanId: 'x', category: 'agent' as const, findings: [], metadata: {} as any };
    const mw = new PersistMiddleware();
    const ctx = makeContext({ repository: { save, getById: vi.fn(), listByProject: vi.fn(), delete: vi.fn() }, result });

    await mw.handle(ctx, vi.fn());
    expect(save).toHaveBeenCalledWith(result);
  });

  it('no-ops when repository is absent', async () => {
    const mw = new PersistMiddleware();
    const ctx = makeContext({ result: { success: true, scanId: 'x', category: 'agent' as const, findings: [], metadata: {} as any } });

    // Should not throw
    await mw.handle(ctx, vi.fn());
  });
});

describe('EventMiddleware', () => {
  it('emits scan_started and scan_completed events', async () => {
    const mw = new EventMiddleware();
    const events: ScanEvent[] = [];
    const ctx = makeContext({
      files: [{ path: 'a.ts', content: '', size: 0 }],
      findings: [{ title: 'f', description: 'd' }],
      result: { success: true, scanId: 'x', category: 'agent' as const, findings: [], metadata: {} as any },
      emitEvent: (e: ScanEvent) => events.push(e),
    });

    await mw.handle(ctx, vi.fn());
    expect(events.map(e => e.type)).toContain('scan_started');
    expect(events.map(e => e.type)).toContain('scan_completed');
  });
});

describe('TimingMiddleware', () => {
  it('records execution time in ctx.timings', async () => {
    const inner: ScanMiddleware = {
      name: 'slow',
      async handle(_ctx, next) {
        await new Promise(r => setTimeout(r, 10));
        await next();
      },
    };

    const mw = TimingMiddleware.wrap(inner);
    const ctx = makeContext();

    await mw.handle(ctx, vi.fn());
    expect(ctx.timings['slow']).toBeGreaterThan(0);
  });
});
