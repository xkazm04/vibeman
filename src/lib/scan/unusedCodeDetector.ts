/**
 * UnusedCodeDetector
 *
 * AST-based analysis to find unused React components in a Next.js project.
 * Uses TypeScript compiler API for accurate export/import extraction and
 * regex-based JSX usage search. Extracted from /api/unused-code route.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as ts from 'typescript';
import { logger } from '@/lib/logger';

// --- Types ---

export interface ExportInfo {
  name: string;
  filePath: string;
  isDefault: boolean;
}

export interface ImportInfo {
  imported: string;
  from: string;
  filePath: string;
}

export interface UnusedFile {
  filePath: string;
  relativePath: string;
  exports: string[];
  reason: string;
}

export interface UnusedCodeResult {
  success: boolean;
  unusedFiles: UnusedFile[];
  stats: {
    totalFiles: number;
    totalExports: number;
    unusedExports: number;
  };
  error?: string;
}

// --- Constants ---

const IGNORED_DIRS = [
  'node_modules', '.next', '.git', 'dist', 'build',
  '.vercel', '.netlify', 'coverage', '.cache', 'out',
];

const NEXTJS_ENTRY_PATTERNS = [
  /\/app\/.*\/(page|layout|loading|error|not-found|template|default|global-error)\.tsx?$/,
  /\/app\/.*\/route\.ts$/,
  /\/app\/.*\/\[[^\]]+\]\.(tsx?|ts)$/,
  /\/app\/.*\/\[\.\.\..*\]\.(tsx?|ts)$/,
  /\/pages\/.*\.tsx?$/,
  /\/pages\/.*\/\[[^\]]+\]\.tsx?$/,
  /\/_app\.tsx?$/,
  /\/_document\.tsx?$/,
  /\/middleware\.ts$/,
  /\/instrumentation\.(ts|js)$/,
];

const EXCLUDED_PATTERNS = [
  /\/api\//,
  /\/lib\//,
  /\/utils\//,
  /\/helpers\//,
  /\/types\//,
  /\/hooks\//,
  /\/store\//,
  /\/stores\//,
  /\/config\//,
  /\/constants\//,
  /\/services\//,
  /\/models\//,
  /\.config\.(ts|js)$/,
  /\.types\.ts$/,
  /\.d\.ts$/,
];

// --- Helpers ---

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

function isEntryPoint(filePath: string): boolean {
  const normalizedPath = normalizePath(filePath);
  return NEXTJS_ENTRY_PATTERNS.some(pattern => pattern.test(normalizedPath));
}

function shouldExcludeFile(filePath: string): boolean {
  const normalizedPath = normalizePath(filePath);

  if (EXCLUDED_PATTERNS.some(pattern => pattern.test(normalizedPath))) {
    return true;
  }

  if (normalizedPath.endsWith('.ts') && !normalizedPath.endsWith('.tsx')) {
    const hasUiPath = /\/(components|features|app)\/.+\//.test(normalizedPath);
    if (!hasUiPath) {
      return true;
    }
  }

  return false;
}

function containsReactCode(sourceCode: string): boolean {
  const reactPatterns = [
    /import\s+.*\s+from\s+['"]react['"]/,
    /import\s+React/,
    /<[A-Z][a-zA-Z0-9]*[\s>]/,
    /<\/[A-Z][a-zA-Z0-9]*>/,
    /React\.createElement/,
    /jsx|tsx/,
  ];

  return reactPatterns.some(pattern => pattern.test(sourceCode));
}

// --- AST parsing ---

export async function findTsxFiles(
  dir: string,
  baseDir: string,
  files: string[] = []
): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (IGNORED_DIRS.includes(entry.name)) {
        continue;
      }
      await findTsxFiles(fullPath, baseDir, files);
    } else if (entry.isFile()) {
      if ((entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) && !entry.name.endsWith('.d.ts')) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

export function extractExports(filePath: string, sourceCode: string): ExportInfo[] {
  const exports: ExportInfo[] = [];

  try {
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceCode,
      ts.ScriptTarget.Latest,
      true
    );

    function visit(node: ts.Node) {
      if (ts.isExportAssignment(node)) {
        if (node.isExportEquals === false) {
          exports.push({ name: 'default', filePath, isDefault: true });
        }
      } else if (ts.isExportDeclaration(node)) {
        if (node.exportClause && ts.isNamedExports(node.exportClause)) {
          node.exportClause.elements.forEach(element => {
            exports.push({ name: element.name.text, filePath, isDefault: false });
          });
        }
      } else if (
        ts.canHaveModifiers(node) &&
        ts.getModifiers(node)?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)
      ) {
        const hasDefault = ts.getModifiers(node)?.some(m => m.kind === ts.SyntaxKind.DefaultKeyword);

        if (ts.isFunctionDeclaration(node) && node.name) {
          exports.push({ name: hasDefault ? 'default' : node.name.text, filePath, isDefault: hasDefault || false });
        } else if (ts.isClassDeclaration(node) && node.name) {
          exports.push({ name: hasDefault ? 'default' : node.name.text, filePath, isDefault: hasDefault || false });
        } else if (ts.isVariableStatement(node)) {
          node.declarationList.declarations.forEach(decl => {
            if (ts.isIdentifier(decl.name)) {
              exports.push({ name: decl.name.text, filePath, isDefault: false });
            }
          });
        } else if (ts.isInterfaceDeclaration(node) && node.name) {
          exports.push({ name: node.name.text, filePath, isDefault: false });
        } else if (ts.isTypeAliasDeclaration(node) && node.name) {
          exports.push({ name: node.name.text, filePath, isDefault: false });
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

export function extractImports(filePath: string, sourceCode: string): ImportInfo[] {
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

          if (node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
            node.importClause.namedBindings.elements.forEach(element => {
              imports.push({ imported: element.name.text, from, filePath });
            });
          }

          if (node.importClause?.name) {
            imports.push({ imported: 'default', from, filePath });
          }

          if (node.importClause?.namedBindings && ts.isNamespaceImport(node.importClause.namedBindings)) {
            imports.push({ imported: '*', from, filePath });
          }
        }
      } else if (ts.isCallExpression(node)) {
        const expression = node.expression;
        if (expression.getText() === 'import' && node.arguments.length > 0) {
          const arg = node.arguments[0];
          if (ts.isStringLiteral(arg)) {
            imports.push({ imported: '*', from: arg.text, filePath });
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

// --- Usage search ---

async function searchComponentUsage(
  componentName: string,
  files: string[],
  excludeFile: string
): Promise<boolean> {
  const escaped = componentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const jsxPatterns = [
    new RegExp(`<${escaped}[\\s/>]`),
    new RegExp(`<${escaped}\\s`),
    new RegExp(`<${escaped}\\>`),
    new RegExp(`<\\/${escaped}>`),
  ];

  const importPatterns = [
    new RegExp(`import\\s+${escaped}\\s+from`),
    new RegExp(`import\\s+\\{[^}]*\\b${escaped}\\b[^}]*\\}`),
    new RegExp(`import\\s*\\*\\s*as\\s+${escaped}`),
    new RegExp(`import\\s+type\\s+\\{[^}]*\\b${escaped}\\b[^}]*\\}`),
  ];

  const dynamicImportPattern = new RegExp(`import\\(['"\`][^'"\`]*${escaped}[^'"\`]*['"\`]\\)`);

  for (const file of files) {
    if (file === excludeFile) {
      continue;
    }

    try {
      const content = await fs.readFile(file, 'utf-8');

      if (!content.includes(componentName)) {
        continue;
      }

      for (const pattern of jsxPatterns) {
        if (pattern.test(content)) {
          return true;
        }
      }

      for (const pattern of importPatterns) {
        if (pattern.test(content)) {
          return true;
        }
      }

      if (dynamicImportPattern.test(content)) {
        return true;
      }
    } catch {
      continue;
    }
  }

  return false;
}

// --- Main analysis ---

export async function analyzeUnusedCode(
  projectPath: string,
  onProgress?: (current: number, total: number, currentFile: string) => void
): Promise<UnusedCodeResult> {
  try {
    logger.info('[UnusedCode] Starting simplified component analysis...');

    const allFiles = await findTsxFiles(projectPath, projectPath);
    logger.info(`[UnusedCode] Found ${allFiles.length} files`);

    const componentFiles: Array<{ file: string; componentName: string; exports: string[] }> = [];

    for (const file of allFiles) {
      const normalized = normalizePath(file);

      if (isEntryPoint(normalized)) continue;
      if (shouldExcludeFile(normalized)) continue;
      if (!file.endsWith('.tsx')) continue;

      const content = await fs.readFile(file, 'utf-8');

      if (!containsReactCode(content)) continue;

      const exports = extractExports(file, content);

      if (exports.length > 0) {
        const fileName = path.basename(file, '.tsx');

        componentFiles.push({
          file,
          componentName: fileName,
          exports: exports.map(e => e.name),
        });
      }
    }

    logger.info(`[UnusedCode] Analyzing ${componentFiles.length} component files...`);

    const unusedFiles: UnusedFile[] = [];
    let checkedCount = 0;
    const totalComponents = componentFiles.length;

    for (const component of componentFiles) {
      checkedCount++;

      if (onProgress) {
        const relativePath = path.relative(projectPath, component.file);
        onProgress(checkedCount, totalComponents, relativePath);
      }

      if (checkedCount % 10 === 0) {
        logger.info(`[UnusedCode] Progress: ${checkedCount}/${totalComponents}`);
      }

      let anyExportUsed = false;

      for (const exportName of component.exports) {
        const searchName = exportName === 'default' ? component.componentName : exportName;

        const isUsed = await searchComponentUsage(searchName, allFiles, component.file);

        if (isUsed) {
          anyExportUsed = true;
          break;
        }
      }

      if (!anyExportUsed) {
        const relativePath = path.relative(projectPath, component.file);

        unusedFiles.push({
          filePath: component.file,
          relativePath: relativePath.replace(/\\/g, '/'),
          exports: component.exports,
          reason: 'No JSX usage or imports found',
        });
      }
    }

    logger.info(`[UnusedCode] Found ${unusedFiles.length} unused component files`);

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
    logger.error('[UnusedCode] Analysis error:', { error });
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
