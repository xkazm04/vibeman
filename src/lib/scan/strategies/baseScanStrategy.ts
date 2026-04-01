/**
 * Base Scan Strategy
 *
 * Abstract base class defining the common scan lifecycle.
 * Steps: Validate → Gather → Analyze → BuildResult → Persist
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  FileGatherer,
  ScanConfig,
  ScanResult,
  ScanFinding,
  ScanMetadata,
  CodebaseFile,
  ScanEventListener,
  ScanEvent,
  ScanRepository,
} from '../types';
import { ScanError } from '../types';
import { getDefaultFileGatherer } from '../fileGatherer';

export abstract class BaseScanStrategy {
  protected fileGatherer: FileGatherer;
  protected scanId: string = '';
  protected startTime: number = 0;
  protected eventListeners: ScanEventListener[] = [];
  protected repository?: ScanRepository;

  constructor(fileGatherer?: FileGatherer, repository?: ScanRepository) {
    this.fileGatherer = fileGatherer || getDefaultFileGatherer();
    this.repository = repository;
  }

  /**
   * Main entry point for scanning.
   * Builds and executes the middleware pipeline.
   */
  async scan(config: ScanConfig): Promise<ScanResult> {
    this.scanId = uuidv4();
    this.startTime = Date.now();

    try {
      this.validateConfig(config);

      const files = await this.fileGatherer.gather(config);
      const findings = await this.analyze(config, files);

      return {
        success: true,
        scanId: this.scanId,
        category: config.scanCategory,
        findings,
        metadata: this.buildMetadata(config, files.length, findings.length),
      };
    } catch (error) {
      const scanError = error instanceof ScanError ? error : new ScanError(
        'scan_failed',
        error instanceof Error ? error.message : String(error),
        { originalError: error }
      );

      this.emitEvent({
        type: 'scan_failed',
        scanId: this.scanId,
        timestamp: Date.now(),
        data: { error: scanError.message },
      });

      return {
        success: false,
        scanId: this.scanId,
        category: config.scanCategory,
        findings: [],
        metadata: this.buildMetadata(config, 0, 0),
        error: {
          code: scanError.code,
          message: scanError.message,
          details: scanError.details,
        },
      };
    }
  }

  /**
   * Validation hook (can be overridden by subclasses).
   */
  protected validateConfig(_config: ScanConfig): void {
    // Base implementation does minimal validation
  }

  /**
   * Abstract method: analyze the gathered files.
   * Implemented by subclasses (Agent, Structure, etc.).
   */
  protected abstract analyze(
    config: ScanConfig,
    files: CodebaseFile[]
  ): Promise<ScanFinding[]>;

  /**
   * Get default file extensions to scan.
   * Can be overridden by subclasses.
   */
  protected getDefaultFileExtensions(): string[] {
    return ['.ts', '.tsx', '.js', '.jsx', '.py', '.md'];
  }

  /**
   * Get excluded patterns (glob-style).
   * Can be overridden by subclasses.
   */
  protected getExcludedPatterns(): string[] {
    return [
      'node_modules/**',
      '.git/**',
      'dist/**',
      'build/**',
      '.next/**',
      '__pycache__/**',
      '.venv/**',
    ];
  }

  /**
   * Build metadata object for the scan.
   */
  protected buildMetadata(
    config: ScanConfig,
    fileCount: number,
    findingCount: number
  ): ScanMetadata {
    return {
      scanId: this.scanId,
      category: config.scanCategory,
      startedAt: new Date(this.startTime).toISOString(),
      completedAt: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      fileCount,
      filesAnalyzed: fileCount,
      provider: config.provider,
      agentType: config.scanType,
    };
  }

  /**
   * Subscribe to scan events.
   */
  onEvent(listener: ScanEventListener): () => void {
    this.eventListeners.push(listener);
    return () => {
      const idx = this.eventListeners.indexOf(listener);
      if (idx !== -1) {
        this.eventListeners.splice(idx, 1);
      }
    };
  }

  /**
   * Emit event to all listeners.
   */
  protected emitEvent(event: ScanEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Event listener error:', error);
      }
    }
  }
}
