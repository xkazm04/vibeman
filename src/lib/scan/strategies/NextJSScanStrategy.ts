/**
 * NextJS Scan Strategy (REFACTORED VERSION)
 *
 * CHANGES:
 * - Migrated to use modular techniques from @/lib/scan/techniques/nextjs
 * - Pattern detectors moved to @/lib/scan/patterns
 * - Simplified structure - techniques are now reusable across the codebase
 */

import { BaseScanStrategy } from '../ScanStrategy';
import type { FileAnalysis } from '@/app/features/RefactorWizard/lib/types';
import type { RefactorOpportunity } from '@/stores/refactorStore';
import {
  // Generic code quality techniques
  checkLargeFile,
  checkDuplication,
  checkLongFunctions,
  checkConsoleStatements,
  checkAnyTypes,
  checkUnusedImports,
  checkComplexConditionals,
  checkMagicNumbers,
  checkReactHookDeps,
  // Next.js specific techniques
  checkClientServerMixing,
  checkImageOptimization,
  checkDynamicImports,
  checkMetadataAPI,
} from '../techniques/nextjs';

export class NextJSScanStrategy extends BaseScanStrategy {
  readonly name = 'Next.js Scanner';
  readonly techStack = 'nextjs' as const;

  getScanPatterns(): string[] {
    return [
      '**/*.ts',
      '**/*.tsx',
      '**/*.js',
      '**/*.jsx',
      'app/**/*',
      'pages/**/*',
      'components/**/*',
      'src/**/*',
    ];
  }

  getIgnorePatterns(): string[] {
    return [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/out/**',
      '**/coverage/**',
      '**/*.test.*',
      '**/*.spec.*',
      '**/.git/**',
    ];
  }

  getRecommendedTechniqueGroups(): string[] {
    return [
      'code-quality',
      'maintainability',
      'performance',
      'react-specific',
    ];
  }

  /**
   * Detect Next.js-specific opportunities (ASYNC)
   * Uses modular technique functions for better reusability
   */
  async detectOpportunities(
    files: FileAnalysis[],
    selectedGroups?: string[],
    onProgress?: import('../ScanStrategy').ProgressCallback
  ): Promise<RefactorOpportunity[]> {
    const opportunities: RefactorOpportunity[] = [];
    const opportunitiesRef = { count: 0 };

    // Process files in batches to avoid blocking the event loop
    await this.processFilesInBatches(
      files,
      async (file) => {
        // Code Quality & Standards
        if (this.shouldRunGroup('code-quality', selectedGroups)) {
          checkConsoleStatements(file, opportunities);
          checkAnyTypes(file, opportunities);
          checkUnusedImports(file, opportunities);
        }

        // Maintainability
        if (this.shouldRunGroup('maintainability', selectedGroups)) {
          checkLargeFile(file, opportunities);
          checkDuplication(file, opportunities);
          checkLongFunctions(file, opportunities);
          checkComplexConditionals(file, opportunities);
          checkMagicNumbers(file, opportunities);
        }

        // React & Component Patterns
        if (this.shouldRunGroup('react-specific', selectedGroups)) {
          checkClientServerMixing(file, opportunities);
          checkMetadataAPI(file, opportunities);
          checkReactHookDeps(file, opportunities);
        }

        // Performance
        if (this.shouldRunGroup('performance', selectedGroups)) {
          checkImageOptimization(file, opportunities);
          checkDynamicImports(file, opportunities);
        }

        // Update opportunities count
        opportunitiesRef.count = opportunities.length;
      },
      10, // Process 10 files at a time
      onProgress,
      opportunitiesRef
    );

    return opportunities;
  }

  async canHandle(projectPath: string, projectType?: 'nextjs' | 'fastapi' | 'express' | 'react-native' | 'other'): Promise<boolean> {
    if (projectType === 'nextjs') {
      return true;
    }

    try {
      const { promises: fs } = await import('fs');
      const path = await import('path');

      const nextConfigExists =
        (await this.fileExists(path.join(projectPath, 'next.config.js'))) ||
        (await this.fileExists(path.join(projectPath, 'next.config.mjs'))) ||
        (await this.fileExists(path.join(projectPath, 'next.config.ts')));

      const packageJsonPath = path.join(projectPath, 'package.json');
      const packageJsonExists = await this.fileExists(packageJsonPath);

      if (packageJsonExists) {
        const packageJson = JSON.parse(
          await fs.readFile(packageJsonPath, 'utf-8')
        );
        const hasNextDep =
          packageJson.dependencies?.next || packageJson.devDependencies?.next;
        if (hasNextDep) return true;
      }

      return nextConfigExists;
    } catch {
      return false;
    }
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
