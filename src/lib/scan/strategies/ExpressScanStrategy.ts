/**
 * Express Scan Strategy
 *
 * Implements scanning logic specific to Express.js applications.
 * Detects Express-specific patterns and Node.js backend conventions.
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

export class ExpressScanStrategy extends BaseScanStrategy {
  readonly name = 'Express.js Scanner';
  readonly techStack = 'express' as const;

  getScanPatterns(): string[] {
    return [
      '**/*.js',
      '**/*.ts',
      // Express specific
      'routes/**/*',
      'controllers/**/*',
      'middleware/**/*',
      'models/**/*',
      'services/**/*',
      'src/**/*',
      'app/**/*',
    ];
  }

  getIgnorePatterns(): string[] {
    return [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/*.test.*',
      '**/*.spec.*',
      '**/.git/**',
      '**/public/**',
    ];
  }

  getRecommendedTechniqueGroups(): string[] {
    return [
      'code-quality',
      'maintainability',
      'security',
      'express-specific',
    ];
  }

  /**
   * Detect Express-specific opportunities
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

      // Express specific checks
      this.checkErrorHandlingMiddleware(file, opportunities);
      this.checkAsyncErrorHandling(file, opportunities);
      this.checkSecurityMiddleware(file, opportunities);
      this.checkRouteValidation(file, opportunities);
      this.checkCORSConfiguration(file, opportunities);
    }

    return opportunities;
  }

  /**
   * Validate if this is an Express project
   */
  async canHandle(projectPath: string, projectType?: 'nextjs' | 'fastapi' | 'express' | 'react-native' | 'other'): Promise<boolean> {
    if (projectType === 'express') {
      return true;
    }

    // Auto-detect by checking for Express
    try {
      const { promises: fs } = await import('fs');
      const path = await import('path');

      const packageJsonPath = path.join(projectPath, 'package.json');
      if (await this.fileExists(packageJsonPath)) {
        const packageJson = JSON.parse(
          await fs.readFile(packageJsonPath, 'utf-8')
        );
        const hasExpress =
          packageJson.dependencies?.express || packageJson.devDependencies?.express;
        if (hasExpress) return true;
      }

      // Check common Express entry files
      const entryFiles = ['server.js', 'app.js', 'index.js', 'src/server.js', 'src/app.js'];
      for (const entryFile of entryFiles) {
        const entryPath = path.join(projectPath, entryFile);
        if (await this.fileExists(entryPath)) {
          const content = await fs.readFile(entryPath, 'utf-8');
          if (content.includes("require('express')") || content.includes("from 'express'")) {
            return true;
          }
        }
      }

      return false;
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
        `This file has ${file.lines} lines. Consider splitting it into smaller modules.`,
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
      description: `Found ${consoleStatements.length} console.log statements. Consider using a proper logging library (winston, pino).`,
      category: 'code-quality',
      severity: 'low',
      impact: 'Better logging and production monitoring',
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
    if (!file.path.endsWith('.ts')) return;

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

  // ========== Express Specific Checks ==========

  private checkErrorHandlingMiddleware(
    file: FileAnalysis,
    opportunities: RefactorOpportunity[]
  ): void {
    const hasExpressApp = file.content.includes('express()');
    const hasRoutes = file.content.includes('.get(') || file.content.includes('.post(');
    const hasErrorMiddleware = /app\.use\s*\(\s*\([^)]*err[^)]*\)\s*=>/g.test(file.content) ||
                               /function\s*\([^)]*err[^)]*,\s*req\s*,\s*res\s*,\s*next\s*\)/g.test(file.content);

    if ((hasExpressApp || hasRoutes) && !hasErrorMiddleware) {
      opportunities.push(
        this.createOpportunity(
          `error-middleware-${file.path}`,
          `Add error handling middleware in ${file.path}`,
          'No global error handling middleware detected. Add an error handler to catch and format errors consistently.',
          'maintainability',
          'medium',
          'Provides consistent error responses and prevents crashes',
          'low',
          [file.path],
          false,
          '30 minutes'
        )
      );
    }
  }

  private checkAsyncErrorHandling(
    file: FileAnalysis,
    opportunities: RefactorOpportunity[]
  ): void {
    const hasAsyncRoutes = /app\.(get|post|put|delete|patch)\s*\([^,]+,\s*async\s+/g.test(file.content);
    const hasTryCatch = file.content.includes('try {') && file.content.includes('catch');

    if (hasAsyncRoutes && !hasTryCatch) {
      opportunities.push(
        this.createOpportunity(
          `async-error-handling-${file.path}`,
          `Add async error handling in ${file.path}`,
          'Async route handlers detected without try/catch blocks. Consider using express-async-errors or try/catch blocks.',
          'maintainability',
          'high',
          'Prevents unhandled promise rejections and server crashes',
          'medium',
          [file.path],
          false,
          '1-2 hours'
        )
      );
    }
  }

  private checkSecurityMiddleware(
    file: FileAnalysis,
    opportunities: RefactorOpportunity[]
  ): void {
    const isMainFile = file.path.includes('server.') || file.path.includes('app.') || file.path.includes('index.');
    const hasExpressApp = file.content.includes('express()');
    const hasHelmet = file.content.includes('helmet');
    const hasRateLimiter = file.content.includes('rateLimit') || file.content.includes('rate-limit');

    if (isMainFile && hasExpressApp && !hasHelmet) {
      opportunities.push(
        this.createOpportunity(
          `helmet-security-${file.path}`,
          `Add Helmet security middleware in ${file.path}`,
          'No Helmet middleware detected. Add helmet for security headers protection.',
          'security',
          'high',
          'Protects against common web vulnerabilities',
          'low',
          [file.path],
          false,
          '15-30 minutes'
        )
      );
    }

    if (isMainFile && hasExpressApp && !hasRateLimiter) {
      opportunities.push(
        this.createOpportunity(
          `rate-limiting-${file.path}`,
          `Add rate limiting in ${file.path}`,
          'No rate limiting detected. Consider adding express-rate-limit to prevent abuse.',
          'security',
          'medium',
          'Protects against brute force and DoS attacks',
          'low',
          [file.path],
          false,
          '30 minutes'
        )
      );
    }
  }

  private checkRouteValidation(
    file: FileAnalysis,
    opportunities: RefactorOpportunity[]
  ): void {
    const hasRoutes = file.content.includes('.get(') || file.content.includes('.post(');
    const hasReqBody = file.content.includes('req.body');
    const hasValidation = file.content.includes('express-validator') ||
                          file.content.includes('joi') ||
                          file.content.includes('zod');

    if (hasRoutes && hasReqBody && !hasValidation) {
      opportunities.push(
        this.createOpportunity(
          `input-validation-${file.path}`,
          `Add input validation in ${file.path}`,
          'Routes use req.body without validation. Consider using express-validator, joi, or zod for input validation.',
          'security',
          'high',
          'Prevents invalid data and injection attacks',
          'medium',
          [file.path],
          false,
          '1-2 hours'
        )
      );
    }
  }

  private checkCORSConfiguration(
    file: FileAnalysis,
    opportunities: RefactorOpportunity[]
  ): void {
    const isMainFile = file.path.includes('server.') || file.path.includes('app.') || file.path.includes('index.');
    const hasExpressApp = file.content.includes('express()');
    const hasCORS = file.content.includes('cors()');
    const hasWildcardCORS = /cors\s*\(\s*\{[^}]*origin:\s*['"]?\*['"]?/g.test(file.content);

    if (isMainFile && hasExpressApp && hasCORS && hasWildcardCORS) {
      opportunities.push(
        this.createOpportunity(
          `cors-config-${file.path}`,
          `Review CORS configuration in ${file.path}`,
          'CORS allows all origins (*). Consider restricting to specific domains for security.',
          'security',
          'medium',
          'Improves security and prevents unauthorized access',
          'low',
          [file.path],
          false,
          '15-30 minutes'
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
