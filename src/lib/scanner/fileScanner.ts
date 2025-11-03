import { FileResult, ScanStats, TestFile, ScanProgressCallbacks, ScanOptions } from './types';

/**
 * Logger utility for file scanner
 */
const logger = {
  info: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[FileScanner] ${message}`, ...args);
    }
  },
  error: (message: string, ...args: unknown[]) => {
    console.error(`[FileScanner] ${message}`, ...args);
  }
};

export class FileScanner {
  private stats: ScanStats = {
    filesProcessed: 0,
    docsUpdated: 0,
    codesCleaned: 0,
    errors: 0
  };

  private callbacks: ScanProgressCallbacks;
  private options: ScanOptions;
  private isAborted: boolean = false;

  constructor(callbacks: ScanProgressCallbacks, options: ScanOptions) {
    this.callbacks = callbacks;
    this.options = options;
  }

  public abort(): void {
    logger.info('Scan aborted by user');
    this.isAborted = true;
  }

  async performTestScan(): Promise<void> {
    try {
      this.isAborted = false;
      logger.info('Starting test scan...');

      this.callbacks.onPhaseChange?.('calculating');
      this.callbacks.onProgress(0);

      const testFiles = await this.fetchTestFiles();
      logger.info(`Found ${testFiles.length} test files to process`);

      this.callbacks.onFileCount?.(testFiles.length);
      this.callbacks.onPhaseChange?.('scanning');

      await this.processFiles(testFiles);

      if (!this.isAborted) {
        this.callbacks.onPhaseChange?.('complete');
        await this.generateScanLog('test-scan-with-llm');
      }

    } catch (error) {
      if (!this.isAborted) {
        logger.error('Test scan error:', error);
        this.updateStats({ errors: this.stats.errors + 1 });
      }
    }
  }

  async performFullScan(): Promise<void> {
    try {
      this.isAborted = false;
      logger.info('Starting full scan...');

      this.callbacks.onPhaseChange?.('calculating');
      this.callbacks.onProgress(0);

      const projectFiles = await this.fetchProjectFiles();
      logger.info(`Found ${projectFiles.length} project files to process`);

      this.callbacks.onFileCount?.(projectFiles.length);
      this.callbacks.onPhaseChange?.('scanning');

      await this.processFiles(projectFiles);

      if (!this.isAborted) {
        this.callbacks.onPhaseChange?.('complete');
        await this.generateScanLog('full-scan-with-llm');
      }

    } catch (error) {
      if (!this.isAborted) {
        logger.error('Full scan error:', error);
        this.updateStats({ errors: this.stats.errors + 1 });
      }
    }
  }

  /**
   * Fetch test files from API
   */
  private async fetchTestFiles(): Promise<TestFile[]> {
    const response = await fetch('/api/file-scanner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'test-scan' })
    });

    if (!response.ok) {
      throw new Error('Failed to get test files');
    }

    return await response.json();
  }

  /**
   * Fetch project files from API
   */
  private async fetchProjectFiles(): Promise<TestFile[]> {
    const response = await fetch('/api/file-scanner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'full-scan-files' })
    });

    if (!response.ok) {
      throw new Error('Failed to get project files');
    }

    return await response.json();
  }

  /**
   * Process a single file
   */
  private async processFile(
    file: TestFile,
    fileIndex: number,
    totalFiles: number,
    progressStart: number,
    progressEnd: number
  ): Promise<void> {
    logger.info(`Starting file ${fileIndex}/${totalFiles}: ${file.path}`);
    this.callbacks.onCurrentFile(file.path);

    const progressInterval = this.startProgressAnimation(progressStart, progressEnd);

    try {
      const scanResponse = await fetch('/api/file-scanner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: this.options.writeFiles ? 'scan-and-write-file' : 'scan-file',
          filePath: file.path,
          fileContent: file.content,
          fileIndex,
          totalFiles
        })
      });

      clearInterval(progressInterval);
      this.callbacks.onProgress(progressEnd);

      if (scanResponse.ok) {
        const result = await scanResponse.json();
        this.handleSuccessfulScan(file, fileIndex, totalFiles, result);
      } else {
        this.handleFailedScan(file, 'API request failed');
      }

    } catch (error) {
      clearInterval(progressInterval);
      this.callbacks.onProgress(progressEnd);
      logger.error(`Exception processing file ${fileIndex}/${totalFiles}:`, file.path, error);
      this.handleFailedScan(file, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Start progress animation for file processing
   */
  private startProgressAnimation(progressStart: number, progressEnd: number): NodeJS.Timeout {
    let currentProgress = progressStart;
    return setInterval(() => {
      if (this.isAborted) {
        return;
      }
      const increment = (progressEnd - progressStart) / 200;
      currentProgress = Math.min(currentProgress + increment, progressEnd - 1);
      this.callbacks.onProgress(currentProgress);
    }, 100);
  }

  /**
   * Handle successful file scan
   */
  private handleSuccessfulScan(
    file: TestFile,
    fileIndex: number,
    totalFiles: number,
    result: { hasChanges: boolean; fileWritten: boolean; changesSummary?: {
      description?: string;
      documentationAdded?: boolean;
      unusedItemsRemoved?: number;
    }}
  ): void {
    const writtenStatus = result.fileWritten ? ' (Written to disk)' : '';
    logger.info(`Completed file ${fileIndex}/${totalFiles}: ${file.path} - Changes: ${result.hasChanges}${writtenStatus}`);

    const fileResult: FileResult = {
      fileName: file.path,
      hasChanges: result.hasChanges,
      description: result.changesSummary?.description || 'No changes made',
      docsAdded: result.changesSummary?.documentationAdded || false,
      codesCleaned: (result.changesSummary?.unusedItemsRemoved || 0) > 0
    };

    this.callbacks.onFileResult(fileResult);

    this.updateStats({
      filesProcessed: this.stats.filesProcessed + 1,
      docsUpdated: this.stats.docsUpdated + (result.changesSummary?.documentationAdded ? 1 : 0),
      codesCleaned: this.stats.codesCleaned + (result.changesSummary?.unusedItemsRemoved ? 1 : 0),
      errors: this.stats.errors
    });
  }

  /**
   * Handle failed file scan
   */
  private handleFailedScan(file: TestFile, errorMessage: string): void {
    const fileResult: FileResult = {
      fileName: file.path,
      hasChanges: false,
      description: 'Error processing file',
      docsAdded: false,
      codesCleaned: false,
      error: errorMessage
    };

    this.callbacks.onFileResult(fileResult);
    this.updateStats({ errors: this.stats.errors + 1 });
  }

  /**
   * Process multiple files sequentially
   */
  private async processFiles(files: TestFile[]): Promise<void> {
    for (let i = 0; i < files.length; i++) {
      if (this.isAborted) {
        logger.info('Scan aborted, stopping file processing');
        return;
      }

      const file = files[i];
      const fileIndex = i + 1;
      const progressStart = ((fileIndex - 1) / files.length) * 100;
      const progressEnd = (fileIndex / files.length) * 100;

      const startTime = Date.now();
      await this.processFile(file, fileIndex, files.length, progressStart, progressEnd);
      const processingTime = Date.now() - startTime;

      // Ensure minimum processing time
      if (processingTime < 20000 && i < files.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 20000 - processingTime));
      }
    }
  }

  /**
   * Generate scan log after completion
   */
  private async generateScanLog(action: string): Promise<void> {
    logger.info('All files processed, generating log...');

    try {
      const logResponse = await fetch('/api/file-scanner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      if (logResponse.ok) {
        const logResult = await logResponse.json();
        logger.info('Scan log generated at:', logResult.logPath);
      }
    } catch (logError) {
      logger.error('Error generating log:', logError);
    }
  }

  private updateStats(newStats: Partial<ScanStats>): void {
    this.stats = { ...this.stats, ...newStats };
    this.callbacks.onStatsUpdate(this.stats);
  }

  public getStats(): ScanStats {
    return { ...this.stats };
  }

  public resetStats(): void {
    this.stats = {
      filesProcessed: 0,
      docsUpdated: 0,
      codesCleaned: 0,
      errors: 0
    };
    this.callbacks.onStatsUpdate(this.stats);
  }
}
