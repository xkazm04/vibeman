import type { ScanMiddleware, ScanContext, ScanConfig, ScanFinding, CodebaseFile } from '../types';

/**
 * Analysis function signature — matches the existing abstract analyze() method
 * so subclasses can pass their implementation directly.
 */
export type AnalyzeFn = (
  config: ScanConfig,
  files: CodebaseFile[]
) => Promise<ScanFinding[]>;

/**
 * Runs the analysis function and populates ctx.findings.
 * The actual analysis logic is injected as a function, keeping this
 * middleware generic across all strategy types.
 */
export class AnalyzeMiddleware implements ScanMiddleware {
  readonly name = 'analyze';

  constructor(private readonly analyzeFn: AnalyzeFn) {}

  async handle(ctx: ScanContext, next: () => Promise<void>): Promise<void> {
    ctx.findings = await this.analyzeFn(ctx.config, ctx.files);
    await next();
  }
}
