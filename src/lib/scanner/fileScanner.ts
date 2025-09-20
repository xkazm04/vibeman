import { FileResult, ScanStats, TestFile, ScanProgressCallbacks, ScanOptions } from './types';

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
    console.log('Client: Scan aborted by user');
    this.isAborted = true;
  }

  async performTestScan(): Promise<void> {
    try {
      this.isAborted = false;
      console.log('Starting test scan from client...');

      // Phase 1: Calculating files
      this.callbacks.onPhaseChange?.('calculating');
      this.callbacks.onProgress(0);

      // Get test files first
      const filesResponse = await fetch('/api/file-scanner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test-scan' })
      });

      if (!filesResponse.ok) {
        throw new Error('Failed to get test files');
      }

      const testFiles: TestFile[] = await filesResponse.json();
      console.log(`Client: Found ${testFiles.length} test files to process`);

      // Notify file count and switch to scanning phase
      this.callbacks.onFileCount?.(testFiles.length);
      this.callbacks.onPhaseChange?.('scanning');

      await this.processFiles(testFiles);

      if (!this.isAborted) {
        this.callbacks.onPhaseChange?.('complete');
        await this.generateScanLog('test-scan-with-llm');
      }

    } catch (error) {
      if (!this.isAborted) {
        console.error('Client: Test scan error:', error);
        this.updateStats({ errors: this.stats.errors + 1 });
      }
    }
  }

  async performFullScan(): Promise<void> {
    try {
      this.isAborted = false;
      console.log('Starting full scan from client...');

      // Phase 1: Calculating files
      this.callbacks.onPhaseChange?.('calculating');
      this.callbacks.onProgress(0);

      // Get all project files
      const filesResponse = await fetch('/api/file-scanner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'full-scan-files' })
      });

      if (!filesResponse.ok) {
        throw new Error('Failed to get project files');
      }

      const projectFiles: TestFile[] = await filesResponse.json();
      console.log(`Client: Found ${projectFiles.length} project files to process`);

      // Notify file count and switch to scanning phase
      this.callbacks.onFileCount?.(projectFiles.length);
      this.callbacks.onPhaseChange?.('scanning');

      await this.processFiles(projectFiles);

      if (!this.isAborted) {
        this.callbacks.onPhaseChange?.('complete');
        await this.generateScanLog('full-scan-with-llm');
      }

    } catch (error) {
      if (!this.isAborted) {
        console.error('Client: Full scan error:', error);
        this.updateStats({ errors: this.stats.errors + 1 });
      }
    }
  }

  private async processFiles(files: TestFile[]): Promise<void> {
    // Process each file sequentially
    for (let i = 0; i < files.length; i++) {
      // Check if scan was aborted
      if (this.isAborted) {
        console.log('Client: Scan aborted, stopping file processing');
        return;
      }

      const file = files[i];
      const fileIndex = i + 1;

      console.log(`Client: Starting file ${fileIndex}/${files.length}: ${file.path}`);
      this.callbacks.onCurrentFile(file.path);

      // Start progress animation for this file (20 seconds max)
      const progressStart = ((fileIndex - 1) / files.length) * 100;
      const progressEnd = (fileIndex / files.length) * 100;

      // Animate progress bar over 20 seconds
      let currentProgress = progressStart;
      const progressInterval = setInterval(() => {
        if (this.isAborted) {
          clearInterval(progressInterval);
          return;
        }
        const increment = (progressEnd - progressStart) / 200; // 200 steps over 20 seconds
        currentProgress = Math.min(currentProgress + increment, progressEnd - 1);
        this.callbacks.onProgress(currentProgress);
      }, 100); // Update every 100ms

      try {
        const startTime = Date.now();

        // Scan file with LLM and optionally write - sequential processing
        const scanResponse = await fetch('/api/file-scanner', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: this.options.writeFiles ? 'scan-and-write-file' : 'scan-file',
            filePath: file.path,
            fileContent: file.content,
            fileIndex,
            totalFiles: files.length
          })
        });

        clearInterval(progressInterval);
        this.callbacks.onProgress(progressEnd); // Complete this file's progress

        if (scanResponse.ok) {
          const result = await scanResponse.json();

          const writtenStatus = result.fileWritten ? ' (Written to disk)' : '';
          console.log(`Client: Completed file ${fileIndex}/${files.length}: ${file.path} - Changes: ${result.hasChanges}${writtenStatus}`);

          // Create file result
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
            codesCleaned: this.stats.codesCleaned + (result.changesSummary?.unusedItemsRemoved > 0 ? 1 : 0),
            errors: this.stats.errors
          });
        } else {
          console.log(`Client: Error processing file ${fileIndex}/${files.length}: ${file.path}`);

          const fileResult: FileResult = {
            fileName: file.path,
            hasChanges: false,
            description: 'Error processing file',
            docsAdded: false,
            codesCleaned: false,
            error: 'API request failed'
          };

          this.callbacks.onFileResult(fileResult);
          this.updateStats({ errors: this.stats.errors + 1 });
        }

        const processingTime = Date.now() - startTime;

        // If processing was faster than 20 seconds, wait for the remainder
        if (processingTime < 20000 && i < files.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 20000 - processingTime));
        }

      } catch (error) {
        clearInterval(progressInterval);
        this.callbacks.onProgress(progressEnd);

        console.error(`Client: Exception processing file ${fileIndex}/${files.length}:`, file.path, error);

        const fileResult: FileResult = {
          fileName: file.path,
          hasChanges: false,
          description: 'Exception during processing',
          docsAdded: false,
          codesCleaned: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };

        this.callbacks.onFileResult(fileResult);
        this.updateStats({ errors: this.stats.errors + 1 });
      }
    }
  }

  private async generateScanLog(action: string): Promise<void> {
    console.log('Client: All files processed, generating log...');

    try {
      const logResponse = await fetch('/api/file-scanner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      if (logResponse.ok) {
        const logResult = await logResponse.json();
        console.log('Client: Scan log generated at:', logResult.logPath);
      }
    } catch (logError) {
      console.error('Client: Error generating log:', logError);
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