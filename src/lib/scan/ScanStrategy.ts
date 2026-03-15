/**
 * ScanStrategy Interface (FIXED VERSION)
 *
 * CHANGES:
 * - Added selectedGroups parameter to detectOpportunities()
 * - Added shouldRunGroup() helper method to RefactorScanStrategy
 *
 * TO APPLY: Copy this file to src/lib/scan/ScanStrategy.ts
 */

import type { FileAnalysis } from '@/app/features/RefactorWizard/lib/types';
import type { RefactorOpportunity } from '@/stores/refactorStore';
import { logger } from '@/lib/logger';
import { globFiles } from './fileWalker';

/**
 * Project type identifier
 */
export type ProjectType = 'nextjs' | 'fastapi' | 'express' | 'react-native' | 'other';

/**
 * Progress callback for opportunity detection
 */
export interface DetectionProgress {
  processedFiles: number;
  totalFiles: number;
  currentFile: string;
  opportunitiesFound: number;
}

export type ProgressCallback = (progress: DetectionProgress) => void | Promise<void>;

/**
 * ScanStrategy interface - implement this for each technology stack
 */
export interface ScanStrategy {
  readonly name: string;
  readonly techStack: ProjectType;

  getScanPatterns(): string[];
  getIgnorePatterns(): string[];
  scanProjectFiles(projectPath: string, selectedFolders?: string[]): Promise<FileAnalysis[]>;

  /**
   * Detect tech-specific refactoring opportunities (ASYNC)
   * @param files - Array of analyzed files
   * @param selectedGroups - Optional list of scan group IDs to filter checks
   * @param onProgress - Optional progress callback
   */
  detectOpportunities(
    files: FileAnalysis[],
    selectedGroups?: string[],
    onProgress?: ProgressCallback
  ): Promise<RefactorOpportunity[]>;

  getRecommendedTechniqueGroups(): string[];
  canHandle(projectPath: string, projectType?: ProjectType): Promise<boolean>;
}

/**
 * Base abstract class with common functionality for refactor-wizard scan strategies.
 * Renamed from BaseScanStrategy to avoid confusion with strategies/baseScanStrategy.ts
 * which serves the generic scan lifecycle pipeline.
 */
export abstract class RefactorScanStrategy implements ScanStrategy {
  abstract readonly name: string;
  abstract readonly techStack: ProjectType;

  abstract getScanPatterns(): string[];
  abstract getIgnorePatterns(): string[];
  abstract detectOpportunities(
    files: FileAnalysis[],
    selectedGroups?: string[],
    onProgress?: ProgressCallback
  ): Promise<RefactorOpportunity[]>;
  abstract getRecommendedTechniqueGroups(): string[];

  /**
   * Helper: Check if a scan group is selected
   * If no groups specified, run all checks (backward compatibility)
   */
  protected shouldRunGroup(groupId: string, selectedGroups?: string[]): boolean {
    if (!selectedGroups || selectedGroups.length === 0) {
      return true; // No filter = run all
    }
    return selectedGroups.includes(groupId);
  }

  /**
   * Helper: Process files in batches to avoid blocking the event loop
   * Yields control back to the event loop between batches
   */
  protected async processFilesInBatches<T>(
    files: FileAnalysis[],
    processor: (file: FileAnalysis, index: number) => T | Promise<T>,
    batchSize: number = 10,
    onProgress?: ProgressCallback,
    opportunitiesRef?: { count: number }
  ): Promise<T[]> {
    const results: T[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const result = await processor(file, i);
      results.push(result);

      // Report progress
      if (onProgress) {
        await onProgress({
          processedFiles: i + 1,
          totalFiles: files.length,
          currentFile: file.path,
          opportunitiesFound: opportunitiesRef?.count || 0,
        });
      }

      // Yield to event loop every batchSize files
      if ((i + 1) % batchSize === 0) {
        await new Promise(resolve => setImmediate(resolve));
      }
    }

    return results;
  }

  async scanProjectFiles(projectPath: string, selectedFolders?: string[]): Promise<FileAnalysis[]> {
    const { promises: fs } = await import('fs');
    const path = await import('path');

    const scanPatterns = this.getScanPatterns();
    const ignorePatterns = this.getIgnorePatterns();

    // Convert absolute paths to relative paths if needed
    const relativeFolders = selectedFolders && selectedFolders.length > 0
      ? selectedFolders.map(folder => {
          if (path.isAbsolute(folder)) {
            return path.relative(projectPath, folder).replace(/\\/g, '/');
          }
          return folder.replace(/\\/g, '/');
        }).filter(f => f.length > 0)
      : [];

    logger.info('[ScanStrategy] Project path:', { projectPath });
    logger.info('[ScanStrategy] Selected folders (relative):', { relativeFolders });
    logger.info('[ScanStrategy] Base scan patterns:', { scanPatterns });

    // If specific folders are selected, create simple recursive patterns for those folders
    const effectiveScanPatterns = relativeFolders.length > 0
      ? relativeFolders.flatMap(folder => [
          `${folder}/**/*.ts`,
          `${folder}/**/*.tsx`,
          `${folder}/**/*.js`,
          `${folder}/**/*.jsx`,
          `${folder}/**/*.py`,
        ])
      : scanPatterns;

    logger.info('[ScanStrategy] Effective scan patterns:', { patterns: effectiveScanPatterns.slice(0, 5), remaining: effectiveScanPatterns.length > 5 ? effectiveScanPatterns.length - 5 : 0 });

    const absolutePaths = await globFiles(projectPath, effectiveScanPatterns, { ignorePatterns });

    const files: FileAnalysis[] = [];
    for (const filePath of absolutePaths) {
      const relativePath = path.relative(projectPath, filePath).replace(/\\/g, '/');

      // Verify file is within selected folders (if specified)
      if (relativeFolders.length > 0) {
        const isInSelectedFolder = relativeFolders.some(folder =>
          relativePath.startsWith(folder + '/') || relativePath === folder
        );
        if (!isInSelectedFolder) continue;
      }

      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const size = Buffer.byteLength(content, 'utf-8');
        files.push({ path: relativePath, content, size });
      } catch {
        // Skip files that can't be read
      }
    }

    logger.info(`[ScanStrategy] Scanned ${files.length} files${relativeFolders.length > 0 ? ` in ${relativeFolders.length} folder(s): ${relativeFolders.join(', ')}` : ' in entire project'}`);

    return files;
  }

  async canHandle(projectPath: string, projectType?: ProjectType): Promise<boolean> {
    if (projectType) {
      return projectType === this.techStack;
    }
    return false;
  }

  protected createOpportunity(
    id: string,
    title: string,
    description: string,
    category: RefactorOpportunity['category'],
    severity: RefactorOpportunity['severity'],
    impact: string,
    effort: RefactorOpportunity['effort'],
    files: string[],
    autoFixAvailable: boolean,
    estimatedTime: string,
    lineNumbers?: Record<string, number[]>
  ): RefactorOpportunity {
    return {
      id,
      title,
      description,
      category,
      severity,
      impact,
      effort,
      files,
      autoFixAvailable,
      estimatedTime,
      ...(lineNumbers && { lineNumbers }),
    };
  }

  protected async fileExists(filePath: string): Promise<boolean> {
    try {
      const { promises: fs } = await import('fs');
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

export interface ScanStrategyMetadata {
  name: string;
  techStack: ProjectType;
  description: string;
  strategyClass: new () => ScanStrategy;
}
