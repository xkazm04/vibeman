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

export class BuildErrorScanner {
  private callbacks: BuildScanCallbacks;
  private isAborted: boolean = false;

  constructor(callbacks: BuildScanCallbacks) {
    this.callbacks = callbacks;
  }

  public abort(): void {
    console.log('Client: Build scan aborted by user');
    this.isAborted = true;
  }

  async performBuildScan(customCommand?: string, projectPath?: string): Promise<BuildScanResult | null> {
    try {
      this.isAborted = false;
      console.log('Starting build error scan from client...');

      // Phase 1: Detecting build command
      this.callbacks.onPhaseChange?.('calculating');
      this.callbacks.onProgress(10);

      let buildCommand = customCommand;
      if (!buildCommand) {
        const commandResponse = await fetch('/api/file-fixer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'detect-build-command',
            projectPath 
          })
        });

        if (!commandResponse.ok) {
          throw new Error('Failed to detect build command');
        }

        const commandResult = await commandResponse.json();
        buildCommand = commandResult.buildCommand;
      }

      if (this.isAborted) return null;

      console.log(`Client: Using build command: ${buildCommand}`);
      console.log(`Client: Project path: ${projectPath || 'current directory'}`);
      this.callbacks.onBuildStart?.(buildCommand);
      this.callbacks.onProgress(25);

      // Phase 2: Running build scan
      this.callbacks.onPhaseChange?.('scanning');
      this.callbacks.onCurrentFile('Running build command...');
      this.callbacks.onProgress(50);

      const scanResponse = await fetch('/api/file-fixer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'run-build-scan',
          buildCommand,
          projectPath 
        })
      });

      if (this.isAborted) return null;

      if (!scanResponse.ok) {
        throw new Error('Failed to run build scan');
      }

      const result: BuildScanResult = await scanResponse.json();
      
      console.log(`Client: Build scan completed - ${result.totalErrors} errors, ${result.totalWarnings} warnings`);
      
      // Update progress and stats
      this.callbacks.onProgress(100);
      this.callbacks.onPhaseChange?.('complete');
      this.callbacks.onBuildComplete?.(result);

      // Calculate and update stats
      const stats = this.calculateStats(result);
      this.callbacks.onBuildStatsUpdate?.(stats);

      return result;

    } catch (error) {
      if (!this.isAborted) {
        console.error('Client: Build scan error:', error);
        this.callbacks.onPhaseChange?.('complete');
      }
      return null;
    }
  }

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