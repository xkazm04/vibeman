import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as ts from 'typescript';
import { logger } from '@/lib/logger';

/**
 * POST /api/unused-code
 *
 * Analyzes a Next.js project to find unused components
 *
 * Request body:
 * {
 *   projectPath: string;
 *   projectType: string;
 * }
 *
 * Response:
 * {
 *   success: boolean;
 *   unusedFiles: Array<{
 *     filePath: string;
 *     relativePath: string;
 *     exports: string[];
 *     reason: string;
 *   }>;
 *   stats: {
 *     totalFiles: number;
 *     totalExports: number;
 *     unusedExports: number;
 *   };
 *   error?: string;
 * }
 */

interface ExportInfo {
  name: string;
  filePath: string;
  isDefault: boolean;
}

interface ImportInfo {
  imported: string;
  from: string;
  filePath: string;
}

interface UnusedFile {
  filePath: string;
  relativePath: string;
  exports: string[];
  reason: string;
}

// Directories to ignore
const IGNORED_DIRS = [
  'node_modules',
  '.next',
  '.git',
  'dist',
  'build',
  '.vercel',
  '.netlify',
  'coverage',
  '.cache',
  'out',
];

// Known Next.js entry points that should not be marked as unused
// Normalize paths to forward slashes for consistent pattern matching
const NEXTJS_ENTRY_PATTERNS = [
  /\/app\/.*\/(page|layout|loading|error|not-found|template|default|global-error)\.tsx?$/,
  /\/app\/.*\/route\.ts$/,
  /\/app\/.*\/\[[^\]]+\]\.(tsx?|ts)$/, // Dynamic routes like [id].tsx, [slug].tsx
  /\/app\/.*\/\[\.\.\..*\]\.(tsx?|ts)$/, // Catch-all routes like [...slug].tsx
  /\/pages\/.*\.tsx?$/,
  /\/pages\/.*\/\[[^\]]+\]\.tsx?$/, // Dynamic routes in pages directory
  /\/_app\.tsx?$/,
  /\/_document\.tsx?$/,
  /\/middleware\.ts$/,
  /\/instrumentation\.(ts|js)$/,
];

// Directories and file patterns to exclude from unused code analysis
// These are typically utility code, APIs, types, or framework files
const EXCLUDED_PATTERNS = [
  /\/api\//,                    // API routes
  /\/lib\//,                    // Utility libraries
  /\/utils\//,                  // Utility functions
  /\/helpers\//,                // Helper functions
  /\/types\//,                  // Type definitions
  /\/hooks\//,                  // Custom hooks (may be used via dynamic patterns)
  /\/store\//,                  // State management
  /\/stores\//,                 // State management
  /\/config\//,                 // Configuration files
  /\/constants\//,              // Constants
  /\/services\//,               // Service layer
  /\/models\//,                 // Data models
  /\.config\.(ts|js)$/,         // Config files
  /\.types\.ts$/,               // Type definition files
  /\.d\.ts$/,                   // TypeScript declaration files
];

/**
 * Check if file is a Next.js entry point
 * Always normalize path to forward slashes for cross-platform compatibility
 */
function isEntryPoint(filePath: string): boolean {
  const normalizedPath = normalizePath(filePath);
  return NEXTJS_ENTRY_PATTERNS.some(pattern => pattern.test(normalizedPath));
}

/**
 * Check if file should be excluded from unused code analysis
 * Always normalize path to forward slashes for cross-platform compatibility
 */
function shouldExcludeFile(filePath: string): boolean {
  const normalizedPath = normalizePath(filePath);

  // Check against exclusion patterns
  if (EXCLUDED_PATTERNS.some(pattern => pattern.test(normalizedPath))) {
    return true;
  }

  // Only include .tsx files and specific .ts files in UI directories
  // Exclude pure .ts files in root directories (likely utilities)
  if (normalizedPath.endsWith('.ts') && !normalizedPath.endsWith('.tsx')) {
    // Allow .ts files in components/, features/, app/ if they're in subdirectories
    const hasUiPath = /\/(components|features|app)\/.+\//.test(normalizedPath);
    if (!hasUiPath) {
      return true; // Exclude root-level .ts files
    }
  }

  return false;
}

/**
 * Check if file contains React/JSX code (for more accurate component detection)
 */
function containsReactCode(sourceCode: string): boolean {
  // Check for common React patterns
  const reactPatterns = [
    /import\s+.*\s+from\s+['"]react['"]/,          // import from 'react'
    /import\s+React/,                               // import React
    /<[A-Z][a-zA-Z0-9]*[\s>]/,                     // JSX component usage <Component>
    /<\/[A-Z][a-zA-Z0-9]*>/,                       // JSX closing tag </Component>
    /React\.createElement/,                         // React.createElement
    /jsx|tsx/,                                      // JSX pragma
  ];

  return reactPatterns.some(pattern => pattern.test(sourceCode));
}

/**
 * Recursively find all .tsx and .ts files
 */
async function findTsxFiles(
  dir: string,
  baseDir: string,
  files: string[] = []
): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip ignored directories
      if (IGNORED_DIRS.includes(entry.name)) {
        continue;
      }
      await findTsxFiles(fullPath, baseDir, files);
    } else if (entry.isFile()) {
      // Only include .tsx and .ts files (exclude .d.ts)
      if ((entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) && !entry.name.endsWith('.d.ts')) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

/**
 * Parse a TypeScript file and extract exports
 */
function extractExports(filePath: string, sourceCode: string): ExportInfo[] {
  const exports: ExportInfo[] = [];

  try {
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceCode,
      ts.ScriptTarget.Latest,
      true
    );

    function visit(node: ts.Node) {
      // Export declarations: export const Foo = ...
      if (ts.isExportAssignment(node)) {
        if (node.isExportEquals === false) {
          // export default ...
          exports.push({
            name: 'default',
            filePath,
            isDefault: true,
          });
        }
      } else if (ts.isExportDeclaration(node)) {
        // export { Foo, Bar }
        if (node.exportClause && ts.isNamedExports(node.exportClause)) {
          node.exportClause.elements.forEach(element => {
            exports.push({
              name: element.name.text,
              filePath,
              isDefault: false,
            });
          });
        }
      } else if (
        ts.canHaveModifiers(node) &&
        ts.getModifiers(node)?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)
      ) {
        // export const/function/class/interface/type
        const hasDefault = ts.getModifiers(node)?.some(m => m.kind === ts.SyntaxKind.DefaultKeyword);

        if (ts.isFunctionDeclaration(node) && node.name) {
          exports.push({
            name: hasDefault ? 'default' : node.name.text,
            filePath,
            isDefault: hasDefault || false,
          });
        } else if (ts.isClassDeclaration(node) && node.name) {
          exports.push({
            name: hasDefault ? 'default' : node.name.text,
            filePath,
            isDefault: hasDefault || false,
          });
        } else if (ts.isVariableStatement(node)) {
          node.declarationList.declarations.forEach(decl => {
            if (ts.isIdentifier(decl.name)) {
              exports.push({
                name: decl.name.text,
                filePath,
                isDefault: false,
              });
            }
          });
        } else if (ts.isInterfaceDeclaration(node) && node.name) {
          exports.push({
            name: node.name.text,
            filePath,
            isDefault: false,
          });
        } else if (ts.isTypeAliasDeclaration(node) && node.name) {
          exports.push({
            name: node.name.text,
            filePath,
            isDefault: false,
          });
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  } catch (error) {
    logger.error(`Error parsing ${filePath}:`, { error });
  }

  return exports;
}

/**
 * Parse a TypeScript file and extract imports
 */
function extractImports(filePath: string, sourceCode: string): ImportInfo[] {
  const imports: ImportInfo[] = [];

  try {
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceCode,
      ts.ScriptTarget.Latest,
      true
    );

    function visit(node: ts.Node) {
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier;

        if (ts.isStringLiteral(moduleSpecifier)) {
          const from = moduleSpecifier.text;

          // Named imports: import { Foo, Bar } from './module'
          if (node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
            node.importClause.namedBindings.elements.forEach(element => {
              imports.push({
                imported: element.name.text,
                from,
                filePath,
              });
            });
          }

          // Default import: import Foo from './module'
          if (node.importClause?.name) {
            imports.push({
              imported: 'default',
              from,
              filePath,
            });
          }

          // Namespace import: import * as Foo from './module'
          if (node.importClause?.namedBindings && ts.isNamespaceImport(node.importClause.namedBindings)) {
            imports.push({
              imported: '*',
              from,
              filePath,
            });
          }
        }
      } else if (ts.isCallExpression(node)) {
        // Dynamic imports: import('./module')
        const expression = node.expression;
        if (expression.getText() === 'import' && node.arguments.length > 0) {
          const arg = node.arguments[0];
          if (ts.isStringLiteral(arg)) {
            imports.push({
              imported: '*',
              from: arg.text,
              filePath,
            });
          }
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  } catch (error) {
    logger.error(`Error parsing imports in ${filePath}:`, { error });
  }

  return imports;
}

/**
 * Resolve import path to absolute file path
 */
async function resolveImportPath(
  importPath: string,
  fromFile: string,
  projectPath: string,
  tsConfig?: any
): Promise<string | null> {
  try {
    // Handle relative imports
    if (importPath.startsWith('.')) {
      const fromDir = path.dirname(fromFile);
      const resolved = path.resolve(fromDir, importPath);

      // Try with extensions
      for (const ext of ['.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts']) {
        const withExt = resolved + ext;
        try {
          await fs.access(withExt);
          return withExt;
        } catch {
          // File doesn't exist with this extension, try next
        }
      }

      return resolved;
    }

    // Handle alias imports (@/...)
    if (importPath.startsWith('@/')) {
      const withoutAlias = importPath.replace('@/', '');
      const resolved = path.join(projectPath, 'src', withoutAlias);

      // Try with extensions
      for (const ext of ['.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts']) {
        const withExt = resolved + ext;
        try {
          await fs.access(withExt);
          return withExt;
        } catch {
          // File doesn't exist with this extension, try next
        }
      }

      return resolved;
    }

    // Skip external modules (node_modules)
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Normalize path separators for consistent pattern matching
 */
function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

/**
 * Search for component usage in JSX and imports across all files
 */
async function searchComponentUsage(
  componentName: string,
  files: string[],
  excludeFile: string
): Promise<boolean> {
  // Escape special regex characters in component name
  const escaped = componentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Create search patterns for JSX usage
  const jsxPatterns = [
    new RegExp(`<${escaped}[\\s/>]`),                      // <ComponentName> or <ComponentName />
    new RegExp(`<${escaped}\\s`),                           // <ComponentName prop="value">
    new RegExp(`<${escaped}\\>`),                           // <ComponentName></ComponentName>
    new RegExp(`<\\/${escaped}>`),                          // </ComponentName>
  ];

  // Create search patterns for imports
  const importPatterns = [
    new RegExp(`import\\s+${escaped}\\s+from`),           // import ComponentName from
    new RegExp(`import\\s+\\{[^}]*\\b${escaped}\\b[^}]*\\}`), // import { ComponentName } from
    new RegExp(`import\\s*\\*\\s*as\\s+${escaped}`),     // import * as ComponentName
    new RegExp(`import\\s+type\\s+\\{[^}]*\\b${escaped}\\b[^}]*\\}`), // import type { ComponentName }
  ];

  // Also search for dynamic imports
  const dynamicImportPattern = new RegExp(`import\\(['"\`][^'"\`]*${escaped}[^'"\`]*['"\`]\\)`);

  // Search through all files
  for (const file of files) {
    // Don't search in the file itself
    if (file === excludeFile) {
      continue;
    }

    try {
      const content = await fs.readFile(file, 'utf-8');

      // Quick check: does the component name appear at all?
      if (!content.includes(componentName)) {
        continue; // Skip if name doesn't appear anywhere
      }

      // Check for JSX usage
      for (const pattern of jsxPatterns) {
        if (pattern.test(content)) {
          return true; // Found usage
        }
      }

      // Check for imports
      for (const pattern of importPatterns) {
        if (pattern.test(content)) {
          return true; // Found usage
        }
      }

      // Check for dynamic imports
      if (dynamicImportPattern.test(content)) {
        return true; // Found usage
      }
    } catch (error) {
      // Skip files that can't be read
      continue;
    }
  }

  return false; // No usage found
}

/**
 * Simplified analysis - focus on React components in .tsx files only
 * Supports progress callback for real-time updates
 */
async function analyzeUnusedCode(
  projectPath: string,
  onProgress?: (current: number, total: number, currentFile: string) => void
): Promise<{
  success: boolean;
  unusedFiles: UnusedFile[];
  stats: {
    totalFiles: number;
    totalExports: number;
    unusedExports: number;
  };
  error?: string;
}> {
  try {
    logger.info('[UnusedCode] 🔍 Starting simplified component analysis...');

    // Find all TypeScript/TSX files
    const allFiles = await findTsxFiles(projectPath, projectPath);
    logger.info(`[UnusedCode] Found ${allFiles.length} files`);

    // Step 1: Filter to only .tsx files that are likely components
    const componentFiles: Array<{ file: string; componentName: string; exports: string[] }> = [];

    for (const file of allFiles) {
      const normalized = normalizePath(file);

      // Skip entry points (use normalized path)
      if (isEntryPoint(normalized)) {
        continue;
      }

      // Skip excluded paths (use normalized path)
      if (shouldExcludeFile(normalized)) {
        continue;
      }

      // Only process .tsx files
      if (!file.endsWith('.tsx')) {
        continue;
      }

      // Read file and extract exports
      const content = await fs.readFile(file, 'utf-8');

      // Verify it contains React code
      if (!containsReactCode(content)) {
        continue;
      }

      const exports = extractExports(file, content);

      if (exports.length > 0) {
        // Get component name from file name (common pattern)
        const fileName = path.basename(file, '.tsx');

        componentFiles.push({
          file,
          componentName: fileName,
          exports: exports.map(e => e.name),
        });
      }
    }

    logger.info(`[UnusedCode] Analyzing ${componentFiles.length} component files...`);

    // Step 2: Search for usage of each component
    const unusedFiles: UnusedFile[] = [];
    let checkedCount = 0;
    const totalComponents = componentFiles.length;

    for (const component of componentFiles) {
      checkedCount++;

      // Report progress
      if (onProgress) {
        const relativePath = path.relative(projectPath, component.file);
        onProgress(checkedCount, totalComponents, relativePath);
      }

      if (checkedCount % 10 === 0) {
        logger.info(`[UnusedCode] Progress: ${checkedCount}/${totalComponents}`);
      }

      // Search for each export in the component
      let anyExportUsed = false;

      for (const exportName of component.exports) {
        // Skip 'default' exports, search by component name instead
        const searchName = exportName === 'default' ? component.componentName : exportName;

        const isUsed = await searchComponentUsage(searchName, allFiles, component.file);

        if (isUsed) {
          anyExportUsed = true;
          break; // At least one export is used, file is not unused
        }
      }

      // If none of the exports are used, mark file as unused
      if (!anyExportUsed) {
        const relativePath = path.relative(projectPath, component.file);

        unusedFiles.push({
          filePath: component.file,
          relativePath: relativePath.replace(/\\/g, '/'), // Normalize for display
          exports: component.exports,
          reason: 'No JSX usage or imports found',
        });
      }
    }

    logger.info(`[UnusedCode] ✅ Found ${unusedFiles.length} unused component files`);

    return {
      success: true,
      unusedFiles: unusedFiles.sort((a, b) => a.relativePath.localeCompare(b.relativePath)),
      stats: {
        totalFiles: componentFiles.length,
        totalExports: componentFiles.reduce((sum, c) => sum + c.exports.length, 0),
        unusedExports: unusedFiles.reduce((sum, file) => sum + file.exports.length, 0),
      },
    };
  } catch (error) {
    logger.error('[UnusedCode] ❌ Analysis error:', { error });
    return {
      success: false,
      unusedFiles: [],
      stats: {
        totalFiles: 0,
        totalExports: 0,
        unusedExports: 0,
      },
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectPath, projectType, stream } = body;

    if (!projectPath) {
      return NextResponse.json(
        { success: false, error: 'projectPath is required' },
        { status: 400 }
      );
    }

    if (projectType !== 'nextjs') {
      return NextResponse.json(
        { success: false, error: 'Only Next.js projects are supported' },
        { status: 400 }
      );
    }

    // Verify project path exists
    try {
      await fs.access(projectPath);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Project path does not exist' },
        { status: 404 }
      );
    }

    // If streaming is requested, use ReadableStream
    if (stream) {
      const encoder = new TextEncoder();

      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            // Run analysis with progress callback
            const result = await analyzeUnusedCode(projectPath, (current, total, currentFile) => {
              // Send progress update
              const progressData = JSON.stringify({
                type: 'progress',
                current,
                total,
                currentFile,
                progress: Math.round((current / total) * 100),
              }) + '\n';

              controller.enqueue(encoder.encode(progressData));
            });

            // Send final result
            const finalData = JSON.stringify({
              type: 'complete',
              result,
            }) + '\n';

            controller.enqueue(encoder.encode(finalData));
            controller.close();
          } catch (error) {
            const errorData = JSON.stringify({
              type: 'error',
              error: error instanceof Error ? error.message : 'Unknown error',
            }) + '\n';

            controller.enqueue(encoder.encode(errorData));
            controller.close();
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          'Content-Type': 'text/plain',
          'Transfer-Encoding': 'chunked',
        },
      });
    }

    // Non-streaming mode (backward compatibility)
    const result = await analyzeUnusedCode(projectPath);
    return NextResponse.json(result);
  } catch (error) {
    logger.error('[UnusedCode] API error:', { error });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        unusedFiles: [],
        stats: { totalFiles: 0, totalExports: 0, unusedExports: 0 },
      },
      { status: 500 }
    );
  }
}
