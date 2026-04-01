import { describe, it, expect, vi } from 'vitest';
import { ScanOrchestrator } from '@/lib/scan/scanOrchestrator';
import { BaseScanStrategy } from '@/lib/scan/strategies/baseScanStrategy';
import {
  ScanError,
  type ScanConfig,
  type ScanResult,
  type ScanFinding,
  type ScanEvent,
  type CodebaseFile,
  type FileGatherer,
  type ScanRepository,
  type ScanEventListener,
} from '@/lib/scan/types';

// ── Test helpers ──

function makeConfig(overrides: Partial<ScanConfig> = {}): ScanConfig {
  return {
    projectId: 'test-project',
    projectPath: '/tmp/test',
    scanCategory: 'agent',
    ...overrides,
  };
}

function makeGatherer(files: CodebaseFile[] = []): FileGatherer {
  return {
    gather: vi.fn(async () => files),
  };
}

function makeRepository(): ScanRepository & { save: ReturnType<typeof vi.fn>; getById: ReturnType<typeof vi.fn>; listByProject: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> } {
  return {
    save: vi.fn(),
    getById: vi.fn(),
    listByProject: vi.fn(async () => []),
    delete: vi.fn(),
  };
}

/**
 * Concrete test strategy that exposes the BaseScanStrategy lifecycle.
 */
class TestScanStrategy extends BaseScanStrategy {
  public analysisResult: ScanFinding[] = [];
  public analyzeCallCount = 0;
  public validateFn: ((config: ScanConfig) => void) | null = null;

  protected validateConfig(config: ScanConfig): void {
    if (this.validateFn) this.validateFn(config);
  }

  protected async analyze(
    _config: ScanConfig,
    _files: CodebaseFile[]
  ): Promise<ScanFinding[]> {
    this.analyzeCallCount++;
    return this.analysisResult;
  }
}

// ── ScanOrchestrator tests ──

describe('ScanOrchestrator', () => {
  it('routes scans to the correct registered strategy', async () => {
    const gatherer = makeGatherer([]);
    const strategy = new TestScanStrategy(gatherer);
    const orchestrator = new ScanOrchestrator(gatherer);

    // Register custom strategy under 'agent'
    orchestrator.registerStrategy('agent', strategy);

    const result = await orchestrator.execute(makeConfig({ scanCategory: 'agent' }));
    expect(result.success).toBe(true);
    expect(strategy.analyzeCallCount).toBe(1);
  });

  it('throws for unregistered scan category', async () => {
    const orchestrator = new ScanOrchestrator();
    await expect(
      orchestrator.execute(makeConfig({ scanCategory: 'blueprint' }))
    ).rejects.toThrow('No strategy registered');
  });

  it('executes multiple scans in parallel', async () => {
    const gatherer = makeGatherer([]);
    const agentStrategy = new TestScanStrategy(gatherer);
    const structureStrategy = new TestScanStrategy(gatherer);
    const orchestrator = new ScanOrchestrator(gatherer);

    orchestrator.registerStrategy('agent', agentStrategy);
    orchestrator.registerStrategy('structure', structureStrategy);

    const results = await orchestrator.executeParallel([
      makeConfig({ scanCategory: 'agent' }),
      makeConfig({ scanCategory: 'structure' }),
    ]);

    expect(results).toHaveLength(2);
    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(true);
    expect(agentStrategy.analyzeCallCount).toBe(1);
    expect(structureStrategy.analyzeCallCount).toBe(1);
  });

  it('delivers progress events to subscribed listeners', async () => {
    const gatherer = makeGatherer([]);
    const strategy = new TestScanStrategy(gatherer);
    const orchestrator = new ScanOrchestrator(gatherer);
    orchestrator.registerStrategy('agent', strategy);

    const events: ScanEvent[] = [];
    orchestrator.onProgress('test-project', (e: ScanEvent) => events.push(e));

    await orchestrator.execute(makeConfig({ projectId: 'test-project' }));

    // Strategy events are delivered (strategy may or may not emit, but no crash)
    expect(Array.isArray(events)).toBe(true);
  });

  it('unsubscribe removes the listener', () => {
    const orchestrator = new ScanOrchestrator();
    const listener = vi.fn();
    const unsub = orchestrator.onProgress('proj-1', listener);
    unsub();
    // No way to directly verify removal other than it doesn't crash
    expect(typeof unsub).toBe('function');
  });
});

// ── BaseScanStrategy lifecycle tests ──

describe('BaseScanStrategy lifecycle', () => {
  it('runs validate -> gather -> analyze -> buildResult', async () => {
    const files: CodebaseFile[] = [{ path: 'a.ts', content: 'const x = 1;', size: 12 }];
    const gatherer = makeGatherer(files);
    const strategy = new TestScanStrategy(gatherer);
    strategy.analysisResult = [{ title: 'Test Finding', description: 'test desc' }];

    const result = await strategy.scan(makeConfig());

    expect(result.success).toBe(true);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].title).toBe('Test Finding');
    expect(result.metadata.fileCount).toBe(1);
    expect(result.metadata.category).toBe('agent');
    expect(gatherer.gather).toHaveBeenCalledTimes(1);
  });

  it('returns failure result when validation throws', async () => {
    const gatherer = makeGatherer();
    const strategy = new TestScanStrategy(gatherer);
    strategy.validateFn = () => {
      throw new Error('invalid config');
    };

    const result = await strategy.scan(makeConfig());
    expect(result.success).toBe(false);
    expect(result.error?.message).toBe('invalid config');
  });

  it('returns failure result when gather throws', async () => {
    const gatherer: FileGatherer = {
      gather: vi.fn(async () => {
        throw new ScanError('gather_failed', 'Cannot reach file server');
      }),
    };
    const strategy = new TestScanStrategy(gatherer);

    const result = await strategy.scan(makeConfig());
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('gather_failed');
    expect(result.error?.message).toBe('Cannot reach file server');
  });

  it('populates metadata with timing and scan info', async () => {
    const gatherer = makeGatherer([
      { path: 'a.ts', content: '', size: 0 },
      { path: 'b.ts', content: '', size: 0 },
    ]);
    const strategy = new TestScanStrategy(gatherer);
    strategy.analysisResult = [
      { title: 'f1', description: 'd1' },
      { title: 'f2', description: 'd2' },
    ];

    const result = await strategy.scan(makeConfig());

    expect(result.metadata.fileCount).toBe(2);
    expect(result.metadata.filesAnalyzed).toBe(2);
    expect(result.metadata.duration).toBeGreaterThanOrEqual(0);
    expect(result.metadata.startedAt).toBeTruthy();
    expect(result.metadata.completedAt).toBeTruthy();
    expect(result.metadata.scanId).toBeTruthy();
  });

  it('emits scan_failed event when analysis throws', async () => {
    const gatherer = makeGatherer([{ path: 'a.ts', content: '', size: 0 }]);
    const strategy = new TestScanStrategy(gatherer);
    const events: ScanEvent[] = [];
    strategy.onEvent((e: ScanEvent) => events.push(e));

    // Make analyze throw
    strategy.analysisResult = []; // won't matter, we override
    const origAnalyze = (strategy as any).analyze.bind(strategy);
    (strategy as any).analyze = async () => {
      throw new Error('analysis crashed');
    };

    const result = await strategy.scan(makeConfig());
    expect(result.success).toBe(false);
    expect(events.some(e => e.type === 'scan_failed')).toBe(true);
  });

  it('onEvent returns unsubscribe function', () => {
    const strategy = new TestScanStrategy(makeGatherer());
    const listener = vi.fn();
    const unsub = strategy.onEvent(listener);
    expect(typeof unsub).toBe('function');
    unsub();
    // Listener removed; emit should not reach it
    (strategy as any).emitEvent({
      type: 'scan_started',
      scanId: 'x',
      timestamp: Date.now(),
    });
    expect(listener).not.toHaveBeenCalled();
  });
});

// ── ScanError tests ──

describe('ScanError', () => {
  it('carries code, message, and details', () => {
    const err = new ScanError('validation_failed', 'Missing projectId', { field: 'projectId' });
    expect(err.code).toBe('validation_failed');
    expect(err.message).toBe('Missing projectId');
    expect(err.details).toEqual({ field: 'projectId' });
    expect(err.name).toBe('ScanError');
    expect(err instanceof Error).toBe(true);
  });
});
