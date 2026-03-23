import type { ScanMiddleware, ScanContext } from '../types';

/**
 * Emits scan_started before the chain and scan_completed / scan_failed after.
 * Also emits files_gathered once ctx.files is populated (after gather middleware).
 */
export class EventMiddleware implements ScanMiddleware {
  readonly name = 'events';

  async handle(ctx: ScanContext, next: () => Promise<void>): Promise<void> {
    ctx.emitEvent({
      type: 'scan_started',
      scanId: ctx.scanId,
      timestamp: Date.now(),
    });

    await next();

    // After the full chain completes, emit files_gathered + completed
    if (ctx.files.length > 0) {
      ctx.emitEvent({
        type: 'files_gathered',
        scanId: ctx.scanId,
        timestamp: Date.now(),
        progress: { current: 1, total: 3, message: `Gathered ${ctx.files.length} files` },
      });
    }

    if (ctx.result) {
      ctx.emitEvent({
        type: 'scan_completed',
        scanId: ctx.scanId,
        timestamp: Date.now(),
        progress: {
          current: 3,
          total: 3,
          message: `Found ${ctx.findings.length} findings`,
        },
      });
    }
  }
}
