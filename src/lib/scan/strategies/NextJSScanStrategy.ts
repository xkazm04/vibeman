/**
 * NextJS Scan Strategy
 *
 * Implements scanning logic specific to Next.js applications.
 * Detects Next.js-specific patterns, conventions, and issues.
 */

import { BaseScanStrategy } from '../ScanStrategy';
import type { FileAnalysis } from '@/app/features/RefactorWizard/lib/types';
import type { RefactorOpportunity } from '@/stores/refactorStore';
import {
  detectDuplication,
  detectLongFunctions,
  detectConsoleStatements,
  detectAnyTypes,
  detectUnusedImports,
} from '@/app/features/RefactorWizard/lib/patternDetectors';

export class NextJSScanStrategy extends BaseScanStrategy {
  readonly name = 'Next.js Scanner';
  readonly techStack = 'nextjs' as const;

  getScanPatterns(): string[] {
    return [
      // TypeScript/JavaScript
      '**/*.ts',
      '**/*.tsx',
      '**/*.js',
      '**/*.jsx',
      // Next.js specific
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
      'nextjs-specific',
    ];
  }

  /**
   * Detect Next.js-specific opportunities
   */
  detectOpportunities(files: FileAnalysis[]): RefactorOpportunity[] {
    const opportunities: RefactorOpportunity[] = [];

    for (const file of files) {
      // Generic checks
      this.checkLargeFile(file, opportunities);
      this.checkDuplication(file, opportunities);
      this.checkLongFunctions(file, opportunities);
      this.checkConsoleStatements(file, opportunities);
      this.checkAnyTypes(file, opportunities);
      this.checkUnusedImports(file, opportunities);

      // Next.js specific checks
      this.checkClientServerMixing(file, opportunities);
      this.checkImageOptimization(file, opportunities);
      this.checkDynamicImports(file, opportunities);
      this.checkMetadataAPI(file, opportunities);
      this.checkServerActions(file, opportunities);
    }

    return opportunities;
  }

  /**
   * Validate if this is a Next.js project
   */
  async canHandle(projectPath: string, projectType?: 'nextjs' | 'fastapi' | 'express' | 'react-native' | 'other'): Promise<boolean> {
    if (projectType === 'nextjs') {
      return true;
    }

    // Auto-detect by checking for Next.js files
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

  // ========== Generic Checks ==========

  private checkLargeFile(
    file: FileAnalysis,
    opportunities: RefactorOpportunity[]
  ): void {
    if (file.lines <= 500) return;

    opportunities.push(
      this.createOpportunity(
        `long-file-${file.path}`,
        `Large file detected: ${file.path}`,
        `This file has ${file.lines} lines. Consider splitting it into smaller, more focused modules.`,
        'maintainability',
        file.lines > 1000 ? 'high' : 'medium',
        'Improves code organization and maintainability',
        'high',
        [file.path],
        false,
        '2-4 hours'
      )
    );
  }

  private checkDuplication(
    file: FileAnalysis,
    opportunities: RefactorOpportunity[]
  ): void {
    const duplicatePatterns = detectDuplication(file.content);
    if (duplicatePatterns.length === 0) return;

    opportunities.push({
      id: `duplication-${file.path}`,
      title: `Code duplication in ${file.path}`,
      description: `Found ${duplicatePatterns.length} duplicated code blocks that could be extracted into reusable functions.`,
      category: 'duplication',
      severity: 'medium',
      impact: 'Reduces code duplication and improves maintainability',
      effort: 'medium',
      files: [file.path],
      autoFixAvailable: true,
      estimatedTime: '1-2 hours',
    });
  }

  private checkLongFunctions(
    file: FileAnalysis,
    opportunities: RefactorOpportunity[]
  ): void {
    const longFunctions = detectLongFunctions(file.content);
    if (longFunctions.length === 0) return;

    opportunities.push({
      id: `long-functions-${file.path}`,
      title: `Long functions in ${file.path}`,
      description: `Found ${longFunctions.length} functions exceeding 50 lines. Consider breaking them into smaller functions.`,
      category: 'maintainability',
      severity: 'low',
      impact: 'Improves code readability and testability',
      effort: 'medium',
      files: [file.path],
      lineNumbers: { [file.path]: longFunctions },
      autoFixAvailable: true,
      estimatedTime: '1-3 hours',
    });
  }

  private checkConsoleStatements(
    file: FileAnalysis,
    opportunities: RefactorOpportunity[]
  ): void {
    const consoleStatements = detectConsoleStatements(file.content);
    if (consoleStatements.length === 0) return;

    opportunities.push({
      id: `console-logs-${file.path}`,
      title: `Console statements in ${file.path}`,
      description: `Found ${consoleStatements.length} console.log statements that should be removed or replaced with proper logging.`,
      category: 'code-quality',
      severity: 'low',
      impact: 'Cleaner production code',
      effort: 'low',
      files: [file.path],
      lineNumbers: { [file.path]: consoleStatements },
      autoFixAvailable: true,
      estimatedTime: '15-30 minutes',
    });
  }

  private checkAnyTypes(
    file: FileAnalysis,
    opportunities: RefactorOpportunity[]
  ): void {
    const anyTypes = detectAnyTypes(file.content);
    if (anyTypes.length === 0) return;

    opportunities.push({
      id: `any-types-${file.path}`,
      title: `'any' type usage in ${file.path}`,
      description: `Found ${anyTypes.length} uses of 'any' type. Consider using proper TypeScript types for better type safety.`,
      category: 'code-quality',
      severity: 'medium',
      impact: 'Improves type safety and prevents runtime errors',
      effort: 'medium',
      files: [file.path],
      lineNumbers: { [file.path]: anyTypes },
      autoFixAvailable: false,
      estimatedTime: '30-60 minutes',
    });
  }

  private checkUnusedImports(
    file: FileAnalysis,
    opportunities: RefactorOpportunity[]
  ): void {
    const unusedImports = detectUnusedImports(file.content);
    if (unusedImports.length === 0) return;

    opportunities.push({
      id: `unused-imports-${file.path}`,
      title: `Unused imports in ${file.path}`,
      description: `Found ${unusedImports.length} potentially unused imports that could be removed.`,
      category: 'code-quality',
      severity: 'low',
      impact: 'Cleaner code and smaller bundle size',
      effort: 'low',
      files: [file.path],
      autoFixAvailable: true,
      estimatedTime: '10-15 minutes',
    });
  }

  // ========== Next.js Specific Checks ==========

  private checkClientServerMixing(
    file: FileAnalysis,
    opportunities: RefactorOpportunity[]
  ): void {
    const hasUseClient = file.content.includes("'use client'");
    const hasServerCode =
      file.content.includes('import { cookies }') ||
      file.content.includes('import { headers }') ||
      file.content.includes('import { draftMode }');

    if (hasUseClient && hasServerCode) {
      opportunities.push(
        this.createOpportunity(
          `client-server-mixing-${file.path}`,
          `Mixed client/server code in ${file.path}`,
          "This file has 'use client' directive but also imports server-only APIs. Consider splitting into separate files.",
          'architecture',
          'high',
          'Prevents runtime errors and improves code clarity',
          'medium',
          [file.path],
          false,
          '1-2 hours'
        )
      );
    }
  }

  private checkImageOptimization(
    file: FileAnalysis,
    opportunities: RefactorOpportunity[]
  ): void {
    const hasHtmlImg = /<img\s+/g.test(file.content);
    const hasNextImage = /from ['"]next\/image['"]/g.test(file.content);

    if (hasHtmlImg && !hasNextImage) {
      const matches = file.content.match(/<img\s+/g);
      if (matches && matches.length > 0) {
        opportunities.push(
          this.createOpportunity(
            `image-optimization-${file.path}`,
            `Use Next.js Image component in ${file.path}`,
            `Found ${matches.length} <img> tags. Consider using next/image for automatic optimization.`,
            'performance',
            'medium',
            'Improves image loading performance and LCP',
            'low',
            [file.path],
            false,
            '30-60 minutes'
          )
        );
      }
    }
  }

  private checkDynamicImports(
    file: FileAnalysis,
    opportunities: RefactorOpportunity[]
  ): void {
    // Check for large client components that could benefit from dynamic imports
    const hasUseClient = file.content.includes("'use client'");
    const isLarge = file.lines > 300;
    const hasHeavyLibs =
      file.content.includes('import Chart') ||
      file.content.includes('import { Editor') ||
      file.content.includes('import * as THREE');

    if (hasUseClient && (isLarge || hasHeavyLibs)) {
      const hasDynamic = file.content.includes("from 'next/dynamic'");
      if (!hasDynamic) {
        opportunities.push(
          this.createOpportunity(
            `dynamic-import-${file.path}`,
            `Consider dynamic imports in ${file.path}`,
            'This large client component could benefit from code splitting with next/dynamic.',
            'performance',
            'low',
            'Reduces initial bundle size and improves page load',
            'low',
            [file.path],
            false,
            '30 minutes'
          )
        );
      }
    }
  }

  private checkMetadataAPI(
    file: FileAnalysis,
    opportunities: RefactorOpportunity[]
  ): void {
    // Check if using old Head component instead of metadata API
    const hasHead = /import\s+Head\s+from\s+['"]next\/head['"]/g.test(
      file.content
    );
    const isAppRouter =
      file.path.startsWith('app/') || file.path.includes('/app/');

    if (hasHead && isAppRouter) {
      opportunities.push(
        this.createOpportunity(
          `metadata-api-${file.path}`,
          `Migrate to Metadata API in ${file.path}`,
          "Using next/head in App Router. Consider migrating to the Metadata API or generateMetadata() function.",
          'maintainability',
          'low',
          'Uses modern Next.js patterns and improves SEO',
          'medium',
          [file.path],
          false,
          '30-60 minutes'
        )
      );
    }
  }

  private checkServerActions(
    file: FileAnalysis,
    opportunities: RefactorOpportunity[]
  ): void {
    // Check for API routes that could be server actions
    const isApiRoute = file.path.includes('/api/') || file.path.includes('\\api\\');
    const hasSimplePostHandler =
      /export\s+async\s+function\s+POST/.test(file.content) &&
      file.lines < 50;

    if (isApiRoute && hasSimplePostHandler) {
      opportunities.push(
        this.createOpportunity(
          `server-action-${file.path}`,
          `Consider Server Actions for ${file.path}`,
          'This simple API route could be converted to a Server Action for better type safety and simpler data flow.',
          'maintainability',
          'low',
          'Simplifies data mutations and improves type safety',
          'medium',
          [file.path],
          false,
          '1-2 hours'
        )
      );
    }
  }

  // ========== Helpers ==========

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      const { promises: fs } = await import('fs');
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
