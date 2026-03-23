import type { ScanMiddleware, ScanContext, FileGatherer } from '../types';
import { ScanError } from '../types';
import { getDefaultFileGatherer } from '../fileGatherer';

export interface GatherOptions {
  extensions?: string[];
  exclude?: string[];
  maxFileSize?: number;
}

/**
 * Gathers codebase files and populates ctx.files.
 * Accepts a FileGatherer instance and filter options.
 */
export class GatherMiddleware implements ScanMiddleware {
  readonly name = 'gather';

  constructor(
    private readonly fileGatherer: FileGatherer = getDefaultFileGatherer(),
    private readonly options: GatherOptions = {}
  ) {}

  async handle(ctx: ScanContext, next: () => Promise<void>): Promise<void> {
    try {
      ctx.files = await this.fileGatherer.gather(ctx.config, {
        extensions: this.options.extensions ?? ['.ts', '.tsx', '.js', '.jsx', '.py', '.md'],
        exclude: this.options.exclude ?? [
          'node_modules/**', '.git/**', 'dist/**',
          'build/**', '.next/**', '__pycache__/**', '.venv/**',
        ],
        maxFileSize: this.options.maxFileSize ?? 1024 * 1024,
      });
    } catch (error) {
      throw new ScanError(
        'file_gathering_failed',
        `Failed to gather files: ${error instanceof Error ? error.message : String(error)}`,
        { originalError: error }
      );
    }

    await next();
  }
}
