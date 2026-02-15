import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { glob } from 'glob';
import { logger } from '@/lib/logger';
import { withObservability } from '@/lib/observability/middleware';
import { withAccessControl } from '@/lib/api-helpers/accessControl';
import { validateProjectPath } from '@/lib/pathSecurity';

interface MatchedFile {
  path: string;
  relativePath: string;
  size: number;
}

/**
 * POST /api/disk/glob
 *
 * Find files matching glob patterns within a project directory
 */
async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectPath,
      patterns,
      excludePatterns = [],
      fileTypes,
      limit = 100,
    } = body as {
      projectPath: string;
      patterns: string[];
      excludePatterns?: string[];
      fileTypes?: string[];
      limit?: number;
    };

    // Validate required fields
    if (!projectPath) {
      return NextResponse.json(
        { error: 'Project path is required' },
        { status: 400 }
      );
    }

    // Validate project path for traversal attacks
    const pathError = validateProjectPath(projectPath);
    if (pathError) {
      return NextResponse.json(
        { error: pathError },
        { status: 403 }
      );
    }

    if (!patterns || patterns.length === 0) {
      return NextResponse.json(
        { error: 'At least one pattern is required' },
        { status: 400 }
      );
    }

    // Verify project path exists
    try {
      await fs.access(projectPath);
    } catch {
      return NextResponse.json(
        { error: 'Project path does not exist' },
        { status: 400 }
      );
    }

    // Build ignore patterns
    const ignore = [
      'node_modules/**',
      '.git/**',
      '.next/**',
      'dist/**',
      'build/**',
      ...excludePatterns,
    ];

    // Search for files
    const allFiles: MatchedFile[] = [];

    for (const pattern of patterns) {
      try {
        const matches = await glob(pattern, {
          cwd: projectPath,
          ignore,
          nodir: true,
          absolute: false,
        });

        for (const match of matches) {
          // Skip if we've reached limit
          if (allFiles.length >= limit) break;

          // Skip duplicates
          if (allFiles.some(f => f.relativePath === match)) continue;

          // Filter by file type if specified
          if (fileTypes && fileTypes.length > 0) {
            const ext = path.extname(match).slice(1); // Remove the dot
            if (!fileTypes.includes(ext)) continue;
          }

          // Get file stats
          const fullPath = path.join(projectPath, match);
          try {
            const stats = await fs.stat(fullPath);
            allFiles.push({
              path: fullPath,
              relativePath: match.replace(/\\/g, '/'), // Normalize path separators
              size: stats.size,
            });
          } catch {
            // File might have been deleted, skip it
            continue;
          }
        }
      } catch (error) {
        logger.error(`[Glob API] Error matching pattern "${pattern}":`, { error });
        // Continue with other patterns
      }
    }

    // Sort by path for consistent ordering
    allFiles.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

    return NextResponse.json({
      files: allFiles.slice(0, limit),
      total: allFiles.length,
      limited: allFiles.length >= limit,
    });

  } catch (error) {
    logger.error('[Glob API] Error:', { error });
    return NextResponse.json(
      { error: 'Failed to search files' },
      { status: 500 }
    );
  }
}

export const POST = withObservability(withAccessControl(handlePost, '/api/disk/glob', { skipProjectCheck: true, minRole: 'viewer' }), '/api/disk/glob');
