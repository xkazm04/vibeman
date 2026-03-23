/**
 * FastAPI Scan Strategy
 *
 * Uses composable PatternDetector pipeline for declarative detector registration.
 * Each detector returns findings; the base class handles batching, group filtering, and progress.
 */

import { RefactorScanStrategy, detector, type PatternDetector } from '../ScanStrategy';
import type { FileAnalysis } from '@/app/features/RefactorWizard/lib/types';
import type { RefactorOpportunity } from '@/stores/refactorStore';

// ========== Detector functions (extracted from former private methods) ==========

function checkLargeFile(file: FileAnalysis): RefactorOpportunity[] {
  const lines = file.content.split('\n').length;
  if (lines <= 200) return [];

  let severity: RefactorOpportunity['severity'] = 'low';
  let effort: RefactorOpportunity['effort'] = 'medium';
  let estimatedTime = '1-2 hours';

  if (lines > 500) {
    severity = 'high';
    effort = 'high';
    estimatedTime = '3-5 hours';
  } else if (lines > 350) {
    severity = 'medium';
    effort = 'high';
    estimatedTime = '2-4 hours';
  }

  return [{
    id: `long-file-${file.path}`,
    title: `Large file detected: ${file.path}`,
    description: `This file has ${lines} lines. Consider splitting it into smaller modules. Target: Keep files under 200 lines for better maintainability.`,
    category: 'maintainability',
    severity,
    impact: 'Improves code organization, readability, and maintainability',
    effort,
    files: [file.path],
    autoFixAvailable: false,
    estimatedTime,
  }];
}

function checkLongFunctions(file: FileAnalysis): RefactorOpportunity[] {
  const lines = file.content.split('\n');
  const longFunctions: number[] = [];
  let currentFunctionStart = -1;
  let currentIndent = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

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
    else if (currentFunctionStart !== -1 && trimmed && !line.startsWith(' '.repeat(currentIndent + 1))) {
      const functionLength = i - currentFunctionStart;
      if (functionLength > 50) {
        longFunctions.push(currentFunctionStart + 1);
      }
      currentFunctionStart = -1;
    }
  }

  if (longFunctions.length === 0) return [];

  return [{
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
  }];
}

function checkPrintStatements(file: FileAnalysis): RefactorOpportunity[] {
  const printStatements: number[] = [];
  const lines = file.content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    if (/\bprint\s*\(/.test(lines[i])) {
      printStatements.push(i + 1);
    }
  }

  if (printStatements.length === 0) return [];

  return [{
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
  }];
}

function checkTypeAnnotations(file: FileAnalysis): RefactorOpportunity[] {
  const lines = file.content.split('\n');
  const missingAnnotations: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if ((line.startsWith('def ') || line.startsWith('async def ')) && !line.includes('->')) {
      if (!line.includes('def __')) {
        missingAnnotations.push(i + 1);
      }
    }
  }

  if (missingAnnotations.length === 0) return [];

  return [{
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
  }];
}

function checkUnusedImports(file: FileAnalysis): RefactorOpportunity[] {
  const lines = file.content.split('\n');
  const imports = new Map<string, number>();
  const unusedImports: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const importMatch = line.match(/^(?:from .+ )?import (.+)/);
    if (importMatch) {
      const importedNames = importMatch[1].split(',').map(n => n.trim().split(' as ')[0]);
      importedNames.forEach(name => imports.set(name, i + 1));
    }
  }

  const restOfFile = lines.slice(10).join('\n');
  for (const [name, lineNum] of imports) {
    if (!restOfFile.includes(name)) {
      unusedImports.push(lineNum);
    }
  }

  if (unusedImports.length === 0) return [];

  return [{
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
  }];
}

function checkDependencyInjection(file: FileAnalysis): RefactorOpportunity[] {
  const hasRoutes = file.content.includes('@app.') || file.content.includes('@router.');
  const hasDuplicateLogic = file.content.split('Session()').length > 3;

  if (hasRoutes && hasDuplicateLogic && !file.content.includes('Depends(')) {
    return [{
      id: `dependency-injection-${file.path}`,
      title: `Use dependency injection in ${file.path}`,
      description: 'Multiple endpoints have repeated logic. Consider using FastAPI Depends() for shared dependencies.',
      category: 'architecture',
      severity: 'medium',
      impact: 'Reduces code duplication and improves testability',
      effort: 'medium',
      files: [file.path],
      autoFixAvailable: false,
      estimatedTime: '1-2 hours',
    }];
  }

  return [];
}

function checkAsyncEndpoints(file: FileAnalysis): RefactorOpportunity[] {
  const hasRoutes = file.content.includes('@app.') || file.content.includes('@router.');
  const hasSyncDef = /\n\s*def\s+\w+\s*\([^)]*\)\s*:/g.test(file.content);
  const hasAsyncDef = /\n\s*async\s+def\s+\w+\s*\([^)]*\)\s*:/g.test(file.content);

  if (hasRoutes && hasSyncDef && !hasAsyncDef) {
    return [{
      id: `async-endpoints-${file.path}`,
      title: `Consider async endpoints in ${file.path}`,
      description: 'Route handlers are synchronous. Consider using async def for better performance with I/O operations.',
      category: 'performance',
      severity: 'low',
      impact: 'Improves concurrency and throughput',
      effort: 'low',
      files: [file.path],
      autoFixAvailable: false,
      estimatedTime: '30-60 minutes',
    }];
  }

  return [];
}

function checkPydanticModels(file: FileAnalysis): RefactorOpportunity[] {
  const hasRoutes = file.content.includes('@app.') || file.content.includes('@router.');
  const hasDictParams = /def\s+\w+\([^)]*:\s*dict/.test(file.content);
  const hasPydantic = file.content.includes('from pydantic import') || file.content.includes('BaseModel');

  if (hasRoutes && hasDictParams && !hasPydantic) {
    return [{
      id: `pydantic-models-${file.path}`,
      title: `Use Pydantic models in ${file.path}`,
      description: 'Endpoints use dict parameters. Consider using Pydantic models for automatic validation and documentation.',
      category: 'maintainability',
      severity: 'medium',
      impact: 'Improves type safety, validation, and API docs',
      effort: 'medium',
      files: [file.path],
      autoFixAvailable: false,
      estimatedTime: '1-2 hours',
    }];
  }

  return [];
}

function checkErrorHandling(file: FileAnalysis): RefactorOpportunity[] {
  const hasRoutes = file.content.includes('@app.') || file.content.includes('@router.');
  const hasTryCatch = file.content.includes('try:') || file.content.includes('except');
  const hasHTTPException = file.content.includes('HTTPException');

  if (hasRoutes && !hasTryCatch && !hasHTTPException) {
    return [{
      id: `error-handling-${file.path}`,
      title: `Add error handling in ${file.path}`,
      description: 'Endpoints lack error handling. Consider adding try/except blocks and raising HTTPException for errors.',
      category: 'maintainability',
      severity: 'medium',
      impact: 'Prevents crashes and provides better error responses',
      effort: 'medium',
      files: [file.path],
      autoFixAvailable: false,
      estimatedTime: '1-2 hours',
    }];
  }

  return [];
}

function checkCORSConfiguration(file: FileAnalysis): RefactorOpportunity[] {
  const isMainFile = file.path.includes('main.py') || file.path.includes('app.py');
  const hasFastAPI = file.content.includes('FastAPI()');
  const hasCORS = file.content.includes('CORSMiddleware');
  const hasWildcardOrigins = file.content.includes("allow_origins=['*']") || file.content.includes('allow_origins=["*"]');

  if (isMainFile && hasFastAPI && (!hasCORS || hasWildcardOrigins)) {
    return [{
      id: `cors-config-${file.path}`,
      title: `Review CORS configuration in ${file.path}`,
      description: hasWildcardOrigins
        ? 'CORS allows all origins (*). Consider restricting to specific domains for security.'
        : 'No CORS middleware detected. Add CORSMiddleware if this API is accessed from browsers.',
      category: 'security',
      severity: hasWildcardOrigins ? 'medium' : 'low',
      impact: 'Improves security and proper cross-origin handling',
      effort: 'low',
      files: [file.path],
      autoFixAvailable: false,
      estimatedTime: '15-30 minutes',
    }];
  }

  return [];
}

// ========== Strategy ==========

export class FastAPIScanStrategy extends RefactorScanStrategy {
  readonly name = 'FastAPI Scanner';
  readonly techStack = 'fastapi' as const;

  /** Declarative list of all detectors with their group assignments */
  private readonly detectors: PatternDetector[] = [
    // Maintainability checks
    detector('maintainability', checkLargeFile),
    detector('maintainability', checkLongFunctions),
    detector('maintainability', checkPydanticModels),
    detector('maintainability', checkErrorHandling),
    // Code Quality checks
    detector('code-quality', checkPrintStatements),
    detector('code-quality', checkTypeAnnotations),
    detector('code-quality', checkUnusedImports),
    // Architecture checks
    detector('architecture', checkDependencyInjection),
    // Performance checks
    detector('performance', checkAsyncEndpoints),
    // Security checks
    detector('security', checkCORSConfiguration),
  ];

  getScanPatterns(): string[] {
    return [
      '**/*.py',
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
      'security',
      'architecture',
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
    if (projectType === 'fastapi') {
      return true;
    }

    try {
      const { promises: fs } = await import('fs');
      const path = await import('path');

      const requirementsPath = path.join(projectPath, 'requirements.txt');
      if (await this.fileExists(requirementsPath)) {
        const requirements = await fs.readFile(requirementsPath, 'utf-8');
        if (requirements.toLowerCase().includes('fastapi')) {
          return true;
        }
      }

      const pyprojectPath = path.join(projectPath, 'pyproject.toml');
      if (await this.fileExists(pyprojectPath)) {
        const pyproject = await fs.readFile(pyprojectPath, 'utf-8');
        if (pyproject.toLowerCase().includes('fastapi')) {
          return true;
        }
      }

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
}
