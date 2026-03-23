import type { ScanMiddleware, ScanContext } from '../types';

/**
 * Wraps another middleware and records its execution time in ctx.timings.
 * Usage: pipeline.use(TimingMiddleware.wrap(new GatherMiddleware()))
 */
export class TimingMiddleware implements ScanMiddleware {
  readonly name: string;

  private constructor(
    private readonly inner: ScanMiddleware
  ) {
    this.name = `timing:${inner.name}`;
  }

  /** Factory: wrap any middleware with timing tracking. */
  static wrap(mw: ScanMiddleware): TimingMiddleware {
    return new TimingMiddleware(mw);
  }

  async handle(ctx: ScanContext, next: () => Promise<void>): Promise<void> {
    const start = performance.now();
    await this.inner.handle(ctx, async () => {
      const elapsed = performance.now() - start;
      ctx.timings[this.inner.name] = elapsed;
      await next();
    });
  }
}
