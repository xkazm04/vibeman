import type { ScanMiddleware, ScanContext } from '../types';

/**
 * Persists the scan result to the repository if one is available.
 * No-ops gracefully when ctx.repository is undefined.
 */
export class PersistMiddleware implements ScanMiddleware {
  readonly name = 'persist';

  async handle(ctx: ScanContext, next: () => Promise<void>): Promise<void> {
    if (ctx.repository && ctx.result) {
      await ctx.repository.save(ctx.result);
    }
    await next();
  }
}
