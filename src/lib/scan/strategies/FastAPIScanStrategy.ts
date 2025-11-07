/**
 * FastAPI Scan Strategy
 *
 * Implements scanning logic specific to FastAPI applications.
 * Detects Python-specific patterns and FastAPI conventions.
 */

import { BaseScanStrategy } from '../ScanStrategy';
import type { FileAnalysis } from '@/app/features/RefactorWizard/lib/types';
import type { RefactorOpportunity } from '@/stores/refactorStore';

export class FastAPIScanStrategy extends BaseScanStrategy {
  readonly name = 'FastAPI Scanner';
  readonly techStack = 'fastapi' as const;

  getScanPatterns(): string[] {
    return [
      '**/*.py',
      // FastAPI specific
      'app/**/*.py',
      'src/**/*.py',
      'api/**/*.py',
      'routers/**/*.py',
      'routes/**/*.py',
      'models/**/*.py',
      'schemas/**/*.py',
      'services/**/*.py',
    ];
  }

  getIgnorePatterns(): string[] {
    return [
      '**/node_modules/**',
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
    ];
  }

  getRecommendedTechniqueGroups(): string[] {
    return [
      'code-quality',
      'maintainability',
      'performance',
      'fastapi-specific',
    ];
  }

  /**
   * Detect FastAPI-specific opportunities
   */
  detectOpportunities(files: FileAnalysis[]): RefactorOpportunity[] {
    const opportunities: RefactorOpportunity[] = [];

    for (const file of files) {
      // Generic Python checks
      this.checkLargeFile(file, opportunities);
      this.checkLongFunctions(file, opportunities);
      this.checkPrintStatements(file, opportunities);
      this.checkTypeAnnotations(file, opportunities);
      this.checkUnusedImports(file, opportunities);

      // FastAPI specific checks
      this.checkDependencyInjection(file, opportunities);
      this.checkAsyncEndpoints(file, opportunities);
      this.checkPydanticModels(file, opportunities);
      this.checkErrorHandling(file, opportunities);
      this.checkCORSConfiguration(file, opportunities);
    }

    return opportunities;
  }

  /**
   * Validate if this is a FastAPI project
   */
  async canHandle(projectPath: string, projectType?: 'nextjs' | 'fastapi' | 'express' | 'react-native' | 'other'): Promise<boolean> {
    if (projectType === 'fastapi') {
      return true;
    }

    // Auto-detect by checking for FastAPI files
    try {
      const { promises: fs } = await import('fs');
      const path = await import('path');

      // Check for requirements.txt with fastapi
      const requirementsPath = path.join(projectPath, 'requirements.txt');
      if (await this.fileExists(requirementsPath)) {
        const requirements = await fs.readFile(requirementsPath, 'utf-8');
        if (requirements.toLowerCase().includes('fastapi')) {
          return true;
        }
      }

      // Check for pyproject.toml with fastapi
      const pyprojectPath = path.join(projectPath, 'pyproject.toml');
      if (await this.fileExists(pyprojectPath)) {
        const pyproject = await fs.readFile(pyprojectPath, 'utf-8');
        if (pyproject.toLowerCase().includes('fastapi')) {
          return true;
        }
      }

      // Check for main.py with FastAPI import
      const mainPyPath = path.join(projectPath, 'main.py');
      if (await this.fileExists(mainPyPath)) {
        const mainPy = await fs.readFile(mainPyPath, 'utf-8');
        if (mainPy.includes('from fastapi import') || mainPy.includes('import fastapi')) {
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  // ========== Generic Python Checks ==========

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

  private checkLongFunctions(
    file: FileAnalysis,
    opportunities: RefactorOpportunity[]
  ): void {
    const lines = file.content.split('\n');
    const longFunctions: number[] = [];
    let currentFunctionStart = -1;
    let currentIndent = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Detect function definition
      if (trimmed.startsWith('def ') || trimmed.startsWith('async def ')) {
        if (currentFunctionStart !== -1) {
          const functionLength = i - currentFunctionStart;
          if (functionLength > 50) {
            longFunctions.push(currentFunctionStart + 1);
          }
        }
        currentFunctionStart = i;
        currentIndent = line.length - line.trimStart().length;
      }
      // Detect end of function (return to base indent or less)
      else if (currentFunctionStart !== -1 && trimmed && !line.startsWith(' '.repeat(currentIndent + 1))) {
        const functionLength = i - currentFunctionStart;
        if (functionLength > 50) {
          longFunctions.push(currentFunctionStart + 1);
        }
        currentFunctionStart = -1;
      }
    }

    if (longFunctions.length > 0) {
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
        autoFixAvailable: false,
        estimatedTime: '1-3 hours',
      });
    }
  }

  private checkPrintStatements(
    file: FileAnalysis,
    opportunities: RefactorOpportunity[]
  ): void {
    const printStatements: number[] = [];
    const lines = file.content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      if (/\bprint\s*\(/.test(lines[i])) {
        printStatements.push(i + 1);
      }
    }

    if (printStatements.length > 0) {
      opportunities.push({
        id: `print-statements-${file.path}`,
        title: `Print statements in ${file.path}`,
        description: `Found ${printStatements.length} print() statements. Consider using proper logging (logging module).`,
        category: 'code-quality',
        severity: 'low',
        impact: 'Better debugging and production logging',
        effort: 'low',
        files: [file.path],
        lineNumbers: { [file.path]: printStatements },
        autoFixAvailable: true,
        estimatedTime: '15-30 minutes',
      });
    }
  }

  private checkTypeAnnotations(
    file: FileAnalysis,
    opportunities: RefactorOpportunity[]
  ): void {
    const lines = file.content.split('\n');
    const missingAnnotations: number[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Check for function definitions without type hints
      if ((line.startsWith('def ') || line.startsWith('async def ')) && !line.includes('->')) {
        // Skip __init__ and other dunder methods
        if (!line.includes('def __')) {
          missingAnnotations.push(i + 1);
        }
      }
    }

    if (missingAnnotations.length > 0) {
      opportunities.push({
        id: `type-annotations-${file.path}`,
        title: `Missing type annotations in ${file.path}`,
        description: `Found ${missingAnnotations.length} functions without return type annotations. Add type hints for better code clarity.`,
        category: 'code-quality',
        severity: 'low',
        impact: 'Improves code documentation and catches type errors',
        effort: 'medium',
        files: [file.path],
        lineNumbers: { [file.path]: missingAnnotations },
        autoFixAvailable: false,
        estimatedTime: '30-60 minutes',
      });
    }
  }

  private checkUnusedImports(
    file: FileAnalysis,
    opportunities: RefactorOpportunity[]
  ): void {
    const lines = file.content.split('\n');
    const imports = new Map<string, number>();
    const unusedImports: number[] = [];

    // Collect imports
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const importMatch = line.match(/^(?:from .+ )?import (.+)/);
      if (importMatch) {
        const importedNames = importMatch[1].split(',').map(n => n.trim().split(' as ')[0]);
        importedNames.forEach(name => imports.set(name, i + 1));
      }
    }

    // Check usage (simple heuristic)
    const restOfFile = lines.slice(10).join('\n'); // Skip import section
    for (const [name, lineNum] of imports) {
      if (!restOfFile.includes(name)) {
        unusedImports.push(lineNum);
      }
    }

    if (unusedImports.length > 0) {
      opportunities.push({
        id: `unused-imports-${file.path}`,
        title: `Unused imports in ${file.path}`,
        description: `Found ${unusedImports.length} potentially unused imports that could be removed.`,
        category: 'code-quality',
        severity: 'low',
        impact: 'Cleaner code and faster startup',
        effort: 'low',
        files: [file.path],
        lineNumbers: { [file.path]: unusedImports },
        autoFixAvailable: true,
        estimatedTime: '10-15 minutes',
      });
    }
  }

  // ========== FastAPI Specific Checks ==========

  private checkDependencyInjection(
    file: FileAnalysis,
    opportunities: RefactorOpportunity[]
  ): void {
    const hasRoutes = file.content.includes('@app.') || file.content.includes('@router.');
    const hasDuplicateLogic = file.content.split('Session()').length > 3;

    if (hasRoutes && hasDuplicateLogic && !file.content.includes('Depends(')) {
      opportunities.push(
        this.createOpportunity(
          `dependency-injection-${file.path}`,
          `Use dependency injection in ${file.path}`,
          'Multiple endpoints have repeated logic. Consider using FastAPI Depends() for shared dependencies.',
          'architecture',
          'medium',
          'Reduces code duplication and improves testability',
          'medium',
          [file.path],
          false,
          '1-2 hours'
        )
      );
    }
  }

  private checkAsyncEndpoints(
    file: FileAnalysis,
    opportunities: RefactorOpportunity[]
  ): void {
    const hasRoutes = file.content.includes('@app.') || file.content.includes('@router.');
    const hasSyncDef = /\n\s*def\s+\w+\s*\([^)]*\)\s*:/g.test(file.content);
    const hasAsyncDef = /\n\s*async\s+def\s+\w+\s*\([^)]*\)\s*:/g.test(file.content);

    if (hasRoutes && hasSyncDef && !hasAsyncDef) {
      opportunities.push(
        this.createOpportunity(
          `async-endpoints-${file.path}`,
          `Consider async endpoints in ${file.path}`,
          'Route handlers are synchronous. Consider using async def for better performance with I/O operations.',
          'performance',
          'low',
          'Improves concurrency and throughput',
          'low',
          [file.path],
          false,
          '30-60 minutes'
        )
      );
    }
  }

  private checkPydanticModels(
    file: FileAnalysis,
    opportunities: RefactorOpportunity[]
  ): void {
    const hasRoutes = file.content.includes('@app.') || file.content.includes('@router.');
    const hasDictParams = /def\s+\w+\([^)]*:\s*dict/.test(file.content);
    const hasPydantic = file.content.includes('from pydantic import') || file.content.includes('BaseModel');

    if (hasRoutes && hasDictParams && !hasPydantic) {
      opportunities.push(
        this.createOpportunity(
          `pydantic-models-${file.path}`,
          `Use Pydantic models in ${file.path}`,
          'Endpoints use dict parameters. Consider using Pydantic models for automatic validation and documentation.',
          'maintainability',
          'medium',
          'Improves type safety, validation, and API docs',
          'medium',
          [file.path],
          false,
          '1-2 hours'
        )
      );
    }
  }

  private checkErrorHandling(
    file: FileAnalysis,
    opportunities: RefactorOpportunity[]
  ): void {
    const hasRoutes = file.content.includes('@app.') || file.content.includes('@router.');
    const hasTryCatch = file.content.includes('try:') || file.content.includes('except');
    const hasHTTPException = file.content.includes('HTTPException');

    if (hasRoutes && !hasTryCatch && !hasHTTPException) {
      opportunities.push(
        this.createOpportunity(
          `error-handling-${file.path}`,
          `Add error handling in ${file.path}`,
          'Endpoints lack error handling. Consider adding try/except blocks and raising HTTPException for errors.',
          'maintainability',
          'medium',
          'Prevents crashes and provides better error responses',
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
    const isMainFile = file.path.includes('main.py') || file.path.includes('app.py');
    const hasFastAPI = file.content.includes('FastAPI()');
    const hasCORS = file.content.includes('CORSMiddleware');
    const hasWildcardOrigins = file.content.includes("allow_origins=['*']") || file.content.includes('allow_origins=["*"]');

    if (isMainFile && hasFastAPI && (!hasCORS || hasWildcardOrigins)) {
      opportunities.push(
        this.createOpportunity(
          `cors-config-${file.path}`,
          `Review CORS configuration in ${file.path}`,
          hasWildcardOrigins
            ? 'CORS allows all origins (*). Consider restricting to specific domains for security.'
            : 'No CORS middleware detected. Add CORSMiddleware if this API is accessed from browsers.',
          'security',
          hasWildcardOrigins ? 'medium' : 'low',
          'Improves security and proper cross-origin handling',
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
