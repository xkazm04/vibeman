/**
 * Unified Search API
 *
 * POST /api/disk/search
 * Handles file search (glob) and directory listing via the `type` field.
 *
 * Types:
 *   - glob:        { type: 'glob', projectPath, patterns, excludePatterns?, fileTypes?, limit? }
 *   - directories: { type: 'directories', path }
 */

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { readdir } from 'fs/promises';
import { join } from 'path';
import { glob } from 'glob';
import { logger } from '@/lib/logger';
import { withObservability } from '@/lib/observability/middleware';
import { withAccessControl } from '@/lib/api-helpers/accessControl';
import { validateProjectPath, validatePathTraversal } from '@/lib/pathSecurity';
import { handleApiError } from '@/lib/api-errors';

type SearchType = 'glob' | 'directories';

// ── Glob ──

interface MatchedFile {
  path: string;
  relativePath: string;
  size: number;
}

async function handleGlob(body: {
  projectPath: string;
  patterns: string[];
  excludePatterns?: string[];
  fileTypes?: string[];
  limit?: number;
}) {
  const { projectPath, patterns, excludePatterns = [], fileTypes, limit = 100 } = body;

  if (!projectPath) {
    return NextResponse.json({ error: 'Project path is required' }, { status: 400 });
  }

  const pathError = validateProjectPath(projectPath);
  if (pathError) {
    return NextResponse.json({ error: pathError }, { status: 403 });
  }

  if (!patterns || patterns.length === 0) {
    return NextResponse.json({ error: 'At least one pattern is required' }, { status: 400 });
  }

  try {
    await fs.access(projectPath);
  } catch {
    return NextResponse.json({ error: 'Project path does not exist' }, { status: 400 });
  }

  const ignore = ['node_modules/**', '.git/**', '.next/**', 'dist/**', 'build/**', ...excludePatterns];
  const allFiles: MatchedFile[] = [];

  for (const pattern of patterns) {
    try {
      const matches = await glob(pattern, { cwd: projectPath, ignore, nodir: true, absolute: false });

      for (const match of matches) {
        if (allFiles.length >= limit) break;
        if (allFiles.some(f => f.relativePath === match)) continue;

        if (fileTypes && fileTypes.length > 0) {
          const ext = path.extname(match).slice(1);
          if (!fileTypes.includes(ext)) continue;
        }

        const fullPath = path.join(projectPath, match);
        try {
          const stats = await fs.stat(fullPath);
          allFiles.push({
            path: fullPath,
            relativePath: match.replace(/\\/g, '/'),
            size: stats.size,
          });
        } catch {
          continue;
        }
      }
    } catch (error) {
      logger.error(`[Glob API] Error matching pattern "${pattern}":`, { error });
    }
  }

  allFiles.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  return NextResponse.json({
    files: allFiles.slice(0, limit),
    total: allFiles.length,
    limited: allFiles.length >= limit,
  });
}

// ── Directories ──

async function handleDirectories(targetPath: string) {
  if (!targetPath || typeof targetPath !== 'string') {
    return NextResponse.json({ success: false, error: 'Path is required' }, { status: 400 });
  }

  const traversalError = validatePathTraversal(targetPath);
  if (traversalError) {
    return NextResponse.json({ success: false, error: traversalError }, { status: 403 });
  }

  let entries;
  try {
    entries = await readdir(targetPath, { withFileTypes: true });
  } catch {
    return NextResponse.json({ success: true, directories: [] });
  }

  const directories = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!entry.name.startsWith('.') &&
          !['node_modules', 'dist', 'build', '__pycache__', '.next'].includes(entry.name)) {
        directories.push({
          name: entry.name,
          path: join(targetPath, entry.name),
        });
      }
    }
  }

  return NextResponse.json({
    success: true,
    path: targetPath,
    directories: directories.sort((a, b) => a.name.localeCompare(b.name)),
  });
}

// ── Router ──

async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const { type } = body as { type: SearchType };

    if (!type) {
      return NextResponse.json(
        { success: false, error: 'type is required (glob | directories)' },
        { status: 400 }
      );
    }

    switch (type) {
      case 'glob':
        return await handleGlob(body);
      case 'directories':
        return await handleDirectories(body.path);
      default:
        return NextResponse.json(
          { success: false, error: `Unknown type: ${type}. Valid types: glob, directories` },
          { status: 400 }
        );
    }
  } catch (error) {
    return handleApiError(error, 'Disk search operation');
  }
}

export const POST = withObservability(
  withAccessControl(handlePost, '/api/disk/search', { skipProjectCheck: true, minRole: 'viewer' }),
  '/api/disk/search'
);
