import type { ScanMiddleware, ScanContext } from '../types';

/**
 * Runs a user-provided validation function against the scan config.
 * Pass a custom validator or use the default (no-op).
 */
export class ValidateMiddleware implements ScanMiddleware {
  readonly name = 'validate';

  constructor(
    private readonly validator: (ctx: ScanContext) => void = () => {}
  ) {}

  async handle(ctx: ScanContext, next: () => Promise<void>): Promise<void> {
    this.validator(ctx);
    await next();
  }
}
