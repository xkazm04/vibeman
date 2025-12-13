/**
 * Structural Context Scanner
 *
 * JavaScript-based context detection that uses folder structure and file dependencies
 * to automatically identify feature contexts without LLM assistance.
 *
 * This is a simplified, deterministic approach that:
 * 1. Scans project folder structure
 * 2. Identifies features based on directory patterns
 * 3. Uses file-dependencies API to group related files
 * 4. Generates context objects (without saving to DB)
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '@/lib/logger';

export interface StructuralContext {
  name: string;
  description: string;
  filePaths: string[];
  source: {
    type: 'page' | 'subfeature' | 'api' | 'library' | 'feature';
    path: string;
  };
  fileCount: number;
  sizeCategory: 'small' | 'ideal' | 'large' | 'too-large';
}

export interface StructuralScanResult {
  success: boolean;
  contexts?: StructuralContext[];
  stats?: {
    totalContexts: number;
    totalFiles: number;
    byType: Record<string, number>;
    sizeDistribution: Record<string, number>;
  };
  warnings?: string[];
  error?: string;
}

/**
 * Scan a Next.js project structure and identify contexts
 */
export async function scanProjectStructure(
  projectPath: string,
  projectType: 'nextjs' | 'fastapi' | 'other' = 'nextjs'
): Promise<StructuralScanResult> {
  const contexts: StructuralContext[] = [];
  const warnings: string[] = [];

  try {
    // Only support Next.js for now
    if (projectType !== 'nextjs') {
      throw new Error(`Project type "${projectType}" not yet supported for structural scanning`);
    }

    // Scan different structural areas
    const pageContexts = await scanPageFolders(projectPath);
    const subfeatureContexts = await scanSubfeatures(projectPath);
    const apiContexts = await scanApiFolders(projectPath);
    const libraryContexts = await scanLibraryFolders(projectPath);

    contexts.push(...pageContexts);
    contexts.push(...subfeatureContexts);
    contexts.push(...apiContexts);
    contexts.push(...libraryContexts);

    // Validate and categorize contexts
    for (const context of contexts) {
      const sizeCategory = categorizeContextSize(context.fileCount);
      context.sizeCategory = sizeCategory;

      if (sizeCategory === 'small') {
        warnings.push(`Context "${context.name}" has only ${context.fileCount} files (recommended: 10-20)`);
      } else if (sizeCategory === 'too-large') {
        warnings.push(`Context "${context.name}" has ${context.fileCount} files (recommended: 10-20, max: 25)`);
      }
    }

    // Calculate stats
    const stats = {
      totalContexts: contexts.length,
      totalFiles: contexts.reduce((sum, ctx) => sum + ctx.fileCount, 0),
      byType: contexts.reduce((acc, ctx) => {
        acc[ctx.source.type] = (acc[ctx.source.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      sizeDistribution: contexts.reduce((acc, ctx) => {
        acc[ctx.sizeCategory] = (acc[ctx.sizeCategory] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    return {
      success: true,
      contexts,
      stats,
      warnings: warnings.length > 0 ? warnings : undefined,
    };

  } catch (error) {
    logger.error('Structural scan error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during structural scan',
    };
  }
}

/**
 * Helper to create a context object
 */
function createContext(
  name: string,
  description: string,
  files: string[],
  sourceType: 'page' | 'subfeature' | 'api' | 'library' | 'feature',
  sourcePath: string
): StructuralContext {
  return {
    name,
    description,
    filePaths: files,
    source: {
      type: sourceType,
      path: sourcePath,
    },
    fileCount: files.length,
    sizeCategory: categorizeContextSize(files.length),
  };
}

/**
 * Scan *-page folders in src/app
 */
async function scanPageFolders(projectPath: string): Promise<StructuralContext[]> {
  const contexts: StructuralContext[] = [];
  const appPath = path.join(projectPath, 'src', 'app');

  try {
    const entries = await fs.readdir(appPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.endsWith('-page')) {
        const folderPath = path.join(appPath, entry.name);
        const files = await getAllFilesInDirectory(folderPath, projectPath);

        if (files.length > 0) {
          const contextName = formatPageName(entry.name);
          const context = createContext(
            contextName,
            `User interface and logic for the ${contextName}`,
            files,
            'page',
            path.relative(projectPath, folderPath)
          );
          contexts.push(context);
        }
      }
    }
  } catch (error) {
    logger.warn('Could not scan page folders:', error);
  }

  return contexts;
}

/**
 * Scan sub_* folders in src/app/features
 */
async function scanSubfeatures(projectPath: string): Promise<StructuralContext[]> {
  const contexts: StructuralContext[] = [];
  const featuresPath = path.join(projectPath, 'src', 'app', 'features');

  try {
    const entries = await fs.readdir(featuresPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith('sub_')) {
        const folderPath = path.join(featuresPath, entry.name);
        const files = await getAllFilesInDirectory(folderPath, projectPath);

        if (files.length > 0) {
          const contextName = formatSubfeatureName(entry.name);
          const context = createContext(
            contextName,
            `Subfeature module providing ${contextName.toLowerCase()} functionality`,
            files,
            'subfeature',
            path.relative(projectPath, folderPath)
          );
          contexts.push(context);
        }
      }
    }
  } catch (error) {
    logger.warn('Could not scan subfeatures:', error);
  }

  return contexts;
}

/**
 * Scan API folders in src/app/api
 */
async function scanApiFolders(projectPath: string): Promise<StructuralContext[]> {
  const contexts: StructuralContext[] = [];
  const apiPath = path.join(projectPath, 'src', 'app', 'api');

  try {
    const entries = await fs.readdir(apiPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const folderPath = path.join(apiPath, entry.name);
        const files = await getAllFilesInDirectory(folderPath, projectPath);

        // Only create context if there are multiple files (route.ts alone is too small)
        if (files.length >= 2) {
          const contextName = formatApiName(entry.name);
          const context = createContext(
            contextName,
            `API endpoints for ${contextName.toLowerCase()} resource`,
            files,
            'api',
            path.relative(projectPath, folderPath)
          );
          contexts.push(context);
        }
      }
    }
  } catch (error) {
    logger.warn('Could not scan API folders:', error);
  }

  return contexts;
}

/**
 * Scan library folders in src/lib and src/stores
 */
async function scanLibraryFolders(projectPath: string): Promise<StructuralContext[]> {
  const contexts: StructuralContext[] = [];

  // Scan src/lib subdirectories
  try {
    const libPath = path.join(projectPath, 'src', 'lib');
    const entries = await fs.readdir(libPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const folderPath = path.join(libPath, entry.name);
        const files = await getAllFilesInDirectory(folderPath, projectPath);

        if (files.length >= 5) { // Libraries should have at least 5 files to be meaningful
          const contextName = formatLibraryName(entry.name);
          const context = createContext(
            contextName,
            `Shared library providing ${contextName.toLowerCase()} utilities`,
            files,
            'library',
            path.relative(projectPath, folderPath)
          );
          contexts.push(context);
        }
      }
    }
  } catch (error) {
    logger.warn('Could not scan lib folders:', error);
  }

  // Scan src/stores (all stores together as one context)
  try {
    const storesPath = path.join(projectPath, 'src', 'stores');
    const files = await getAllFilesInDirectory(storesPath, projectPath);

    if (files.length >= 3) {
      const context = createContext(
        'State Management',
        'Global state management using Zustand stores',
        files,
        'library',
        path.relative(projectPath, storesPath)
      );
      contexts.push(context);
    }
  } catch (error) {
    logger.warn('Could not scan stores folder:', error);
  }

  return contexts;
}

/**
 * Get all files in a directory recursively (relative paths from project root)
 */
async function getAllFilesInDirectory(
  dirPath: string,
  projectPath: string
): Promise<string[]> {
  const files: string[] = [];

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules and hidden directories
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          const subFiles = await getAllFilesInDirectory(fullPath, projectPath);
          files.push(...subFiles);
        }
      } else if (entry.isFile()) {
        // Only include source code files
        const ext = path.extname(entry.name);
        if (['.ts', '.tsx', '.js', '.jsx', '.py', '.mjs', '.cjs'].includes(ext)) {
          const relativePath = path.relative(projectPath, fullPath).replace(/\\/g, '/');
          files.push(relativePath);
        }
      }
    }
  } catch (error) {
    logger.warn(`Could not read directory ${dirPath}:`, error);
  }

  return files;
}

/**
 * Categorize context size
 */
function categorizeContextSize(fileCount: number): 'small' | 'ideal' | 'large' | 'too-large' {
  if (fileCount < 5) return 'small';
  if (fileCount >= 5 && fileCount <= 20) return 'ideal';
  if (fileCount > 20 && fileCount <= 25) return 'large';
  return 'too-large';
}

/**
 * Format page name from folder name
 * Example: "goals-page" → "Goals Management Page"
 */
function formatPageName(folderName: string): string {
  const baseName = folderName.replace(/-page$/, '');
  const words = baseName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1));
  return words.join(' ') + ' Page';
}

/**
 * Format subfeature name from folder name
 * Example: "sub_auth" → "Authentication Module"
 */
function formatSubfeatureName(folderName: string): string {
  const baseName = folderName.replace(/^sub_/, '');
  const words = baseName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1));
  return words.join(' ') + ' Module';
}

/**
 * Format API name from folder name
 * Example: "goals" → "Goals API"
 */
function formatApiName(folderName: string): string {
  const words = folderName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1));
  return words.join(' ') + ' API';
}

/**
 * Format library name from folder name
 * Example: "database" → "Database Layer"
 */
function formatLibraryName(folderName: string): string {
  const words = folderName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1));
  return words.join(' ') + ' Library';
}

/**
 * Print scan results to console (for debugging/testing)
 */
export function printScanResults(result: StructuralScanResult): void {
  if (!result.success) {
    logger.error('Scan failed:', result.error);
    return;
  }

  logger.info('\n=== Structural Context Scan Results ===\n');
  logger.info(`Total Contexts: ${result.stats!.totalContexts}`);
  logger.info(`Total Files: ${result.stats!.totalFiles}`);
  logger.info('\nContexts by Type:');
  Object.entries(result.stats!.byType).forEach(([type, count]) => {
    logger.info(`  ${type}: ${count}`);
  });
  logger.info('\nSize Distribution:');
  Object.entries(result.stats!.sizeDistribution).forEach(([size, count]) => {
    logger.info(`  ${size}: ${count}`);
  });

  if (result.warnings && result.warnings.length > 0) {
    logger.info('\nWarnings:');
    result.warnings.forEach(w => logger.info(`  ⚠️  ${w}`));
  }

  logger.info('\nDetected Contexts:\n');
  result.contexts!.forEach((ctx, idx) => {
    logger.info(`${idx + 1}. ${ctx.name} (${ctx.fileCount} files)`);
    logger.info(`   Type: ${ctx.source.type}`);
    logger.info(`   Path: ${ctx.source.path}`);
    logger.info(`   Size: ${ctx.sizeCategory}`);
    logger.info('');
  });
}
