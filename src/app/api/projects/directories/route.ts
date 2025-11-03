import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

export async function GET(request: NextRequest) {
  try {
    const currentAppPath = process.cwd();
    const parentPath = join(currentAppPath, '..');

    const entries = await readdir(parentPath);
    const directories = [];

    for (const entry of entries) {
      try {
        const fullPath = join(parentPath, entry);
        const stats = await stat(fullPath);

        if (stats.isDirectory()) {
          // Skip hidden directories and common non-project directories
          if (!entry.startsWith('.') &&
              !['node_modules', 'dist', 'build', '__pycache__'].includes(entry)) {
            directories.push({
              name: entry,
              path: fullPath
            });
          }
        }
      } catch {
        // Skip entries that can't be accessed
      }
    }

    return NextResponse.json({
      success: true,
      currentAppPath,
      parentPath,
      directories: directories.sort((a, b) => a.name.localeCompare(b.name))
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to read directories'
      },
      { status: 500 }
    );
  }
}