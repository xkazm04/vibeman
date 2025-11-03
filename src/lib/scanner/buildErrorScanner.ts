import { ScanProgressCallbacks } from './types';

export interface BuildError {
  file: string;
  line?: number;
  column?: number;
  message: string;
  severity: 'error' | 'warning';
  type: 'typescript' | 'eslint' | 'webpack' | 'nextjs' | 'unknown';
  rule?: string;
}

export interface BuildScanResult {
  success: boolean;
  errors: BuildError[];
  warnings: BuildError[];
  totalErrors: number;
  totalWarnings: number;
  unparsedErrors: number;
  buildCommand: string;
  executionTime: number;
  rawOutput: string;
}

export interface BuildScanStats {
  totalErrors: number;
  totalWarnings: number;
  typescriptErrors: number;
  eslintErrors: number;
  webpackErrors: number;
  nextjsErrors: number;
  unknownErrors: number;
  unparsedErrors: number;
}

export interface BuildScanCallbacks extends ScanProgressCallbacks {
  onBuildStart?: (command: string) => void;
  onBuildComplete?: (result: BuildScanResult) => void;
  onBuildStatsUpdate?: (stats: BuildScanStats) => void;
}

/**
 * Logger utility for build error scanner
 */
const logger = {
  info: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[BuildScanner] ${message}`, ...args);
    }
  },
  error: (message: string, ...args: unknown[]) => {
    console.error(`[BuildScanner] ${message}`, ...args);
  }
};

export class BuildErrorScanner {
  private callbacks: BuildScanCallbacks;
  private isAborted: boolean = false;

  constructor(callbacks: BuildScanCallbacks) {
    this.callbacks = callbacks;
  }

  public abort(): void {
    logger.info('Build scan aborted by user');
    this.isAborted = true;
  }

  async performBuildScan(customCommand?: string, projectPath?: string): Promise<BuildScanResult | null> {
    try {
      this.isAborted = false;
      logger.info('Starting build error scan...');

      this.callbacks.onPhaseChange?.('calculating');
      this.callbacks.onProgress(10);

      const buildCommand = await this.resolveBuildCommand(customCommand, projectPath);

      if (this.isAborted) return null;

      logger.info(`Using build command: ${buildCommand}`);
      logger.info(`Project path: ${projectPath || 'current directory'}`);
      this.callbacks.onBuildStart?.(buildCommand);
      this.callbacks.onProgress(25);

      this.callbacks.onPhaseChange?.('scanning');
      this.callbacks.onCurrentFile('Running build command...');
      this.callbacks.onProgress(50);

      const result = await this.runBuildScan(buildCommand, projectPath);

      if (this.isAborted) return null;

      if (result) {
        this.processBuildResults(result);
      }

      return result;

    } catch (error) {
      if (!this.isAborted) {
        logger.error('Build scan error:', error);
        this.callbacks.onPhaseChange?.('complete');
      }
      return null;
    }
  }

  /**
   * Resolve build command (detect or use custom)
   */
  private async resolveBuildCommand(customCommand?: string, projectPath?: string): Promise<string> {
    if (customCommand) {
      return customCommand;
    }

    const response = await fetch('/api/file-fixer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'detect-build-command',
        projectPath
      })
    });

    if (!response.ok) {
      throw new Error('Failed to detect build command');
    }

    const commandResult = await response.json();
    return commandResult.buildCommand;
  }

  /**
   * Run build scan via API
   */
  private async runBuildScan(buildCommand: string, projectPath?: string): Promise<BuildScanResult | null> {
    const scanResponse = await fetch('/api/file-fixer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'run-build-scan',
        buildCommand,
        projectPath
      })
    });

    if (!scanResponse.ok) {
      throw new Error('Failed to run build scan');
    }

    return await scanResponse.json();
  }

  /**
   * Process and report build results
   */
  private processBuildResults(result: BuildScanResult): void {
    logger.info(`Build scan completed - ${result.totalErrors} errors, ${result.totalWarnings} warnings`);

    this.callbacks.onProgress(100);
    this.callbacks.onPhaseChange?.('complete');
    this.callbacks.onBuildComplete?.(result);

    const stats = this.calculateStats(result);
    this.callbacks.onBuildStatsUpdate?.(stats);
  }

  /**
   * Calculate statistics from build results
   */
  private calculateStats(result: BuildScanResult): BuildScanStats {
    const allIssues = [...result.errors, ...result.warnings];

    return {
      totalErrors: result.totalErrors,
      totalWarnings: result.totalWarnings,
      typescriptErrors: allIssues.filter(e => e.type === 'typescript').length,
      eslintErrors: allIssues.filter(e => e.type === 'eslint').length,
      webpackErrors: allIssues.filter(e => e.type === 'webpack').length,
      nextjsErrors: allIssues.filter(e => e.type === 'nextjs').length,
      unknownErrors: allIssues.filter(e => e.type === 'unknown').length,
      unparsedErrors: result.unparsedErrors
    };
  }
}
