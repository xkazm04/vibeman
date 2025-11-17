/**
 * ScanStrategy Interface (FIXED VERSION)
 *
 * CHANGES:
 * - Added selectedGroups parameter to detectOpportunities()
 * - Added shouldRunGroup() helper method to BaseScanStrategy
 *
 * TO APPLY: Copy this file to src/lib/scan/ScanStrategy.ts
 */

import type { FileAnalysis } from '@/app/features/RefactorWizard/lib/types';
import type { RefactorOpportunity } from '@/stores/refactorStore';

/**
 * Project type identifier
 */
export type ProjectType = 'nextjs' | 'fastapi' | 'express' | 'react-native' | 'other';

/**
 * ScanStrategy interface - implement this for each technology stack
 */
export interface ScanStrategy {
  readonly name: string;
  readonly techStack: ProjectType;

  getScanPatterns(): string[];
  getIgnorePatterns(): string[];
  scanProjectFiles(projectPath: string): Promise<FileAnalysis[]>;

  /**
   * Detect tech-specific refactoring opportunities
   * @param files - Array of analyzed files
   * @param selectedGroups - Optional list of scan group IDs to filter checks
   */
  detectOpportunities(files: FileAnalysis[], selectedGroups?: string[]): RefactorOpportunity[];

  getRecommendedTechniqueGroups(): string[];
  canHandle(projectPath: string, projectType?: ProjectType): Promise<boolean>;
}

/**
 * Base abstract class with common functionality
 */
export abstract class BaseScanStrategy implements ScanStrategy {
  abstract readonly name: string;
  abstract readonly techStack: ProjectType;

  abstract getScanPatterns(): string[];
  abstract getIgnorePatterns(): string[];
  abstract detectOpportunities(files: FileAnalysis[], selectedGroups?: string[]): RefactorOpportunity[];
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

  async scanProjectFiles(projectPath: string): Promise<FileAnalysis[]> {
    const { promises: fs } = await import('fs');
    const path = await import('path');
    const { glob } = await import('glob');

    const files: FileAnalysis[] = [];
    const scanPatterns = this.getScanPatterns();
    const ignorePatterns = this.getIgnorePatterns();

    for (const pattern of scanPatterns) {
      const matches = await glob(pattern, {
        cwd: projectPath,
        ignore: ignorePatterns,
        absolute: true,
        windowsPathsNoEscape: true,
      });

      const matchArray = Array.isArray(matches) ? matches : [];

      for (const filePath of matchArray) {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const lines = content.split('\n').length;
          const size = Buffer.byteLength(content, 'utf-8');

          files.push({
            path: path.relative(projectPath, filePath),
            content,
            size,
            lines,
          });
        } catch (error) {
          // Skip files that can't be read
        }
      }
    }

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
