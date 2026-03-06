import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '@/lib/logger';

/**
 * POST /api/files/gather-local
 * 
 * Gather codebase files from local filesystem
 * 
 * Request body:
 * {
 *   projectId: string
 *   projectPath: string
 *   fileExtensions?: string[] (default: common code extensions)
 *   excludePatterns?: string[] (glob patterns to exclude)
 *   maxFileSize?: number (bytes, default: 1MB)
 *   maxFiles?: number (default: 1000)
 * }
 * 
 * Response:
 * {
 *   success: boolean
 *   files: CodebaseFile[]
 *   totalSize: number
 *   totalFiles: number
 *   skipped: { reason: string; count: number }[]
 *   error?: string
 * }
 */

interface GatherLocalFilesRequest {
  projectId: string;
  projectPath: string;
  fileExtensions?: string[];
  excludePatterns?: string[];
  maxFileSize?: number;
  maxFiles?: number;
}

interface CodebaseFile {
  path: string;
  content: string;
  language: string;
  size: number;
}

interface SkippedFile {
  reason: string;
  count: number;
}

interface GatherLocalFilesResponse {
  success: boolean;
  files?: CodebaseFile[];
  totalSize?: number;
  totalFiles?: number;
  skipped?: SkippedFile[];
  error?: string;
}

const DEFAULT_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx',
  '.py', '.java', '.scala', '.kt',
  '.go', '.rs', '.c', '.cpp', '.h',
  '.sql', '.graphql',
  '.json', '.yaml', '.yml', '.toml',
  '.md', '.mdx'
];

const EXCLUDE_DIRS = [
  'node_modules', '.git', '.next', 'dist', 'build',
  '__pycache__', '.venv', 'venv', '.env'
];

const LANGUAGE_MAP: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.py': 'python',
  '.java': 'java',
  '.scala': 'scala',
  '.kt': 'kotlin',
  '.go': 'go',
  '.rs': 'rust',
  '.c': 'c',
  '.cpp': 'cpp',
  '.h': 'c',
  '.sql': 'sql',
  '.graphql': 'graphql',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'toml',
  '.md': 'markdown',
  '.mdx': 'markdown'
};

function getLanguageFromExtension(filePath: string): string {
  const ext = filePath.toLowerCase().slice(filePath.lastIndexOf('.'));
  return LANGUAGE_MAP[ext] || 'unknown';
}

function shouldExclude(dirPath: string): boolean {
  const baseName = path.basename(dirPath);
  return EXCLUDE_DIRS.includes(baseName) || baseName.startsWith('.');
}

function validateGatherRequest(body: Partial<GatherLocalFilesRequest>): string | null {
  if (!body.projectId || !body.projectPath) {
    return 'projectId and projectPath are required';
  }
  
  // Validate projectPath exists and is accessible
  // This check should be done after request validation
  return null;
}

async function walkDirectory(
  dirPath: string,
  extensions: Set<string>,
  excludePatterns: string[],
  maxFileSize: number,
  maxFiles: number
): Promise<{
  files: CodebaseFile[];
  skipped: Map<string, number>;
}> {
  const files: CodebaseFile[] = [];
  const skipped = new Map<string, number>();
  let fileCount = 0;

  async function traverse(currentPath: string): Promise<void> {
    if (fileCount >= maxFiles) return;

    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        if (fileCount >= maxFiles) break;

        const fullPath = path.join(currentPath, entry.name);
        const relativePath = path.relative(dirPath, fullPath);

        if (entry.isDirectory()) {
          if (!shouldExclude(fullPath)) {
            await traverse(fullPath);
          } else {
            const reason = `Excluded directory: ${entry.name}`;
            skipped.set(reason, (skipped.get(reason) || 0) + 1);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          
          if (!extensions.has(ext)) {
            const reason = `Extension not included: ${ext}`;
            skipped.set(reason, (skipped.get(reason) || 0) + 1);
            continue;
          }

          try {
            const stats = await fs.stat(fullPath);
            
            if (stats.size > maxFileSize) {
              const reason = `File too large (>${maxFileSize} bytes)`;
              skipped.set(reason, (skipped.get(reason) || 0) + 1);
              continue;
            }

            const content = await fs.readFile(fullPath, 'utf-8');
            const language = getLanguageFromExtension(entry.name);

            files.push({
              path: relativePath,
              content,
              language,
              size: stats.size
            });

            fileCount++;
          } catch (readError) {
            const reason = `Error reading file`;
            skipped.set(reason, (skipped.get(reason) || 0) + 1);
            logger.warn('Failed to read file', { path: fullPath, error: readError });
          }
        }
      }
    } catch (dirError) {
      logger.warn('Failed to read directory', { path: currentPath, error: dirError });
    }
  }

  await traverse(dirPath);
  return { files, skipped };
}

async function handlePost(request: NextRequest): Promise<NextResponse<GatherLocalFilesResponse>> {
  try {
    const body: GatherLocalFilesRequest = await request.json();

    const validationError = validateGatherRequest(body);
    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 }
      );
    }

    const {
      projectId,
      projectPath,
      fileExtensions = DEFAULT_EXTENSIONS,
      excludePatterns = [],
      maxFileSize = 1024 * 1024, // 1MB default
      maxFiles = 1000
    } = body;

    logger.info('Processing local file gather request', {
      projectId,
      projectPath,
      extensionCount: fileExtensions.length,
      maxFiles
    });

    // Validate project path exists
    try {
      const stats = await fs.stat(projectPath);
      if (!stats.isDirectory()) {
        return NextResponse.json(
          { success: false, error: 'projectPath must be a directory' },
          { status: 400 }
        );
      }
    } catch (statError) {
      return NextResponse.json(
        { success: false, error: `Cannot access projectPath: ${statError}` },
        { status: 400 }
      );
    }

    const extensions = new Set(fileExtensions);
    const { files, skipped } = await walkDirectory(
      projectPath,
      extensions,
      excludePatterns,
      maxFileSize,
      maxFiles
    );

    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const skippedArray = Array.from(skipped.entries()).map(([reason, count]) => ({
      reason,
      count
    }));

    logger.info('Local file gathering complete', {
      projectId,
      fileCount: files.length,
      totalSize,
      skippedCount: skippedArray.length
    });

    return NextResponse.json({
      success: true,
      files,
      totalSize,
      totalFiles: files.length,
      skipped: skippedArray.length > 0 ? skippedArray : undefined
    });
  } catch (error) {
    logger.error('Local file gathering failed', { error });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

export const POST = handlePost;
export const maxDuration = 120; // 2 minutes for file gathering
