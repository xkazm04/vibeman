/**
 * Base Analyzer Component
 * Foundation for all analyzer components that scan project files
 */

import { BaseComponent } from './BaseComponent';
import { ExecutionContext, Issue, ProjectType, AnalyzerCategory, AnalyzerProjectMetadata } from '../../types';
import { glob } from 'glob';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface AnalyzerConfig {
  excludePatterns?: string[];
  includePatterns?: string[];
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Default file patterns for different project types
 */
export const PROJECT_FILE_PATTERNS: Record<ProjectType, string[]> = {
  nextjs: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
  fastapi: ['**/*.py'],
  express: ['**/*.ts', '**/*.js'],
  'react-native': ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
  other: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.py'],
};

/**
 * Default exclude patterns for different project types
 */
export const PROJECT_EXCLUDE_PATTERNS: Record<ProjectType, string[]> = {
  nextjs: [
    '**/node_modules/**',
    '**/.next/**',
    '**/dist/**',
    '**/build/**',
    '**/*.test.*',
    '**/*.spec.*',
    '**/__tests__/**',
  ],
  fastapi: [
    '**/__pycache__/**',
    '**/venv/**',
    '**/.venv/**',
    '**/env/**',
    '**/.env/**',
    '**/dist/**',
    '**/build/**',
    '**/*.pyc',
    '**/*.pyo',
    '**/*.egg-info/**',
    '**/test_*.py',
    '**/*_test.py',
    '**/.git/**',
  ],
  express: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/*.test.*',
    '**/*.spec.*',
    '**/__tests__/**',
  ],
  'react-native': [
    '**/node_modules/**',
    '**/ios/build/**',
    '**/android/build/**',
    '**/android/.gradle/**',
    '**/*.test.*',
    '**/*.spec.*',
    '**/__tests__/**',
  ],
  other: [
    '**/node_modules/**',
    '**/__pycache__/**',
    '**/venv/**',
    '**/dist/**',
    '**/build/**',
  ],
};

export abstract class BaseAnalyzer<TConfig extends AnalyzerConfig, TOutput extends Issue[]>
  extends BaseComponent<void, TOutput, TConfig> {

  readonly type = 'analyzer' as const;

  /**
   * Project type metadata - override in subclasses
   * By default, technical analyzers support 'nextjs', business analyzers support 'all'
   */
  abstract readonly projectMetadata: AnalyzerProjectMetadata;

  /**
   * Check if this analyzer supports the given project type
   */
  supportsProjectType(projectType: ProjectType | string): boolean {
    if (this.projectMetadata.supportedProjectTypes === 'all') {
      return true;
    }
    return this.projectMetadata.supportedProjectTypes.includes(projectType as ProjectType);
  }

  /**
   * Get the analyzer category (technical or business)
   */
  getCategory(): AnalyzerCategory {
    return this.projectMetadata.category;
  }

  /**
   * Check if this is a technical analyzer
   */
  isTechnical(): boolean {
    return this.projectMetadata.category === 'technical';
  }

  /**
   * Check if this is a business analyzer
   */
  isBusiness(): boolean {
    return this.projectMetadata.category === 'business';
  }

  getInputTypes(): string[] {
    return []; // Analyzers don't take input
  }

  abstract getOutputTypes(): string[];

  /**
   * Get file patterns for the current project type
   */
  protected getFilePatterns(projectType: ProjectType | string): string[] {
    // Use analyzer-specific patterns if defined
    if (this.projectMetadata.filePatterns?.length) {
      return this.projectMetadata.filePatterns;
    }
    // Fall back to project type defaults
    return PROJECT_FILE_PATTERNS[projectType as ProjectType] || PROJECT_FILE_PATTERNS.other;
  }

  /**
   * Get exclude patterns for the current project type
   */
  protected getExcludePatterns(projectType: ProjectType | string): string[] {
    const defaults = PROJECT_EXCLUDE_PATTERNS[projectType as ProjectType] || PROJECT_EXCLUDE_PATTERNS.other;
    const analyzerExcludes = this.projectMetadata.excludePatterns || [];
    const configExcludes = this.config.excludePatterns || [];
    return [...defaults, ...analyzerExcludes, ...configExcludes];
  }

  protected async getProjectFiles(
    projectPath: string,
    patterns?: string[],
    projectType?: ProjectType | string
  ): Promise<string[]> {
    const type = projectType || 'nextjs';
    const filePatterns = patterns || this.getFilePatterns(type);
    const excludePatterns = this.getExcludePatterns(type);

    const files: string[] = [];

    for (const pattern of filePatterns) {
      const matches = await glob(pattern, {
        cwd: projectPath,
        ignore: excludePatterns,
        absolute: true,
      });
      files.push(...matches);
    }

    return Array.from(new Set(files)); // Deduplicate
  }

  protected async readFile(filePath: string): Promise<string> {
    return fs.readFile(filePath, 'utf-8');
  }

  protected getRelativePath(filePath: string, projectPath: string): string {
    return path.relative(projectPath, filePath);
  }

  protected generateIssueId(file: string, line: number, category: string): string {
    return `${category}-${file.replace(/[^a-zA-Z0-9]/g, '-')}-${line}`;
  }
}
