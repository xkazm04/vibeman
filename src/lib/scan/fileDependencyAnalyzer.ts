/**
 * FileDependencyAnalyzer
 *
 * Analyzes file import graphs for JS/TS/Python projects. Extracts imports
 * via regex, resolves paths across alias/relative patterns, and traverses
 * dependency trees to a configurable depth. Extracted from /api/file-dependencies route.
 */

import path from 'path';
import fs from 'fs/promises';
import { logger } from '@/lib/logger';

// --- Types ---

export interface FileDependency {
  filePath: string;
  relativePath: string;
  depth: number;
}

export interface DependencyAnalysisResult {
  success: boolean;
  dependencies: FileDependency[];
  totalFiles: number;
  error?: string;
}

// --- Import extraction ---

export function extractJSImports(fileContent: string): string[] {
  const imports: string[] = [];

  const es6ImportRegex = /import\s+(?:[\w*{}\s,]+\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;
  while ((match = es6ImportRegex.exec(fileContent)) !== null) {
    imports.push(match[1]);
  }

  const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = dynamicImportRegex.exec(fileContent)) !== null) {
    imports.push(match[1]);
  }

  const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = requireRegex.exec(fileContent)) !== null) {
    imports.push(match[1]);
  }

  return imports;
}

export function extractPythonImports(fileContent: string): string[] {
  const imports: string[] = [];

  const importRegex = /^\s*import\s+([\w.]+)(?:\s+as\s+\w+)?/gm;
  let match;
  while ((match = importRegex.exec(fileContent)) !== null) {
    imports.push(match[1]);
  }

  const fromImportRegex = /^\s*from\s+(\.{0,2}[\w.]*)\s+import\s+/gm;
  while ((match = fromImportRegex.exec(fileContent)) !== null) {
    const modulePath = match[1];
    if (modulePath) {
      imports.push(modulePath);
    }
  }

  return imports;
}

export function extractImports(fileContent: string, filePath: string): string[] {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.py') {
    return extractPythonImports(fileContent);
  } else {
    return extractJSImports(fileContent);
  }
}

// --- Path resolution ---

async function resolveJSImportPath(
  importPath: string,
  currentFilePath: string,
  projectPath: string
): Promise<string | null> {
  let resolvedPath: string;

  if (importPath.startsWith('@/')) {
    const aliasPath = importPath.substring(2);
    resolvedPath = path.join(projectPath, 'src', aliasPath);
  } else if (importPath.startsWith('.') || importPath.startsWith('/')) {
    const currentDir = path.dirname(currentFilePath);
    resolvedPath = path.resolve(currentDir, importPath);
  } else {
    return null;
  }

  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py'];

  try {
    const stat = await fs.stat(resolvedPath);
    if (stat.isFile()) {
      return resolvedPath;
    }
  } catch {
    // Continue to try with extensions
  }

  for (const ext of extensions) {
    const pathWithExt = resolvedPath + ext;
    try {
      const stat = await fs.stat(pathWithExt);
      if (stat.isFile()) {
        return pathWithExt;
      }
    } catch {
      // Continue
    }
  }

  try {
    const stat = await fs.stat(resolvedPath);
    if (stat.isDirectory()) {
      for (const ext of extensions) {
        const indexPath = path.join(resolvedPath, `index${ext}`);
        try {
          const indexStat = await fs.stat(indexPath);
          if (indexStat.isFile()) {
            return indexPath;
          }
        } catch {
          // Continue
        }
      }
    }
  } catch {
    // Path doesn't exist
  }

  return null;
}

async function resolvePythonImportPath(
  importPath: string,
  currentFilePath: string,
  projectPath: string
): Promise<string | null> {
  if (!importPath.startsWith('.') && !importPath.includes('/')) {
    const potentialPath = path.join(projectPath, importPath.replace(/\./g, path.sep) + '.py');
    try {
      await fs.stat(potentialPath);
      return potentialPath;
    } catch {
      return null;
    }
  }

  const currentDir = path.dirname(currentFilePath);

  if (importPath.startsWith('.')) {
    const dotCount = importPath.match(/^\.+/)?.[0].length || 0;
    const modulePath = importPath.substring(dotCount);

    let targetDir = currentDir;
    for (let i = 1; i < dotCount; i++) {
      targetDir = path.dirname(targetDir);
    }

    if (modulePath) {
      const resolvedPath = path.join(targetDir, modulePath.replace(/\./g, path.sep) + '.py');
      try {
        await fs.stat(resolvedPath);
        return resolvedPath;
      } catch {
        const initPath = path.join(targetDir, modulePath.replace(/\./g, path.sep), '__init__.py');
        try {
          await fs.stat(initPath);
          return initPath;
        } catch {
          return null;
        }
      }
    } else {
      const initPath = path.join(targetDir, '__init__.py');
      try {
        await fs.stat(initPath);
        return initPath;
      } catch {
        return null;
      }
    }
  }

  const resolvedPath = path.join(projectPath, importPath.replace(/\./g, path.sep) + '.py');
  try {
    await fs.stat(resolvedPath);
    return resolvedPath;
  } catch {
    const initPath = path.join(projectPath, importPath.replace(/\./g, path.sep), '__init__.py');
    try {
      await fs.stat(initPath);
      return initPath;
    } catch {
      return null;
    }
  }
}

export async function resolveImportPath(
  importPath: string,
  currentFilePath: string,
  projectPath: string
): Promise<string | null> {
  const ext = path.extname(currentFilePath).toLowerCase();

  if (ext === '.py') {
    return resolvePythonImportPath(importPath, currentFilePath, projectPath);
  } else {
    return resolveJSImportPath(importPath, currentFilePath, projectPath);
  }
}

// --- Main analysis ---

export async function analyzeDependencies(
  filePath: string,
  projectPath: string,
  maxDepth: number = 3
): Promise<DependencyAnalysisResult> {
  try {
    const dependencies = new Map<string, FileDependency>();
    const visited = new Set<string>();

    const traverse = async (currentFilePath: string, depth: number) => {
      if (depth > maxDepth || visited.has(currentFilePath)) {
        return;
      }

      visited.add(currentFilePath);

      let content: string;
      try {
        content = await fs.readFile(currentFilePath, 'utf-8');
      } catch {
        logger.warn(`Failed to read file: ${currentFilePath}`);
        return;
      }

      const imports = extractImports(content, currentFilePath);

      for (const importPath of imports) {
        const resolvedPath = await resolveImportPath(importPath, currentFilePath, projectPath);

        if (!resolvedPath) {
          continue;
        }

        const relativePath = path.relative(projectPath, resolvedPath).replace(/\\/g, '/');

        if (relativePath.startsWith('..')) {
          continue;
        }

        if (!dependencies.has(relativePath) || dependencies.get(relativePath)!.depth > depth) {
          dependencies.set(relativePath, {
            filePath: resolvedPath,
            relativePath: relativePath,
            depth: depth,
          });
        }

        await traverse(resolvedPath, depth + 1);
      }
    };

    await traverse(filePath, 1);

    const dependenciesArray = Array.from(dependencies.values()).sort((a, b) => {
      if (a.depth !== b.depth) return a.depth - b.depth;
      return a.relativePath.localeCompare(b.relativePath);
    });

    return {
      success: true,
      dependencies: dependenciesArray,
      totalFiles: dependenciesArray.length,
    };
  } catch (error) {
    logger.error('File dependency analysis error:', { error });
    return {
      success: false,
      dependencies: [],
      totalFiles: 0,
      error: error instanceof Error ? error.message : 'Failed to analyze file dependencies',
    };
  }
}
