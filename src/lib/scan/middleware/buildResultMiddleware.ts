import type { ScanMiddleware, ScanContext, ScanResult, ScanMetadata } from '../types';

/**
 * Builds the final ScanResult from the accumulated context.
 * Populates ctx.result so downstream middleware (persist, events) can use it.
 */
export class BuildResultMiddleware implements ScanMiddleware {
  readonly name = 'buildResult';

  async handle(ctx: ScanContext, next: () => Promise<void>): Promise<void> {
    const metadata: ScanMetadata = {
      scanId: ctx.scanId,
      category: ctx.config.scanCategory,
      startedAt: new Date(ctx.startTime).toISOString(),
      completedAt: new Date().toISOString(),
      duration: Date.now() - ctx.startTime,
      fileCount: ctx.files.length,
      filesAnalyzed: ctx.files.length,
      provider: ctx.config.provider,
      agentType: ctx.config.scanType,
    };

    ctx.result = {
      success: true,
      scanId: ctx.scanId,
      category: ctx.config.scanCategory,
      findings: ctx.findings,
      metadata,
    };

    await next();
  }
}
