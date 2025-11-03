import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { logger } from '@/lib/logger';

export interface FileDependency {
  filePath: string;
  relativePath: string;
  depth: number;
}

export interface DependencyAnalysisResponse {
  success: boolean;
  dependencies?: FileDependency[];
  error?: string;
  totalFiles?: number;
}

/**
 * Extract import statements from JavaScript/TypeScript files using regex
 */
function extractJSImports(fileContent: string): string[] {
  const imports: string[] = [];
  
  // Match ES6 imports: import ... from '...'
  const es6ImportRegex = /import\s+(?:[\w*{}\s,]+\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;
  while ((match = es6ImportRegex.exec(fileContent)) !== null) {
    imports.push(match[1]);
  }
  
  // Match dynamic imports: import('...')
  const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = dynamicImportRegex.exec(fileContent)) !== null) {
    imports.push(match[1]);
  }
  
  // Match CommonJS requires: require('...')
  const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = requireRegex.exec(fileContent)) !== null) {
    imports.push(match[1]);
  }
  
  return imports;
}

/**
 * Extract import statements from Python files using regex
 */
function extractPythonImports(fileContent: string): string[] {
  const imports: string[] = [];
  
  // Match: import module
  // Match: import module as alias
  const importRegex = /^\s*import\s+([\w.]+)(?:\s+as\s+\w+)?/gm;
  let match;
  while ((match = importRegex.exec(fileContent)) !== null) {
    imports.push(match[1]);
  }
  
  // Match: from module import something
  // Match: from .relative import something
  // Match: from ..parent import something
  const fromImportRegex = /^\s*from\s+(\.{0,2}[\w.]*)\s+import\s+/gm;
  while ((match = fromImportRegex.exec(fileContent)) !== null) {
    const modulePath = match[1];
    if (modulePath) {
      imports.push(modulePath);
    }
  }
  
  return imports;
}

/**
 * Extract imports based on file type
 */
function extractImports(fileContent: string, filePath: string): string[] {
  const ext = path.extname(filePath).toLowerCase();
  
  if (ext === '.py') {
    return extractPythonImports(fileContent);
  } else {
    return extractJSImports(fileContent);
  }
}

/**
 * Resolve JavaScript/TypeScript import path to absolute file path
 */
async function resolveJSImportPath(
  importPath: string,
  currentFilePath: string,
  projectPath: string
): Promise<string | null> {
  let resolvedPath: string;
  
  // Handle TypeScript path aliases
  if (importPath.startsWith('@/')) {
    // @/app -> <project-root>/app
    // @/components -> <project-root>/components
    // etc.
    const aliasPath = importPath.substring(2); // Remove '@/'
    resolvedPath = path.join(projectPath, 'src', aliasPath);
  } else if (importPath.startsWith('.') || importPath.startsWith('/')) {
    // Handle relative imports
    const currentDir = path.dirname(currentFilePath);
    resolvedPath = path.resolve(currentDir, importPath);
  } else {
    // Skip node_modules and external packages
    return null;
  }
  
  // Try different extensions
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py'];
  
  // Check if it's already a file with extension
  try {
    const stat = await fs.stat(resolvedPath);
    if (stat.isFile()) {
      return resolvedPath;
    }
  } catch {
    // Continue to try with extensions
  }
  
  // Try adding extensions
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
  
  // Try index files if it's a directory
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

/**
 * Resolve Python import path to absolute file path
 */
async function resolvePythonImportPath(
  importPath: string,
  currentFilePath: string,
  projectPath: string
): Promise<string | null> {
  // Skip standard library and external packages (no dots means top-level package)
  if (!importPath.startsWith('.') && !importPath.includes('/')) {
    // Check if it's a project-level package
    const potentialPath = path.join(projectPath, importPath.replace(/\./g, path.sep) + '.py');
    try {
      await fs.stat(potentialPath);
      return potentialPath;
    } catch {
      // Not a project file, skip (likely stdlib or external package)
      return null;
    }
  }
  
  const currentDir = path.dirname(currentFilePath);
  
  // Handle relative imports (. or ..)
  if (importPath.startsWith('.')) {
    // Count leading dots
    const dotCount = importPath.match(/^\.+/)?.[0].length || 0;
    const modulePath = importPath.substring(dotCount);
    
    // Go up directories based on dot count
    let targetDir = currentDir;
    for (let i = 1; i < dotCount; i++) {
      targetDir = path.dirname(targetDir);
    }
    
    if (modulePath) {
      // from .module import something
      const resolvedPath = path.join(targetDir, modulePath.replace(/\./g, path.sep) + '.py');
      try {
        await fs.stat(resolvedPath);
        return resolvedPath;
      } catch {
        // Try __init__.py in directory
        const initPath = path.join(targetDir, modulePath.replace(/\./g, path.sep), '__init__.py');
        try {
          await fs.stat(initPath);
          return initPath;
        } catch {
          return null;
        }
      }
    } else {
      // from . import something (current package)
      const initPath = path.join(targetDir, '__init__.py');
      try {
        await fs.stat(initPath);
        return initPath;
      } catch {
        return null;
      }
    }
  }
  
  // Handle absolute imports within project
  const resolvedPath = path.join(projectPath, importPath.replace(/\./g, path.sep) + '.py');
  try {
    await fs.stat(resolvedPath);
    return resolvedPath;
  } catch {
    // Try __init__.py in directory
    const initPath = path.join(projectPath, importPath.replace(/\./g, path.sep), '__init__.py');
    try {
      await fs.stat(initPath);
      return initPath;
    } catch {
      return null;
    }
  }
}

/**
 * Resolve import path based on file type
 */
async function resolveImportPath(
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

/**
 * POST /api/file-dependencies
 * Analyzes a file and returns all its dependencies (imports)
 *
 * Request body:
 * {
 *   filePath: string;        // Absolute path to the file to analyze
 *   projectPath: string;     // Absolute path to the project root
 *   maxDepth?: number;       // Maximum dependency depth (default: 2)
 *   includeNodeModules?: boolean; // Include node_modules dependencies (default: false)
 * }
 */
export async function POST(request: NextRequest) {
  let body;

  try {
    // Parse request body with better error handling
    const rawBody = await request.text();

    try {
      body = JSON.parse(rawBody);
    } catch (parseError) {
      logger.error('JSON parse error in file-dependencies:', parseError);
      logger.error('Raw request body:', rawBody.substring(0, 200)); // Log first 200 chars

      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body. Check that file paths are properly escaped.',
          details: parseError instanceof Error ? parseError.message : 'JSON parse error'
        },
        { status: 400 }
      );
    }

    const { filePath, projectPath, maxDepth = 3 } = body;

    if (!filePath || !projectPath) {
      return NextResponse.json(
        { success: false, error: 'filePath and projectPath are required' },
        { status: 400 }
      );
    }

    // Verify the file exists
    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json(
        { success: false, error: 'File does not exist' },
        { status: 404 }
      );
    }

    // Verify the project path exists
    try {
      await fs.access(projectPath);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Project path does not exist' },
        { status: 404 }
      );
    }

    // Collect all dependencies recursively with depth tracking
    const dependencies = new Map<string, FileDependency>();
    const visited = new Set<string>();

    const analyzeDependencies = async (currentFilePath: string, depth: number) => {
      // Stop if max depth reached or already visited
      if (depth > maxDepth || visited.has(currentFilePath)) {
        return;
      }

      visited.add(currentFilePath);

      // Read file content
      let content: string;
      try {
        content = await fs.readFile(currentFilePath, 'utf-8');
      } catch {
        logger.warn(`Failed to read file: ${currentFilePath}`);
        return;
      }

      // Extract imports
      const imports = extractImports(content, currentFilePath);

      // Resolve and process each import
      for (const importPath of imports) {
        const resolvedPath = await resolveImportPath(importPath, currentFilePath, projectPath);
        
        if (!resolvedPath) {
          continue; // Skip unresolved or node_modules
        }

        // Get relative path from project root
        const relativePath = path.relative(projectPath, resolvedPath).replace(/\\/g, '/');

        // Skip if outside project
        if (relativePath.startsWith('..')) {
          continue;
        }

        // Add to dependencies if not already there or if this is a shorter path
        if (!dependencies.has(relativePath) || dependencies.get(relativePath)!.depth > depth) {
          dependencies.set(relativePath, {
            filePath: resolvedPath,
            relativePath: relativePath,
            depth: depth,
          });
        }

        // Recursively analyze dependencies
        await analyzeDependencies(resolvedPath, depth + 1);
      }
    };

    // Start analyzing from the target file
    await analyzeDependencies(filePath, 1);

    // Convert to array and sort by depth, then by path
    const dependenciesArray = Array.from(dependencies.values()).sort((a, b) => {
      if (a.depth !== b.depth) return a.depth - b.depth;
      return a.relativePath.localeCompare(b.relativePath);
    });

    return NextResponse.json({
      success: true,
      dependencies: dependenciesArray,
      totalFiles: dependenciesArray.length,
    } as DependencyAnalysisResponse);

  } catch (error) {
    logger.error('File dependency analysis error:', { error });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze file dependencies',
      } as DependencyAnalysisResponse,
      { status: 500 }
    );
  }
}
