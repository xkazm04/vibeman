import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

/**
 * List subdirectories in a given path
 * POST /api/disk/list-directories
 * Body: { path: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path: targetPath } = body;

    if (!targetPath || typeof targetPath !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Path is required',
        },
        { status: 400 }
      );
    }

    // Read directory entries
    let entries;
    try {
      entries = await readdir(targetPath, { withFileTypes: true });
    } catch (error) {
      // Directory doesn't exist or can't be read
      return NextResponse.json({
        success: true,
        directories: [],
      });
    }

    // Filter to only directories
    const directories = [];
    for (const entry of entries) {
      if (entry.isDirectory()) {
        // Skip hidden directories and common non-project directories
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
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list directories',
      },
      { status: 500 }
    );
  }
}
