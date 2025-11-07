/**
 * ScanStrategy Interface
 *
 * Defines the contract for technology-specific scanning strategies.
 * Each implementation provides custom file patterns, ignore rules,
 * and analysis logic tailored to a specific tech stack.
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
  /**
   * Unique identifier for this strategy
   */
  readonly name: string;

  /**
   * Technology stack this strategy supports
   */
  readonly techStack: ProjectType;

  /**
   * File patterns to scan (glob patterns)
   */
  getScanPatterns(): string[];

  /**
   * Patterns to ignore during scanning
   */
  getIgnorePatterns(): string[];

  /**
   * Scan and analyze files in the project
   */
  scanProjectFiles(projectPath: string): Promise<FileAnalysis[]>;

  /**
   * Detect tech-specific refactoring opportunities
   * This is where stack-specific pattern detection happens
   */
  detectOpportunities(files: FileAnalysis[]): RefactorOpportunity[];

  /**
   * Get recommended scan technique groups for this tech stack
   */
  getRecommendedTechniqueGroups(): string[];

  /**
   * Validate if this strategy can handle the given project
   */
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
  abstract detectOpportunities(files: FileAnalysis[]): RefactorOpportunity[];
  abstract getRecommendedTechniqueGroups(): string[];

  /**
   * Default implementation of scanProjectFiles
   * Can be overridden for tech-specific logic
   */
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

  /**
   * Default validation - checks if explicit projectType matches
   */
  async canHandle(projectPath: string, projectType?: ProjectType): Promise<boolean> {
    if (projectType) {
      return projectType === this.techStack;
    }
    return false;
  }

  /**
   * Helper: Create a refactor opportunity
   */
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
}

/**
 * Strategy metadata for registration
 */
export interface ScanStrategyMetadata {
  name: string;
  techStack: ProjectType;
  description: string;
  strategyClass: new () => ScanStrategy;
}
