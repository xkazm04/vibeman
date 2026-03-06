import { NextRequest, NextResponse } from 'next/server';
import { contextDb } from '@/app/db';
import { logger } from '@/lib/logger';

/**
 * POST /api/files/gather
 * 
 * Gather codebase files from a context or project path
 * 
 * Request body:
 * {
 *   projectId: string
 *   projectPath: string
 *   contextId?: string (if provided, uses context file list)
 *   fileExtensions?: string[] (default: common code extensions)
 *   excludePatterns?: string[] (glob patterns to exclude)
 * }
 * 
 * Response:
 * {
 *   success: boolean
 *   files: CodebaseFile[]
 *   totalSize: number
 *   totalFiles: number
 *   error?: string
 * }
 */

interface GatherFilesRequest {
  projectId: string;
  projectPath: string;
  contextId?: string;
  fileExtensions?: string[];
  excludePatterns?: string[];
}

interface CodebaseFile {
  path: string;
  content: string;
  language: string;
  size: number;
}

interface GatherFilesResponse {
  success: boolean;
  files?: CodebaseFile[];
  totalSize?: number;
  totalFiles?: number;
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

function getLanguageFromExtension(path: string): string {
  const ext = path.toLowerCase().slice(path.lastIndexOf('.'));
  return LANGUAGE_MAP[ext] || 'unknown';
}

function validateGatherRequest(body: Partial<GatherFilesRequest>): string | null {
  if (!body.projectId || !body.projectPath) {
    return 'projectId and projectPath are required';
  }
  return null;
}

async function gatherFilesFromContext(
  contextId: string,
  projectId: string
): Promise<CodebaseFile[]> {
  try {
    logger.info('Gathering files from context', { contextId });
    const context = contextDb.getContextById(contextId);

    if (!context) {
      logger.warn('Context not found', { contextId });
      return [];
    }

    let filePaths: string[] = [];
    if (context.file_paths) {
      try {
        filePaths = JSON.parse(context.file_paths);
        if (!Array.isArray(filePaths)) {
          filePaths = [];
        }
      } catch (error) {
        logger.error('Failed to parse context file paths', { error, contextId });
        return [];
      }
    }

    // In a real implementation, this would fetch files from storage
    // For now, we return file references that can be resolved separately
    return filePaths.map(path => ({
      path,
      content: '', // Content would be fetched from storage
      language: getLanguageFromExtension(path),
      size: 0 // Size would be determined from storage
    }));
  } catch (error) {
    logger.error('Error gathering files from context', { error, contextId });
    return [];
  }
}

async function gatherFilesFromPath(
  projectPath: string,
  extensions: string[],
  excludePatterns: string[]
): Promise<CodebaseFile[]> {
  // This would be implemented with actual filesystem traversal
  // For now, return empty array - actual implementation would:
  // 1. Traverse the directory tree
  // 2. Filter by extensions
  // 3. Exclude patterns
  // 4. Read file contents
  // 5. Return CodebaseFile[] objects
  
  logger.info('Gathering files from path', {
    projectPath,
    extensions: extensions.length,
    excludePatterns: excludePatterns.length
  });

  // TODO: Implement actual file gathering
  // This could use:
  // - fs module for Node.js environments
  // - API calls to file service
  // - Database queries for cached file content

  return [];
}

async function handlePost(request: NextRequest): Promise<NextResponse<GatherFilesResponse>> {
  try {
    const body: GatherFilesRequest = await request.json();

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
      contextId,
      fileExtensions = DEFAULT_EXTENSIONS,
      excludePatterns = []
    } = body;

    logger.info('Processing file gather request', {
      projectId,
      contextId,
      extensionCount: fileExtensions.length
    });

    let files: CodebaseFile[] = [];

    // If context is provided, gather from context first
    if (contextId) {
      files = await gatherFilesFromContext(contextId, projectId);
    }

    // Also gather from project path (or use as fallback)
    if (files.length === 0) {
      files = await gatherFilesFromPath(projectPath, fileExtensions, excludePatterns);
    }

    const totalSize = files.reduce((sum, f) => sum + f.size, 0);

    logger.info('File gathering complete', {
      projectId,
      fileCount: files.length,
      totalSize
    });

    return NextResponse.json({
      success: true,
      files,
      totalSize,
      totalFiles: files.length
    });
  } catch (error) {
    logger.error('File gathering failed', { error });
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
