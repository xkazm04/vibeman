/**
 * Filepath Selector Processor
 *
 * Filters analyzer scope to specific file directories.
 * Used as a filter before technical analyzers to limit scan scope.
 *
 * Features:
 * - Folder-based filtering with glob patterns
 * - Exclude patterns for node_modules, build artifacts, etc.
 * - File type filtering (ts, tsx, js, jsx, etc.)
 * - Recursive or shallow directory scanning
 * - Integration with FolderSelector UI component
 *
 * @example
 * ```typescript
 * import { FilepathSelectorProcessor } from '@/lib/blueprint';
 *
 * const processor = new FilepathSelectorProcessor();
 * await processor.initialize({
 *   includePaths: ['src/components', 'src/lib'],
 *   excludePaths: ['src/components/__tests__'],
 *   fileTypes: ['ts', 'tsx'],
 *   recursive: true,
 * });
 *
 * // Pass-through mode: just filters paths and forwards issues
 * const filteredIssues = await processor.execute(issues, context);
 *
 * // Pre-scan mode: get list of files that will be scanned
 * const files = await processor.getFilesToScan(context);
 * ```
 */

import { BaseProcessor, ProcessorConfig } from '../base/BaseProcessor';
import { Issue, ExecutionContext, ValidationResult } from '../../types';

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration for the Filepath Selector Processor
 */
export interface FilepathSelectorConfig extends ProcessorConfig {
  /** Folders to include (relative to project root) */
  includePaths?: string[];

  /** Folders to exclude (relative to project root) */
  excludePaths?: string[];

  /** File extensions to include (without dot, e.g., 'ts', 'tsx') */
  fileTypes?: string[];

  /** Glob patterns to include */
  includeGlobs?: string[];

  /** Glob patterns to exclude */
  excludeGlobs?: string[];

  /** Whether to scan directories recursively (default: true) */
  recursive?: boolean;

  /** Maximum directory depth for recursive scanning */
  maxDepth?: number;

  /** Default exclude patterns (node_modules, .next, etc.) */
  useDefaultExcludes?: boolean;
}

/**
 * Folder node for tree representation
 */
export interface FolderNode {
  id: string;
  name: string;
  path: string;
  children?: FolderNode[];
  fileCount?: number;
}

/**
 * Summary of files to scan
 */
export interface FileScanSummary {
  totalFiles: number;
  totalFolders: number;
  byExtension: Record<string, number>;
  topFolders: { path: string; count: number }[];
  estimatedScanTime?: number;
}

/**
 * Default exclude patterns for common build/dependency folders
 */
const DEFAULT_EXCLUDES = [
  'node_modules',
  '.next',
  '.git',
  'dist',
  'build',
  'coverage',
  '.cache',
  '.turbo',
  '__pycache__',
  '.venv',
  'venv',
  '.idea',
  '.vscode',
];

// ============================================================================
// Processor Implementation
// ============================================================================

/**
 * Filepath Selector Processor
 *
 * Filters issues by file path or prepares file list for analyzers.
 */
export class FilepathSelectorProcessor extends BaseProcessor<
  Issue[],
  Issue[],
  FilepathSelectorConfig
> {
  readonly id = 'processor.filepath-selector';
  readonly name = 'Filepath Selector';
  readonly description = 'Filters analyzer scope to specific directories and file types';

  private cachedFiles: string[] | null = null;
  private cachedSummary: FileScanSummary | null = null;

  /**
   * Execute the processor - filters issues by file path
   */
  async execute(input: Issue[], context: ExecutionContext): Promise<Issue[]> {
    this.context = context;

    // Get allowed files
    const allowedFiles = await this.getFilesToScan(context);
    const allowedSet = new Set(allowedFiles.map(f => this.normalizePath(f)));

    // Filter issues to only those in allowed files
    const filtered = input.filter(issue => {
      const normalizedPath = this.normalizePath(issue.file);
      return allowedSet.has(normalizedPath);
    });

    this.log('info', `Filtered ${input.length} issues to ${filtered.length} (${allowedFiles.length} files in scope)`);

    return filtered;
  }

  /**
   * Get list of files that will be scanned based on configuration
   * This can be called before analyzers run to show scope preview
   */
  async getFilesToScan(context: ExecutionContext): Promise<string[]> {
    if (this.cachedFiles) {
      return this.cachedFiles;
    }

    const projectPath = context.projectPath;
    const files: string[] = [];

    try {
      // Build include patterns
      const includePatterns = this.buildIncludePatterns();
      const excludePatterns = this.buildExcludePatterns();

      // Fetch files from API
      const response = await fetch('/api/disk/list-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: projectPath,
          patterns: includePatterns,
          excludePatterns,
          recursive: this.config.recursive ?? true,
          maxDepth: this.config.maxDepth,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.files) {
          files.push(...data.files);
        }
      }
    } catch (error) {
      this.log('warn', `Failed to fetch files: ${error}`);
    }

    this.cachedFiles = files;
    return files;
  }

  /**
   * Get folder tree for UI selection
   */
  async getFolderTree(projectPath: string, maxDepth: number = 5): Promise<FolderNode | null> {
    try {
      const response = await fetch('/api/disk/list-directories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: projectPath }),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      if (!data.success) {
        return null;
      }

      // Build tree recursively
      return this.buildFolderNode(projectPath, projectPath, data.directories, 0, maxDepth);
    } catch (error) {
      this.log('error', `Failed to build folder tree: ${error}`);
      return null;
    }
  }

  /**
   * Build folder node recursively
   */
  private async buildFolderNode(
    path: string,
    rootPath: string,
    children: Array<{ name: string; path: string }>,
    depth: number,
    maxDepth: number
  ): Promise<FolderNode> {
    const name = path === rootPath ? 'Root' : path.split(/[\\/]/).pop() || path;

    const node: FolderNode = {
      id: path,
      name,
      path,
      children: [],
    };

    if (depth < maxDepth && children.length > 0) {
      for (const child of children) {
        // Skip default excludes
        if (this.shouldExcludeFolder(child.name)) {
          continue;
        }

        try {
          const response = await fetch('/api/disk/list-directories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: child.path }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              const childNode = await this.buildFolderNode(
                child.path,
                rootPath,
                data.directories || [],
                depth + 1,
                maxDepth
              );
              node.children!.push(childNode);
            }
          }
        } catch {
          // Skip on error
        }
      }
    }

    return node;
  }

  /**
   * Get scan summary for preview
   */
  async getScanSummary(context: ExecutionContext): Promise<FileScanSummary> {
    if (this.cachedSummary) {
      return this.cachedSummary;
    }

    const files = await this.getFilesToScan(context);

    // Count by extension
    const byExtension: Record<string, number> = {};
    const folderCounts: Record<string, number> = {};

    for (const file of files) {
      // Extension count
      const ext = file.split('.').pop()?.toLowerCase() || 'other';
      byExtension[ext] = (byExtension[ext] || 0) + 1;

      // Folder count
      const parts = file.split(/[\\/]/);
      if (parts.length > 1) {
        const folder = parts.slice(0, -1).join('/');
        folderCounts[folder] = (folderCounts[folder] || 0) + 1;
      }
    }

    // Top folders
    const topFolders = Object.entries(folderCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([path, count]) => ({ path, count }));

    // Estimate scan time (rough: 100ms per file)
    const estimatedScanTime = files.length * 100;

    const summary: FileScanSummary = {
      totalFiles: files.length,
      totalFolders: Object.keys(folderCounts).length,
      byExtension,
      topFolders,
      estimatedScanTime,
    };

    this.cachedSummary = summary;
    return summary;
  }

  /**
   * Clear cached data (call when config changes)
   */
  clearCache(): void {
    this.cachedFiles = null;
    this.cachedSummary = null;
  }

  /**
   * Build include patterns from config
   */
  private buildIncludePatterns(): string[] {
    const patterns: string[] = [];

    // Add folder paths as glob patterns
    if (this.config.includePaths?.length) {
      for (const path of this.config.includePaths) {
        const normalizedPath = path.replace(/\\/g, '/');
        if (this.config.fileTypes?.length) {
          for (const ext of this.config.fileTypes) {
            patterns.push(`${normalizedPath}/**/*.${ext}`);
          }
        } else {
          patterns.push(`${normalizedPath}/**/*`);
        }
      }
    }

    // Add custom globs
    if (this.config.includeGlobs?.length) {
      patterns.push(...this.config.includeGlobs);
    }

    // Default: all supported files if no patterns specified
    if (patterns.length === 0) {
      const defaultTypes = this.config.fileTypes || ['ts', 'tsx', 'js', 'jsx'];
      for (const ext of defaultTypes) {
        patterns.push(`**/*.${ext}`);
      }
    }

    return patterns;
  }

  /**
   * Build exclude patterns from config
   */
  private buildExcludePatterns(): string[] {
    const patterns: string[] = [];

    // Add default excludes
    if (this.config.useDefaultExcludes !== false) {
      for (const exclude of DEFAULT_EXCLUDES) {
        patterns.push(`**/${exclude}/**`);
      }
    }

    // Add custom exclude paths
    if (this.config.excludePaths?.length) {
      for (const path of this.config.excludePaths) {
        const normalizedPath = path.replace(/\\/g, '/');
        patterns.push(`${normalizedPath}/**`);
      }
    }

    // Add custom exclude globs
    if (this.config.excludeGlobs?.length) {
      patterns.push(...this.config.excludeGlobs);
    }

    return patterns;
  }

  /**
   * Check if folder should be excluded
   */
  private shouldExcludeFolder(name: string): boolean {
    if (this.config.useDefaultExcludes === false) {
      return false;
    }
    return DEFAULT_EXCLUDES.includes(name);
  }

  /**
   * Normalize file path for comparison
   */
  private normalizePath(path: string): string {
    return path.replace(/\\/g, '/').toLowerCase();
  }

  /**
   * Validate configuration
   */
  validateConfig(config: FilepathSelectorConfig): ValidationResult {
    const errors: string[] = [];

    if (config.maxDepth !== undefined && config.maxDepth < 1) {
      errors.push('maxDepth must be at least 1');
    }

    if (config.fileTypes?.some(t => t.startsWith('.'))) {
      errors.push('fileTypes should not include leading dots');
    }

    return errors.length > 0
      ? { valid: false, errors }
      : { valid: true };
  }

  /**
   * Get configuration schema
   */
  getConfigSchema(): Record<string, unknown> {
    return {
      type: 'object',
      properties: {
        includePaths: {
          type: 'array',
          items: { type: 'string' },
          description: 'Folders to include (relative to project root)',
          uiComponent: 'FolderSelector',
        },
        excludePaths: {
          type: 'array',
          items: { type: 'string' },
          description: 'Folders to exclude',
        },
        fileTypes: {
          type: 'array',
          items: { type: 'string' },
          default: ['ts', 'tsx', 'js', 'jsx'],
          description: 'File extensions to include',
        },
        includeGlobs: {
          type: 'array',
          items: { type: 'string' },
          description: 'Glob patterns to include',
        },
        excludeGlobs: {
          type: 'array',
          items: { type: 'string' },
          description: 'Glob patterns to exclude',
        },
        recursive: {
          type: 'boolean',
          default: true,
          description: 'Scan directories recursively',
        },
        maxDepth: {
          type: 'number',
          description: 'Maximum directory depth',
        },
        useDefaultExcludes: {
          type: 'boolean',
          default: true,
          description: 'Exclude node_modules, .next, dist, etc.',
        },
      },
    };
  }

  /**
   * Get default configuration
   */
  getDefaultConfig(): FilepathSelectorConfig {
    return {
      fileTypes: ['ts', 'tsx', 'js', 'jsx'],
      recursive: true,
      useDefaultExcludes: true,
    };
  }

  /**
   * Get input types
   */
  getInputTypes(): string[] {
    return ['Issue[]'];
  }

  /**
   * Get output types
   */
  getOutputTypes(): string[] {
    return ['Issue[]'];
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a FilepathSelectorConfig from selected folders
 */
export function createConfigFromFolderSelection(
  selectedFolders: string[],
  options?: {
    fileTypes?: string[];
    excludeFolders?: string[];
    recursive?: boolean;
  }
): FilepathSelectorConfig {
  return {
    includePaths: selectedFolders,
    excludePaths: options?.excludeFolders,
    fileTypes: options?.fileTypes || ['ts', 'tsx', 'js', 'jsx'],
    recursive: options?.recursive ?? true,
    useDefaultExcludes: true,
  };
}

/**
 * Format scan summary for display
 */
export function formatScanSummary(summary: FileScanSummary): string {
  const lines: string[] = [];

  lines.push(`📁 ${summary.totalFiles} files in ${summary.totalFolders} folders`);

  const extensions = Object.entries(summary.byExtension)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([ext, count]) => `.${ext}: ${count}`)
    .join(', ');

  lines.push(`📄 Types: ${extensions}`);

  if (summary.estimatedScanTime) {
    const seconds = Math.ceil(summary.estimatedScanTime / 1000);
    lines.push(`⏱️ Est. time: ${seconds}s`);
  }

  return lines.join('\n');
}
