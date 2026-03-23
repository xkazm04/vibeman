/**
 * NextJS Scan Strategy
 *
 * Uses composable PatternDetector pipeline for declarative detector registration.
 * Each detector returns findings; the base class handles batching, group filtering, and progress.
 */

import { RefactorScanStrategy, detector, type PatternDetector } from '../ScanStrategy';
import type { FileAnalysis } from '@/app/features/RefactorWizard/lib/types';
import type { RefactorOpportunity } from '@/stores/refactorStore';
import {
  checkLargeFile,
  checkDuplication,
  checkLongFunctions,
  checkConsoleStatements,
  checkAnyTypes,
  checkUnusedImports,
  checkComplexConditionals,
  checkMagicNumbers,
  checkReactHookDeps,
  checkClientServerMixing,
  checkImageOptimization,
  checkDynamicImports,
  checkMetadataAPI,
} from '../techniques/nextjs';

export class NextJSScanStrategy extends RefactorScanStrategy {
  readonly name = 'Next.js Scanner';
  readonly techStack = 'nextjs' as const;

  /** Declarative list of all detectors with their group assignments */
  private readonly detectors: PatternDetector[] = [
    // Code Quality & Standards
    detector('code-quality', checkConsoleStatements),
    detector('code-quality', checkAnyTypes),
    detector('code-quality', checkUnusedImports),
    // Maintainability
    detector('maintainability', checkLargeFile),
    detector('maintainability', checkDuplication),
    detector('maintainability', checkLongFunctions),
    detector('maintainability', checkComplexConditionals),
    detector('maintainability', checkMagicNumbers),
    // React & Component Patterns
    detector('react-specific', checkClientServerMixing),
    detector('react-specific', checkMetadataAPI),
    detector('react-specific', checkReactHookDeps),
    // Performance
    detector('performance', checkImageOptimization),
    detector('performance', checkDynamicImports),
  ];

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

  async detectOpportunities(
    files: FileAnalysis[],
    selectedGroups?: string[],
    onProgress?: import('../ScanStrategy').ProgressCallback
  ): Promise<RefactorOpportunity[]> {
    return this.detectPatterns(files, this.detectors, selectedGroups, onProgress);
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
